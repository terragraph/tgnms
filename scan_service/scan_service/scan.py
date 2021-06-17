#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import logging
import time
from datetime import datetime
from math import cos, fabs, pi, sqrt
from typing import Any, Dict, List, Optional, Set

from sqlalchemy import insert, update
from tglib.clients import APIServiceClient, MySQLClient
from tglib.exceptions import ClientRuntimeError

from .models import (
    ScanFwStatus,
    ScanMode,
    ScanResults,
    ScanSubType,
    ScanTestExecution,
    ScanTestStatus,
    ScanType,
)
from .utils.time import bwgd_to_epoch
from .utils.topology import Topology

# Max distnace (in meters) for two nodes to be considered 'close' to
# each other to run scan
SCAN_MAX_DISTANCE = 350


class ScanTest:
    def __init__(
        self,
        network_name: str,
        type: ScanType,
        mode: ScanMode,
        options: Dict[str, Any],
        tx_wlan_mac: Optional[str] = None,
    ) -> None:
        self.network_name = network_name
        self.type = type
        self.mode = mode
        self.options = options
        self.tx_wlan_mac = tx_wlan_mac
        self.start_delay_s: Optional[float] = None
        self.end_delay_s: Optional[float] = None
        self.start_token: Optional[int] = None
        self.end_token: Optional[int] = None
        self.token_range: Set = set()
        self.token_count: int = 0

    async def start(self, execution_id: int, scan_start_delay_s: int) -> None:
        """Start the scan test.

        Issue "startScan" and "getScanStatus" command to the API service to
        start the scan and get the status of the scan that was started. To calculate
        the time when the scan will start, find the minimum "startBwgdIdx" of all
        tokens and convert to unix epoch time.

        Mark the test as FAILED under the following conditions:
        - "startScan" or "getScanStatus" command failed
        - E2E failed to start the scan
        - "startScan" response did not have "token" or "lastToken" param

        Create ScanResult entries for each token/tx node the scan was started on.
        """
        logging.info(f"Starting {self.type} on {self.network_name}")
        logging.debug(f"scan options: {self.options}")

        async with MySQLClient().lease() as sa_conn:
            try:
                # Fetch latest topology for analysis
                await Topology.update_topologies(self.network_name)

                params = {
                    "scanType": self.type.value,
                    "scanMode": self.mode.value,
                    "startTime": int(time.time()) + scan_start_delay_s,
                    **self.options,
                }
                if self.tx_wlan_mac is not None:
                    params["txNode"] = self.tx_wlan_mac
                    params["rxNodes"] = self.get_rx_wlan_macs(self.tx_wlan_mac)

                start_scan_resp = await APIServiceClient(timeout=5).request(
                    self.network_name, "startScan", params
                )
                if not start_scan_resp["success"]:
                    raise ClientRuntimeError(msg=start_scan_resp["message"])

                self.start_token = start_scan_resp.get("token")
                # Single node IM scan will have only one token
                self.end_token = (
                    start_scan_resp.get("lastToken")
                    if self.tx_wlan_mac is None
                    else self.start_token
                )
                if self.start_token is None or self.end_token is None:
                    raise ClientRuntimeError(
                        msg=(
                            "Unknown token range "
                            f"({self.start_token} - {self.end_token}). "
                            "Cannot create scan result entries."
                        )
                    )

                scan_status_resp = await APIServiceClient(timeout=5).request(
                    self.network_name,
                    "getScanStatus",
                    params={
                        "isConcise": True,
                        "tokenFrom": self.start_token,
                        "tokenTo": self.end_token,
                    },
                )
            except ClientRuntimeError:
                logging.exception(f"Failed to start scan test on {self.network_name}.")
                query = (
                    update(ScanTestExecution)
                    .where(ScanTestExecution.id == execution_id)
                    .values(status=ScanTestStatus.FAILED, end_dt=datetime.utcnow())
                )
                await sa_conn.execute(query)
                await sa_conn.connection.commit()
                return None

            logging.info(f"{start_scan_resp['message']}")
            start_bwgd_idxs = [
                info["startBwgdIdx"] for info in scan_status_resp["scans"].values()
            ]
            self.start_delay_s = bwgd_to_epoch(min(start_bwgd_idxs)) - time.time()
            self.end_delay_s = bwgd_to_epoch(max(start_bwgd_idxs)) - time.time()

            values: List[Dict] = []
            for token in range(self.start_token, self.end_token + 1):
                self.token_range.add(token)
                values.append(
                    {
                        "execution_id": execution_id,
                        "network_name": self.network_name,
                        "type": self.type,
                        "mode": self.mode,
                        "token": token,
                    }
                )
            query = insert(ScanResults).values(values)
            await sa_conn.execute(query)
            await sa_conn.connection.commit()
            self.token_count = len(self.token_range)

    def get_rx_wlan_macs(self, tx_wlan_mac: str) -> List:
        """Find all rx node wlan macs in close proximity of the tx_node."""
        tx_node_location = None
        for site in Topology.topology[self.network_name]["sites"]:
            if (
                Topology.wlan_mac_to_site_name[self.network_name].get(tx_wlan_mac)
                == site["name"]
            ):
                tx_node_location = site["location"]
                break
        if tx_node_location is None:
            return []

        rx_wlan_macs: List = []
        for site in Topology.topology[self.network_name]["sites"]:
            if (
                self.get_approximate_distance(tx_node_location, site["location"])
                < SCAN_MAX_DISTANCE
            ):
                rx_wlan_macs += Topology.site_name_to_wlan_macs[self.network_name].get(
                    site["name"], []
                )
        return rx_wlan_macs

    def get_approximate_distance(self, l1, l2) -> float:
        """Find approximate distance between two sites."""
        # Circumference 40,075.017 km (24,901.461 mi) (equatorial)
        deg = 360
        length_per_degree = 40075017 / deg
        avg_latitude_radian = ((l1["latitude"] + l2["latitude"]) / 2) * (2 * pi / deg)

        # Calculate the distance across latitude change
        d_lat = fabs(l1["latitude"] - l2["latitude"]) * length_per_degree

        # Calculate the distance across longitude change
        # Take care of links across 180 meridian and effect of different latitudes
        d_long = fabs(l1["longitude"] - l2["longitude"])
        if d_long > (deg / 2):
            d_long = deg - d_long
        d_long *= length_per_degree * cos(avg_latitude_radian)

        # Calculate the distance across altitude change
        d_alt = fabs(l1["altitude"] - l2["altitude"])

        # Assume orthogonality over small distance
        return sqrt((d_lat * d_lat) + (d_long * d_long) + (d_alt * d_alt))


def parse_scan_results(scan_result: Dict) -> Dict:
    """Parse scan results.

    If there is no tx response in the scan data responses, we mark the response
    as erroneous.
    """
    scan_data = scan_result["data"]
    tx_node = scan_data["txNode"]
    tx_response = scan_data["responses"].get(tx_node, {})
    tx_status = (
        ScanFwStatus(tx_response["status"])
        if tx_response
        else ScanFwStatus.UNSPECIFIED_ERROR  # type: ignore
    )
    rx_statuses = {
        node: ScanFwStatus(rx_response["status"]).name
        for node, rx_response in scan_data["responses"].items()
        if node != tx_node
    }
    return {
        "group_id": scan_data.get("groupId"),
        "resp_id": scan_data["respId"],
        "subtype": (
            ScanSubType(scan_data["subType"]) if scan_data.get("subType") else None
        ),
        "start_bwgd": scan_data["startBwgdIdx"],
        "tx_node": tx_node,
        "tx_power": tx_response.get("txPwrIndex"),
        "tx_status": tx_status,
        "rx_statuses": rx_statuses,
        "n_responses_waiting": scan_data.get("nResponsesWaiting"),
    }
