#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import asyncio
import logging

from tglib.clients import APIServiceClient, PrometheusClient

from .link_insight import analyze_alignment, compute_link_foliage, fetch_metrics
from .utils.topology import fetch_network_info
from .visibility import NodePowerStatus, create_results, get_power_status


async def find_link_foliage(
    start_time_ms: int,
    number_of_windows: int,
    min_window_size: int,
    minimum_var: float,
    foliage_factor_threshold: float,
    query_interval: int,
    step: int = 1,
) -> None:
    query_window_end_time = int(round(start_time_ms / 1e3))
    query_window_start_time = query_window_end_time - query_interval
    metrics = ["tx_power", "rssi"]
    network_names = APIServiceClient.network_names()
    coros = []
    for network_name in network_names:
        coros.append(
            fetch_metrics(
                network_name,
                metrics,
                query_window_start_time,
                query_window_end_time,
                step,
            )
        )
    network_stats = zip(network_names, await asyncio.gather(*coros))
    compute_link_foliage(
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


async def find_alignment_status(
    start_time_ms: int,
    threshold_misalign_degree: int,
    threshold_tx_rx_degree_diff: int,
    sample_period: int = 300,
    step: int = 30,
) -> None:
    coros = []
    metrics = ["tx_beam_idx", "rx_beam_idx"]
    end_time = int(start_time_ms / 1e3)
    start_time = end_time - sample_period
    network_names = APIServiceClient.network_names()
    for network_name in network_names:
        coros.append(fetch_metrics(network_name, metrics, start_time, end_time, step))

    network_stats = zip(network_names, await asyncio.gather(*coros))
    analyze_alignment(
        network_stats, threshold_misalign_degree, threshold_tx_rx_degree_diff
    )
