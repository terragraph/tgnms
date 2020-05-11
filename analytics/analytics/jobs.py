#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.


import logging

from tglib.clients import PrometheusClient

from .utils.topology import fetch_network_info
from .visibility import NodePowerStatus, create_results, get_power_status


async def gauge_cn_power_status(start_time_ms: int, window_s: int) -> None:
    """This runs the CNs powered status algorithm for all networks.

    It writes results to the timeseries database.
    This function runs periodically.
    - start_time_ms: unix time in ms
    - window_s: span of time over which to evaluate CNs power status in s
    """

    network_info = await fetch_network_info()
    logging.debug(f"fetched network_info at {start_time_ms}")

    node_state_list = await get_power_status(
        query_time_ms=start_time_ms, window_s=window_s, network_info=network_info
    )

    metrics = create_results(
        node_state_write_list=node_state_list, start_time_ms=start_time_ms
    )
    PrometheusClient.write_metrics(scrape_interval="30s", metrics=metrics)
