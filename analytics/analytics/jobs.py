#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import asyncio
import logging

from tglib.clients import APIServiceClient, PrometheusClient

from .link_insight import compute_link_foliage, fetch_foliage_metrics
from .utils.topology import fetch_network_info
from .visibility import NodePowerStatus, create_results, get_power_status


async def find_link_foliage(
    start_time_ms: int,
    number_of_windows: int,
    min_window_size: int,
    minimum_var: float,
    foliage_factor_threshold: float,
    query_interval: int,
) -> None:
    query_window_end_time = int(round(start_time_ms / 1e3))
    query_window_start_time = query_window_end_time - query_interval
    network_names = APIServiceClient.network_names()
    coros = []
    for network_name in network_names:
        coros.append(
            fetch_foliage_metrics(
                network_name, query_window_start_time, query_window_end_time
            )
        )
    network_stats = await asyncio.gather(*coros)
    await compute_link_foliage(
        network_names,
        network_stats,
        number_of_windows,
        min_window_size,
        minimum_var,
        foliage_factor_threshold,
        query_interval,
    )


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
    PrometheusClient.write_metrics(metrics)
