#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import json
import logging
from datetime import datetime
from operator import attrgetter
from typing import Any, Callable, List, Optional

import snappy
from terragraph_thrift.Controller.ttypes import ScanResp
from tglib.clients.mysql_client import MySQLClient
from thrift.protocol.TBinaryProtocol import TBinaryProtocolAcceleratedFactory
from thrift.TSerialization import deserialize

from scan_service.response_rate_stats import ResponseRateStats
from scan_service.scan import Scan, ScanGroup
from scan_service.time_conv import datetime_to_bwgd


SCAN_TIME_DELTA_S = 120
SCAN_TIME_DELTA_BWGD = (SCAN_TIME_DELTA_S * 1000) / 25.6


class ScanDb:
    def __init__(self) -> None:
        # Connect to db
        self.network_ids = {}

    def process_binary(self, scan_resp: Any, out_type: Callable[[], Any]) -> Any:
        if not scan_resp:
            return None
        decomp_scan_resp = snappy.uncompress(scan_resp)
        ret = out_type()
        deserialize(ret, decomp_scan_resp, TBinaryProtocolAcceleratedFactory())
        return ret

    async def get_network_id_from_name(self, network_name: str) -> int:
        if network_name not in self.network_ids:
            async with MySQLClient().lease() as conn:
                query = f'SELECT id FROM topology WHERE name="{network_name}"'
                cursor = await conn.execute(query)
                result = await cursor.fetchone()
                self.network_ids[network_name] = result["id"]
        return self.network_ids[network_name]

    async def get_scans(
        self,
        network_name: Optional[str] = None,
        scan_type: Optional[str] = None,
        from_date: Optional[datetime] = None,
        to_date: Optional[datetime] = None,
        from_bwgd: Optional[int] = None,
        to_bwgd: Optional[int] = None,
        decompress_scan_resp: bool = True,
    ) -> List[Scan]:
        # Query for most recent scan results
        scans = {}
        async with MySQLClient().lease() as conn:
            query = (
                "SELECT tx_scan_results.*, rx_scan_results.rx_node_id,"
                "rx_scan_results.rx_node_name, rx_scan_results.scan_resp AS "
                "rx_scan_resp, rx_scan_results.status AS rx_status "
                "FROM tx_scan_results JOIN rx_scan_results ON "
                "rx_scan_results.tx_id=tx_scan_results.id"
            )
            hasFilter = False
            if network_name is not None:
                query += f' WHERE network="{network_name}"'
                hasFilter = True
            if scan_type is not None:
                query += f' {"AND" if hasFilter else "WHERE"} scan_type={scan_type}'
                hasFilter = True
            if from_date is not None:
                query += f' {"AND" if hasFilter else "WHERE"} tx_scan_results.start_bwgd > {datetime_to_bwgd(from_date)}'
                hasFilter = True
            if to_date is not None:
                query += f' {"AND" if hasFilter else "WHERE"} tx_scan_results.start_bwgd <= {datetime_to_bwgd(to_date)}'
                hasFilter = True
            if from_bwgd is not None:
                query += f' {"AND" if hasFilter else "WHERE"} tx_scan_results.start_bwgd > {from_bwgd}'
                hasFilter = True
            if to_bwgd is not None:
                query += f' {"AND" if hasFilter else "WHERE"} tx_scan_results.start_bwgd <= {to_bwgd}'
                hasFilter = True
            query += " ORDER BY timestamp DESC"
            cursor = await conn.execute(query)
            for result in await cursor.fetchall():
                if decompress_scan_resp:
                    try:
                        result["scan_resp"] = self.process_binary(
                            result["scan_resp"], ScanResp
                        )
                        result["rx_scan_resp"] = self.process_binary(
                            result["rx_scan_resp"], ScanResp
                        )
                    except snappy.UncompressError:
                        result["scan_resp"] = None
                        result["rx_scan_resp"] = None
                if result["token"] not in scans:
                    scans[result["token"]] = Scan(result)
                else:
                    scans[result["token"]].add_rx_response(result)
        return list(scans.values())

    async def get_scan_groups(
        self,
        network_name: Optional[str] = None,
        from_date: Optional[str] = None,
        to_date: Optional[str] = None,
        from_bwgd: Optional[str] = None,
        to_bwgd: Optional[str] = None,
        decompress_scan_resp: bool = True,
    ) -> List[ScanGroup]:
        # get scan results for grouping
        scans = await self.get_scans(
            network_name,
            from_date=from_date,
            to_date=to_date,
            from_bwgd=from_bwgd,
            to_bwgd=to_bwgd,
            decompress_scan_resp=decompress_scan_resp,
        )

        # sort scans into groups
        scan_groups = []
        cur_group_scans = []
        cur_group_id = None
        for scan in sorted(scans, key=attrgetter("timestamp")):
            if not cur_group_scans:
                cur_group_scans.append(scan)
                cur_group_id = scan.group_id
            elif (
                cur_group_id == scan.group_id
                and scan.start_bwgd
                < cur_group_scans[-1].start_bwgd + SCAN_TIME_DELTA_BWGD
            ):
                cur_group_scans.append(scan)
            else:
                scan_groups.append(ScanGroup(cur_group_scans))
                cur_group_scans.clear()
                cur_group_scans.append(scan)
                cur_group_id = scan.group_id

        return scan_groups

    async def write_scan_response_rate_stats(
        self, response_stats_list: List[ResponseRateStats]
    ) -> None:
        query_format = (
            "INSERT INTO scan_response_rate "
            "(scan_group_id, network_id, scan_type, scan_mode, scan_sub_type, "
            "n_scans, n_valid_scans, n_invalid_scans, n_incomplete_scans, "
            "start_bwgd, end_bwgd, total_tx_resp, invalid_tx_resp, tx_errors, "
            "total_rx_resp, invalid_rx_resp, rx_errors) VALUES "
            "(%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"
        )
        query_params = []
        for response_stats in response_stats_list:
            network_id = await self.get_network_id_from_name(
                response_stats.network_name
            )
            if network_id is None:
                logging.error(
                    f"Error fetching netork id for network {response_stats.network_name}"
                )
                continue
            query_params.append(
                (
                    response_stats.group_id,  # scan_group_id
                    network_id,  # network_id
                    response_stats.scan_type,  # scan_type
                    response_stats.scan_mode,  # scan_mode
                    response_stats.scan_sub_type,  # scan_sub_type
                    response_stats.n_scans,  # n_scans
                    response_stats.n_valid_scans,  # n_valid_scans
                    response_stats.n_invalid_scans,  # n_invalid_scans
                    response_stats.n_incomplete_scans,  # n_incomplete_scans
                    response_stats.group_start_bwgd,  # start_bwgd
                    response_stats.group_end_bwgd,  # end_bwgd
                    response_stats.tx_stats["total"],  # total_tx_resp
                    response_stats.tx_stats["invalid"],  # invalid_tx_resp
                    json.dumps(response_stats.tx_stats["errors"]),  # tx_errors
                    response_stats.rx_stats["total"],  # total_rx_resp
                    response_stats.rx_stats["invalid"],  # invalid_rx_resp
                    json.dumps(response_stats.rx_stats["errors"]),  # rx_errors
                )
            )
        async with MySQLClient().lease() as conn:
            for query_param in query_params:
                await conn.execute(query_format, query_param)
            await conn.connection.commit()

    async def get_latest_response_rate_bwgd(self) -> int:
        query = "SELECT end_bwgd FROM scan_response_rate ORDER BY end_bwgd DESC LIMIT 1"
        async with MySQLClient().lease() as conn:
            cursor = await conn.execute(query)
            result = await cursor.fetchone()
            if not result:
                return None
            return result["end_bwgd"]
