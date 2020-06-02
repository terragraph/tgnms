#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import logging
from typing import Any, Dict

from sqlalchemy import select, update
from tglib.clients import MySQLClient

from .models import NetworkTestResult, NetworkTestStatus
from .scheduler import Scheduler
from .stats import (
    compute_iperf_stats,
    compute_link_health,
    compute_node_health,
    fetch_link_stats,
    parse_msg,
)
from .suites import LinkTest, NodeTest


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
            values.update(compute_iperf_stats(parsed))
            if not parsed.is_server:
                values["iperf_client_blob"] = msg
            else:
                values["iperf_server_blob"] = msg
                if isinstance(test, NodeTest):
                    values["health"] = compute_node_health(
                        expected_bitrate=test.iperf_options["bitrate"],
                        iperf_avg_throughput=values["iperf_avg_throughput"],
                    )
                elif isinstance(test, LinkTest):
                    get_results_query = select(
                        [NetworkTestResult.start_dt, NetworkTestResult.asset_name]
                    ).where(
                        (NetworkTestResult.execution_id == execution_id)
                        & (NetworkTestResult.src_node_mac == parsed.src_node_id)
                        & (NetworkTestResult.dst_node_mac == parsed.dst_node_id)
                    )

                    cursor = await sa_conn.execute(get_results_query)
                    row = await cursor.first()
                    link_stats_output = await fetch_link_stats(
                        start_dt=row.start_dt,
                        session_duration=test.iperf_options["timeSec"],
                        network_name=test.network_name,
                        link_name=row.asset_name,
                        src_node_mac=parsed.src_node_id,
                        dst_node_mac=parsed.dst_node_id,
                    )

                    if link_stats_output is not None:
                        firmware_stats, health_stats = link_stats_output
                        values.update(firmware_stats)
                        values["health"] = compute_link_health(
                            session_duration=test.iperf_options["timeSec"],
                            expected_bitrate=test.iperf_options["bitrate"],
                            iperf_avg_throughput=values["iperf_avg_throughput"],
                            **health_stats,
                        )

        update_results_query = (
            update(NetworkTestResult)
            .where(
                (NetworkTestResult.execution_id == execution_id)
                & (NetworkTestResult.src_node_mac == parsed.src_node_id)
                & (NetworkTestResult.dst_node_mac == parsed.dst_node_id)
            )
            .values(**values)
        )

        await sa_conn.execute(update_results_query)
        await sa_conn.connection.commit()
