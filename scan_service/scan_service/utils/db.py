#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

from datetime import datetime
from typing import Any, Dict, List, Optional

from sqlalchemy import insert, join, select
from tglib.clients import MySQLClient

from ..models import (
    ConnectivityResults,
    InterferenceResults,
    RxScanResponse,
    ScanResponseRate,
    ScanResults,
    ScanType,
    TxScanResponse,
)
from ..scan import Scan, ScanGroup
from .time import SCAN_TIME_DELTA_BWGD, datetime_to_bwgd


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


async def write_results(
    scan_results: Dict[str, Any],
    connectivity_results: Optional[List[Dict]],
    interference_results: Optional[List[Dict]],
) -> None:
    """Write scan results, connectivity and interference results to database"""
    async with MySQLClient().lease() as conn:
        await conn.execute(insert(ScanResults).values(scan_results))
        if connectivity_results:
            await conn.execute(insert(ConnectivityResults).values(connectivity_results))
        if interference_results:
            await conn.execute(insert(InterferenceResults).values(interference_results))
        await conn.connection.commit()
