#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import json
import logging
from datetime import datetime
from typing import Dict, Iterable, List, Optional
from uuid import uuid4

from sqlalchemy import insert, join, select
from tglib.clients import MySQLClient

from ..models import (
    RxScanResponse,
    ScanFwStatus,
    ScanMode,
    ScanResponseRate,
    ScanSubType,
    ScanType,
    TxScanResponse,
)
from ..scan import Scan, ScanGroup
from .time import SCAN_TIME_DELTA_BWGD, datetime_to_bwgd


def write_raw_data(scan_data_dir: str, data: Dict) -> Optional[str]:
    """Write raw scan data to file in scan data directory and return name of file"""
    try:
        fname = str(uuid4()) + ".json"
        with open(scan_data_dir + fname, "w+") as f:
            json.dump(data, f)
        return fname
    except OSError:
        logging.exception("Unable to write scan data")
        return None
    except TypeError:
        logging.exception("Unable to encode scan data to JSON")
        return None


async def write_scan_data(
    scan_data_dir: str, network_name: str, scan_result: Dict
) -> None:
    """Write scan data to database and save raw data to disk"""
    try:
        token = scan_result["token"]
        scan_data = scan_result["data"]
    except KeyError:
        logging.exception("Invalid scan result")
        return

    if scan_data["respId"] == 0:
        logging.error(f"Invalid scan response id from {network_name}, skipping")
        return
    if not scan_data["responses"]:
        logging.info(
            f"Received scan result with empty response list from {network_name}"
        )

    # scan_data contains some metadata about the scan as well as a list of responses
    # from rx nodes and the tx node involved in the scan, we will save the metadata
    # and the tx response data in a row in the TxScanResponse table and save each
    # rx response in the RxScanResponse table, with a foreign key to the TxScanResponse
    # entry that it is associated with
    has_tx_response = False
    rx_responses = []

    # Populate tx response with data available from scan_data
    tx_response = {
        "network_name": network_name,
        "scan_group_id": scan_data["groupId"],
        "tx_node_name": scan_data["txNode"],
        "token": token,
        "resp_id": scan_data["respId"],
        "start_bwgd": scan_data["startBwgdIdx"],
        "scan_type": ScanType(scan_data["type"]),
        "scan_sub_type": (
            ScanSubType(scan_data["subType"]) if "subType" in scan_data else None
        ),
        "scan_mode": ScanMode(scan_data["mode"]),
        "apply": scan_data.get("apply", None),
        "n_responses_waiting": scan_data.get("nResponsesWaiting", None),
    }

    # Create rx response entries and finish populating tx response by iterating through
    # scan_data's node responses
    for node_name, response in scan_data["responses"].items():
        # Save scan data from tx node responses seperately than data from rx node
        # responses
        if node_name == tx_response["tx_node_name"]:
            has_tx_response = True
            tx_response.update(
                {
                    "scan_resp_path": write_raw_data(scan_data_dir, response),
                    "status": ScanFwStatus(response["status"]),
                    "tx_power": response.get("txPwrIndex", None),
                }
            )
        else:
            rx_response = {
                "scan_resp_path": write_raw_data(scan_data_dir, response),
                "rx_node_name": node_name,
                "status": ScanFwStatus(response["status"]),
            }
            rx_responses.append(rx_response)

    # If there is no tx response in the scan data, we mark the response as erroneous.
    # We can identify unreturned tx scan responses because they will have a status of
    # UNSPECIFIED_ERROR and a null response data path.
    if not has_tx_response:
        tx_response["scan_resp_path"] = None
        tx_response["status"] = ScanFwStatus.UNSPECIFIED_ERROR  # type: ignore

    # Write new scan data into db
    async with MySQLClient().lease() as conn:
        # Insert tx response
        tx_response_query = insert(TxScanResponse).values(tx_response)
        tx_response_row = await conn.execute(tx_response_query)

        # Add foreign key relationship and insert rx responses
        for rx_response in rx_responses:
            rx_response["tx_scan_id"] = tx_response_row.lastrowid

        await conn.execute(insert(RxScanResponse).values(rx_responses))
        await conn.connection.commit()


async def get_scans(
    network_name: Optional[str] = None,
    group_id: Optional[int] = None,
    from_date: Optional[datetime] = None,
    to_date: Optional[datetime] = None,
    from_bwgd: Optional[int] = None,
    to_bwgd: Optional[int] = None,
    scan_type: Optional[ScanType] = None,
) -> List[Scan]:
    """Query for scan results"""
    scan_indexes: Dict[int, int] = {}
    scans: List[Scan] = []
    async with MySQLClient().lease() as conn:
        query = (
            select(
                [
                    TxScanResponse,
                    RxScanResponse.rx_node_name,
                    RxScanResponse.scan_resp_path.label("rx_scan_resp_path"),
                    RxScanResponse.status.label("rx_status"),
                ]
            )
            .select_from(
                join(
                    TxScanResponse,
                    RxScanResponse,
                    RxScanResponse.tx_scan_id.like(TxScanResponse.id),
                )
            )
            .order_by(TxScanResponse.id.asc())
        )

        if network_name is not None:
            query = query.where(TxScanResponse.network_name == network_name)
        if scan_type is not None:
            query = query.where(TxScanResponse.scan_type == scan_type)
        if from_date is not None:
            query = query.where(TxScanResponse.start_bwgd > datetime_to_bwgd(from_date))
        if to_date is not None:
            query = query.where(TxScanResponse.start_bwgd <= datetime_to_bwgd(to_date))
        if from_bwgd is not None:
            query = query.where(TxScanResponse.start_bwgd > from_bwgd)
        if to_bwgd is not None:
            query = query.where(TxScanResponse.start_bwgd > to_bwgd)
        if group_id is not None:
            query = query.where(TxScanResponse.scan_group_id == group_id)
        cursor = await conn.execute(query)

        for result in await cursor.fetchall():
            if result.token not in scan_indexes:
                scan_indexes[result.token] = len(scans)
                scans.append(Scan(result))
            scans[scan_indexes[result.token]].add_rx_response(result)

        return scans


async def get_scan_groups(
    network_name: Optional[str] = None,
    group_id: Optional[int] = None,
    from_date: Optional[datetime] = None,
    to_date: Optional[datetime] = None,
    from_bwgd: Optional[int] = None,
    to_bwgd: Optional[int] = None,
) -> List[ScanGroup]:
    """Get scan results and organize into scan groups"""
    scans = await get_scans(
        network_name, group_id, from_date, to_date, from_bwgd, to_bwgd
    )

    # Sort scans into groups
    scans.sort(key=lambda s: s.timestamp)
    scan_groups: List[ScanGroup] = []
    cur_group_scans: List[Scan] = [scans[0]]
    cur_group_id = scans[0].group_id
    for scan in scans:
        if (
            cur_group_id == scan.group_id
            and scan.start_bwgd < cur_group_scans[-1].start_bwgd + SCAN_TIME_DELTA_BWGD
        ):
            cur_group_scans.append(scan)
        else:
            scan_groups.append(ScanGroup(cur_group_scans))
            cur_group_scans = [scan]
            cur_group_id = scan.group_id

    scan_groups.append(ScanGroup(cur_group_scans))
    return scan_groups


async def write_scan_response_rate_stats(response_stats_list: List[Dict]) -> None:
    """Write scan response rate stats to database"""
    async with MySQLClient().lease() as conn:
        await conn.execute(insert(ScanResponseRate).values(response_stats_list))
        await conn.connection.commit()
