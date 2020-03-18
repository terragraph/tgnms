#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import logging
from typing import Any, Dict

from sqlalchemy import update
from tglib.clients import MySQLClient

from .models import NetworkTestResult, NetworkTestStatus
from .scheduler import Scheduler
from .stats import compute_iperf_stats, parse_msg


async def process_msg(msg: str) -> None:
    """Process the kafka message and extract relevant network test stats."""
    parsed = parse_msg(msg)
    if parsed is None:
        return

    execution_id = Scheduler.get_execution_id(parsed.session_id)
    if execution_id is None:
        logging.warning(f"Session ID '{parsed.session_id}' has no matching execution")
        return

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
