#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import logging
from typing import Any, Dict

from sqlalchemy import select, update
from tglib.clients import MySQLClient

from .models import NetworkTestResult, NetworkTestStatus
from .scheduler import Scheduler
from .stats import compute_firmware_stats, compute_iperf_stats, parse_msg
from .suites import Multihop


async def process_msg(msg: str) -> None:
    """Process the kafka message and extract relevant network test stats."""
    parsed = parse_msg(msg)
    if parsed is None:
        return

    get_execution_output = Scheduler.get_execution(parsed.session_id)
    if get_execution_output is None:
        logging.warning(f"Session ID '{parsed.session_id}' has no matching execution")
        return

    execution_id, test = get_execution_output
    values: Dict[str, Any] = {}
    async with MySQLClient().lease() as sa_conn:
        if "error" in parsed.output or not parsed.output["intervals"]:
            values["status"] = NetworkTestStatus.FAILED
        else:
            values["status"] = NetworkTestStatus.FINISHED
            if parsed.is_server:
                values["iperf_server_blob"] = msg
            else:
                values["iperf_client_blob"] = msg

            values.update(compute_iperf_stats(parsed))
            if not isinstance(test, Multihop):
                get_results_query = select(
                    [NetworkTestResult.start_dt, NetworkTestResult.asset_name]
                ).where(
                    (NetworkTestResult.execution_id == execution_id)
                    & (NetworkTestResult.src_node_mac == parsed.src_node_id)
                    & (NetworkTestResult.dst_node_mac == parsed.dst_node_id)
                )

                cursor = await sa_conn.execute(get_results_query)
                row = await cursor.first()
                values.update(
                    await compute_firmware_stats(
                        start_dt=row.start_dt,
                        session_duration=test.iperf_options["timeSec"],
                        network_name=test.network_name,
                        link_name=row.asset_name,
                        src_node_mac=parsed.src_node_id,
                        dst_node_mac=parsed.dst_node_id,
                    )
                )

        query = (
            update(NetworkTestResult)
            .where(
                (NetworkTestResult.execution_id == execution_id)
                & (NetworkTestResult.src_node_mac == parsed.src_node_id)
                & (NetworkTestResult.dst_node_mac == parsed.dst_node_id)
            )
            .values(**values)
        )

        await sa_conn.execute(query)
        await sa_conn.connection.commit()
