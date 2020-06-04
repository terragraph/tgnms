#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import logging
import time
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


class ScanTest:
    def __init__(
        self, network_name: str, type: ScanType, mode: ScanMode, options: Dict[str, Any]
    ) -> None:
        self.network_name = network_name
        self.type = type
        self.mode = mode
        self.options = options
        self.start_delay_s: Optional[float] = None
        self.start_token: Optional[int] = None
        self.end_token: Optional[int] = None
        self.token_range: Set = set()

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
                start_scan_resp = await APIServiceClient(timeout=1).request(
                    self.network_name,
                    "startScan",
                    params={
                        "scanType": self.type.value,
                        "scanMode": self.mode.value,
                        "startTime": int(time.time()) + scan_start_delay_s,
                        **self.options,
                    },
                )
                if not start_scan_resp["success"]:
                    raise ClientRuntimeError(msg=start_scan_resp["message"])
                if (
                    start_scan_resp.get("token") is None
                    or start_scan_resp.get("lastToken") is None
                ):
                    raise ClientRuntimeError(
                        msg="Unknown token range. Cannot create scan result entries."
                    )

                scan_status_resp = await APIServiceClient(timeout=1).request(
                    self.network_name,
                    "getScanStatus",
                    params={
                        "isConcise": True,
                        "tokenFrom": start_scan_resp["token"],
                        "tokenTo": start_scan_resp["lastToken"],
                    },
                )
            except ClientRuntimeError:
                logging.exception(f"Failed to start scan test on {self.network_name}.")
                query = (
                    update(ScanTestExecution)
                    .where(ScanTestExecution.id == execution_id)
                    .values(status=ScanTestStatus.FAILED)
                )
                await sa_conn.execute(query)
                await sa_conn.connection.commit()
                return None

            logging.info(f"{start_scan_resp['message']}")
            start_bwgd_idx = min(
                info["startBwgdIdx"] for info in scan_status_resp["scans"].values()
            )
            self.start_delay_s = bwgd_to_epoch(start_bwgd_idx) - time.time()
            self.start_token = start_scan_resp["token"]
            self.end_token = start_scan_resp["lastToken"]

            values: List[Dict] = []
            for token in range(self.start_token, self.end_token + 1):  # type: ignore
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
        node: rx_response["status"]
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
