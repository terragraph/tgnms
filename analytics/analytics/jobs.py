#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import asyncio
import json
import logging
from os import environ
from typing import Dict, Optional, List

import aiohttp
from tglib.clients import APIServiceClient
from tglib.clients.prometheus_client import consts, PrometheusClient, PrometheusMetric
from tglib.exceptions import ClientRuntimeError

from .link_insight import (
    analyze_alignment,
    compute_link_foliage,
    fetch_metrics_from_queries,
    analyze_ewi,
)
from .utils.topology import fetch_network_info
from .visibility import create_results, get_power_status


async def find_link_foliage(
    start_time_ms: int,
    number_of_windows: int,
    min_window_size: int,
    minimum_var: float,
    query_interval: int,
    step: int = 1,
) -> None:
    coros = []
    metrics = ["tx_power", "rssi"]
    client = PrometheusClient(timeout=2)
    query_window_end_time = int(round(start_time_ms / 1e3))
    query_window_start_time = query_window_end_time - query_interval

    network_names = APIServiceClient.network_names()
    for network_name in network_names:
        labels = {
            consts.network: network_name,
            consts.data_interval_s: "30",
        }
        queries = [client.format_query(metric, labels) for metric in metrics]
        coros.append(
            fetch_metrics_from_queries(
                client,
                network_name,
                queries,
                query_window_start_time,
                query_window_end_time,
                step,
            )
        )
    network_stats = zip(network_names, await asyncio.gather(*coros))
    compute_link_foliage(
        network_stats, number_of_windows, min_window_size, minimum_var, query_interval
    )


async def find_alignment_status(
    start_time_ms: int,
    threshold_misalign_degree: int,
    threshold_tx_rx_degree_diff: int,
    sample_period: int = 300,
    step: int = 30,
) -> None:
    coros = []
    metrics = ["tx_beam_idx", "rx_beam_idx"]
    client = PrometheusClient(timeout=2)
    end_time = int(start_time_ms / 1e3)
    start_time = end_time - sample_period

    network_names = APIServiceClient.network_names()
    for network_name in network_names:
        labels = {
            consts.network: network_name,
            consts.data_interval_s: "30",
        }
        queries = [client.format_query(metric, labels) for metric in metrics]
        coros.append(
            fetch_metrics_from_queries(
                client, network_name, queries, start_time, end_time, step
            )
        )

    network_stats = zip(network_names, await asyncio.gather(*coros))
    analyze_alignment(
        network_stats, threshold_misalign_degree, threshold_tx_rx_degree_diff
    )


async def estimate_early_weak_interference(
    start_time_ms: int,
    window_s: int,
    windows_count: int,
    tx_per_threshold_percent: int,
    rx_per_threshold_percent: int,
    ewi_count_threshold_percent: int,
) -> None:
    coros = []
    client = PrometheusClient(timeout=2)
    end_time = int(start_time_ms / 1e3)
    start_time = end_time - window_s * windows_count

    network_names = APIServiceClient.network_names()
    network_dir_map: List = []
    for network_name in network_names:
        for direction in [("A", "Z"), ("Z", "A")]:
            labels = {
                consts.network: network_name,
                consts.data_interval_s: "30",
                consts.link_direction: direction[0],
            }
            query_base_tx = client.format_query("per", labels=labels)
            labels = {
                consts.network: network_name,
                consts.data_interval_s: "30",
                consts.link_direction: direction[1],
            }
            query_base_rx = client.format_query("rxper", labels=labels)
            query_tx_per = f"((quantile_over_time(0.5, {query_base_tx}[{window_s}s])/1e6 * 100) > bool {tx_per_threshold_percent})"
            query_rx_per = f"((quantile_over_time(0.5, {query_base_rx}[{window_s}s])/1e6 * 100) < bool {rx_per_threshold_percent})"
            # this will detect Z node getting EWI if tx_direction is A,
            # and A node getting EWI if tx_direction is Z
            # but the link direction getting EWI is the same as tx_direction
            queries = [f"{query_tx_per} * on (linkName) {query_rx_per}"]
            logging.info(
                f"Query for EWI estimates in link direction {direction[0]}: {queries}"
            )
            coros.append(
                fetch_metrics_from_queries(
                    client, network_name, queries, start_time, end_time, window_s
                )
            )
            network_dir_map.append((network_name, direction[0]))
    network_stats = zip(network_dir_map, await asyncio.gather(*coros))
    analyze_ewi(network_stats, int(ewi_count_threshold_percent * windows_count / 100))


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


async def estimate_current_interference(
    start_time_ms: int, n_day: int, use_real_links: bool
) -> None:
    async def get_interference_results(
        network_name: str,
        n_day: int,
        use_real_links: bool,
        session: aiohttp.ClientSession,
    ) -> Optional[Dict]:
        try:
            url = (
                f"{environ.get('SCAN_SERVICE_URL', 'http://scan_service:8080')}"
                "/n_day_analysis"
            )
            params = {
                "network_name": network_name,
                "n_day": n_day,
                "use_real_links": int(use_real_links),
            }
            async with session.get(url, params=params) as resp:
                if resp.status == 200:
                    results: Dict = json.loads(await resp.read())
                    return results
                logging.error(f"Request to {url} failed: {resp.reason} ({resp.status})")
        except (aiohttp.ClientError, asyncio.TimeoutError) as err:
            logging.error(f"Request to {url} for {network_name} failed: {err}")
        return None

    metrics = []
    network_names = APIServiceClient.network_names()
    async with aiohttp.ClientSession() as session:
        coros = [
            get_interference_results(network_name, n_day, use_real_links, session)
            for network_name in network_names
        ]
        scan_results = zip(
            network_names, await asyncio.gather(*coros, return_exceptions=True)
        )
    for network_name, results in scan_results:
        if (
            isinstance(results, ClientRuntimeError)
            or results is None
            or not results["aggregated_inr"]
        ):
            continue

        for link_name, intrf_links in results["aggregated_inr"]["n_day_avg"].items():
            for link in intrf_links:
                labels = {
                    consts.network: network_name,
                    consts.link_name: link_name,
                    "rx_node": link["rx_node"],
                    "rx_from_node": link["rx_from_node"],
                }
                metrics.append(
                    PrometheusMetric(
                        name="analytics_scan_interference",
                        time=start_time_ms,
                        value=link["inr_curr_power"],
                        labels=labels,
                    )
                )
    PrometheusClient.write_metrics(metrics)
