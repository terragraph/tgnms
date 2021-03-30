#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import asyncio
import json
import logging
import math
from os import environ
from datetime import datetime
from typing import Any, Dict

import aiohttp
from tglib.clients.prometheus_client import PrometheusClient, consts, ops
from tglib.exceptions import ClientRuntimeError

from ..models import NodeAlignmentStatus, NodePowerStatus, Health
from .metrics import Metrics


def get_link_queries(network_name: str, interval_s: int) -> Dict[str, str]:
    """Create PromQL queries for link metrics."""
    queries = {}
    labels: Dict[str, Any] = {consts.network: network_name}

    # Create query for analytics_alignment_status
    base_query = PrometheusClient.format_query("analytics_alignment_status", labels)
    hold_time = min(
        Metrics.prometheus_hold_time, Metrics.analytics_alignment_status.period_s
    )
    queries["analytics_alignment_status"] = ops.sum_over_time(
        ops.min_by(
            f"{base_query} == bool {NodeAlignmentStatus.TX_RX_HEALTHY.value}",
            consts.link_name,
        ),
        f"{interval_s - 1}s:{hold_time}s",
    )

    # Create query for topology_link_is_online
    base_query = PrometheusClient.format_query("topology_link_is_online", labels)
    hold_time = min(
        Metrics.prometheus_hold_time, Metrics.topology_link_is_online.period_s
    )
    queries["topology_link_is_online"] = ops.sum_over_time(
        ops.min_by(base_query, consts.link_name), f"{interval_s - 1}s:{hold_time}s"
    )

    # Create query for tx_byte
    base_query = PrometheusClient.format_query("tx_byte", labels)
    queries["tx_byte"] = ops.quantile_over_time(
        ops.sum_by(base_query, consts.link_name),
        f"{interval_s - 1}s:{Metrics.tx_byte.period_s}s",
        0.75,
    )

    # Create query for analytics_foliage_factor
    base_query = PrometheusClient.format_query("analytics_foliage_factor", labels)
    hold_time = min(
        Metrics.prometheus_hold_time, Metrics.analytics_foliage_factor.period_s
    )
    queries["analytics_foliage_factor"] = ops.quantile_over_time(
        ops.abs(base_query), f"{interval_s - 1}s:{hold_time}s", 0.75
    )

    # Create query for drs_cn_egress_routes_count
    base_query = PrometheusClient.format_query("drs_cn_egress_routes_count", labels)
    hold_time = min(
        Metrics.prometheus_hold_time, Metrics.drs_cn_egress_routes_count.period_s
    )
    queries["drs_cn_egress_routes_count"] = ops.quantile_over_time(
        ops.max_by(base_query, consts.link_name),
        f"{interval_s - 1}s:{hold_time}s",
        0.75,
    )

    # Create query for tx_ok
    base_query = PrometheusClient.format_query(
        "tx_ok", {**labels, consts.data_interval_s: Metrics.tx_ok.period_s}
    )
    queries["tx_ok"] = ops.quantile_over_time(
        ops.sum_by(base_query, consts.link_name),
        f"{interval_s - 1}s:{Metrics.tx_ok.period_s}s",
        0.75,
    )

    # Create query for link_avail
    base_query = PrometheusClient.format_query(
        "link_avail", {**labels, consts.data_interval_s: Metrics.mcs.period_s}
    )
    queries["link_avail"] = ops.max_by(
        ops.resets(base_query, f"{interval_s}s"), consts.link_name
    )

    # Create query for mcs
    base_query = PrometheusClient.format_query(
        "mcs", {**labels, consts.data_interval_s: Metrics.mcs.period_s}
    )
    queries["mcs"] = ops.quantile_over_time(
        ops.min_by(base_query, consts.link_name),
        f"{interval_s - 1}s:{Metrics.mcs.period_s}s",
        0.25,
    )

    # Create query for mcs_diff
    query_A = PrometheusClient.format_query(
        "mcs",
        {
            **labels,
            consts.data_interval_s: Metrics.mcs_diff.period_s,
            consts.link_direction: "A",
        },
    )
    query_Z = PrometheusClient.format_query(
        "mcs",
        {
            **labels,
            consts.data_interval_s: Metrics.mcs_diff.period_s,
            consts.link_direction: "Z",
        },
    )
    queries["mcs_diff"] = ops.quantile_over_time(
        ops.abs(ops.diff_on(query_A, query_Z, consts.link_name)),
        f"{interval_s - 1}s:{Metrics.mcs_diff.period_s}s",
        0.75,
    )

    # Create query for tx_power_diff
    query_A = PrometheusClient.format_query(
        "tx_power",
        {
            **labels,
            consts.data_interval_s: Metrics.tx_power_diff.period_s,
            consts.link_direction: "A",
        },
    )
    query_Z = PrometheusClient.format_query(
        "tx_power",
        {
            **labels,
            consts.data_interval_s: Metrics.tx_power_diff.period_s,
            consts.link_direction: "Z",
        },
    )
    queries["tx_power_diff"] = ops.quantile_over_time(
        ops.abs(ops.diff_on(query_A, query_Z, consts.link_name)),
        f"{interval_s - 1}s:{Metrics.tx_power_diff.period_s}s",
        0.75,
    )

    return queries


def get_node_queries(network_name: str, interval_s: int) -> Dict[str, str]:
    """Create PromQL queries for node metrics."""
    queries = {}
    labels: Dict[str, Any] = {consts.network: network_name}

    # Create query for analytics_cn_power_status
    base_query = PrometheusClient.format_query("analytics_cn_power_status", labels)
    hold_time = min(
        Metrics.prometheus_hold_time, Metrics.analytics_cn_power_status.period_s
    )
    queries["analytics_cn_power_status"] = ops.sum_over_time(
        f"({base_query} == bool {NodePowerStatus.LINK_ALIVE.value})",
        f"{interval_s - 1}s:{hold_time}s",
    )

    # Create query for topology_node_is_online
    base_query = PrometheusClient.format_query("topology_node_is_online", labels)
    queries["topology_node_is_online"] = ops.sum_over_time(base_query, f"{interval_s}s")

    # Create query for
    base_query = PrometheusClient.format_query("drs_default_routes_changed", labels)
    queries["drs_default_routes_changed"] = ops.sum_over_time(
        base_query, f"{interval_s}s"
    )

    # Create query for udp_pinger_loss_ratio
    base_query = PrometheusClient.format_query(
        "udp_pinger_loss_ratio",
        {**labels, consts.data_interval_s: Metrics.udp_pinger_loss_ratio.period_s},
    )
    queries["udp_pinger_loss_ratio"] = ops.sum_over_time(
        f"({base_query} < bool 0.9)",
        f"{interval_s - 1}s:{Metrics.udp_pinger_loss_ratio.period_s}s",
    )

    # Create query for udp_pinger_rtt_avg
    base_query = PrometheusClient.format_query(
        "udp_pinger_rtt_avg",
        {**labels, consts.data_interval_s: Metrics.udp_pinger_rtt_avg.period_s},
    )
    queries["udp_pinger_rtt_avg"] = ops.quantile_over_time(
        base_query, f"{interval_s}s", 0.75
    )

    return queries


async def fetch_prometheus_stats(
    network_name: str, time_s: int, interval_s: int, link_stats: Dict, node_stats: Dict
) -> None:
    """Fetch metrics for all links of the network from Prometheus."""
    client = PrometheusClient(timeout=60)
    coros = []
    metrics = []
    link_queries = get_link_queries(network_name, interval_s)
    node_queries = get_node_queries(network_name, interval_s)

    for metric, query in {**link_queries, **node_queries}.items():
        metrics.append(metric)
        coros.append(client.query_latest(query, time_s))

    for metric, response in zip(
        metrics, await asyncio.gather(*coros, return_exceptions=True)
    ):
        if isinstance(response, ClientRuntimeError) or response["status"] != "success":
            logging.error(
                f"Prometheus - Failed to fetch {metric} data "
                f"for {network_name}: {response}"
            )
            continue

        results = response["data"]["result"]
        if not results:
            logging.warning(
                f"Prometheus - Found no {metric} results for {network_name}"
            )
            continue

        for result in results:
            _timestamp, value = result["value"]
            if metric in link_queries:
                link_name = result["metric"].get(consts.link_name)
                if link_name is None:
                    continue
                link_stats[network_name][link_name][metric] = float(value)
            if metric in node_queries:
                node_name = result["metric"].get(consts.node_name)
                if node_name is None:
                    continue
                node_stats[network_name][node_name][metric] = float(value)


async def fetch_network_link_health(
    network_name: str,
    time_s: int,
    interval_s: int,
    link_stats: Dict,
    session: aiohttp.ClientSession,
) -> None:
    """Fetch health metric for all links from network test service."""
    try:
        url = f"{environ.get('NETWORK_TEST_URL', 'http://network_test:8080')}/execution"
        start_dt_iso = datetime.fromtimestamp(time_s - interval_s).isoformat()
        end_dt_iso = datetime.fromtimestamp(time_s).isoformat()
        params = {
            "network_name": network_name,
            "test_type": "parallel_link,sequential_link",
            "partial": "false",
            "status": "finished",
            "start_dt": start_dt_iso,
        }
        async with session.get(url, params=params) as resp:
            if resp.status != 200:
                logging.error(f"Request to {url} failed: {resp.reason} ({resp.status})")
                return None

            executions = json.loads(await resp.read())
            if not executions or not executions["executions"]:
                logging.error(
                    f"Network test - No network test execution data for {network_name} "
                    + f"between {start_dt_iso} and {end_dt_iso}."
                )
                return None

        latest_execution_id = max(row["id"] for row in executions["executions"])
        url = f"{url}/{latest_execution_id}"
        async with session.get(url) as resp:
            if resp.status != 200:
                logging.error(f"Request to {url} failed: {resp.reason} ({resp.status})")
                return None

            results = json.loads(await resp.read())
            for result in results["results"]:
                if result["health"] is None or result["health"] == "MISSING":
                    logging.warning(
                        f'Network test - Link health of {result["asset_name"]} '
                        f'for {network_name} is {result["health"]}.'
                    )
                    continue
                link_name = result["asset_name"]
                link_stats[network_name][link_name]["link_health"] = Health[
                    result["health"]
                ].value
    except (aiohttp.ClientError, asyncio.TimeoutError) as err:
        logging.error(f"Request to {url} for {network_name} failed: {err}")


async def fetch_network_node_health(
    network_name: str,
    time_s: int,
    interval_s: int,
    node_stats: Dict,
    session: aiohttp.ClientSession,
) -> None:
    """Fetch health metric for all nodes from network test service."""
    try:
        url = f"{environ.get('NETWORK_TEST_URL', 'http://network_test:8080')}/execution"
        start_dt_iso = datetime.fromtimestamp(time_s - interval_s).isoformat()
        end_dt_iso = datetime.fromtimestamp(time_s).isoformat()
        params = {
            "network_name": network_name,
            "test_type": "sequential_node",
            "partial": "false",
            "status": "finished",
            "start_dt": start_dt_iso,
        }
        async with session.get(url, params=params) as resp:
            if resp.status != 200:
                logging.error(f"Request to {url} failed: {resp.reason} ({resp.status})")
                return None

            executions = json.loads(await resp.read())
            if not executions or not executions["executions"]:
                logging.error(
                    f"Network test - No network test execution data for {network_name} "
                    + f"between {start_dt_iso} and {end_dt_iso}."
                )
                return None

        latest_execution_id = max(row["id"] for row in executions["executions"])
        url = f"{url}/{latest_execution_id}"
        async with session.get(url) as resp:
            if resp.status != 200:
                logging.error(f"Request to {url} failed: {resp.reason} ({resp.status})")
                return None

            results = json.loads(await resp.read())
            for result in results["results"]:
                if result["health"] is None or result["health"] == "MISSING":
                    logging.warning(
                        f'Network test - Node health of {result["asset_name"]} '
                        f'for {network_name} is {result["health"]}.'
                    )
                    continue
                node_name = result["asset_name"]
                node_stats[network_name][node_name]["node_health"] = Health[
                    result["health"]
                ].value
    except (aiohttp.ClientError, asyncio.TimeoutError) as err:
        logging.error(f"Request to {url} for {network_name} failed: {err}")


async def fetch_scan_stats(
    network_name: str,
    time_s: int,
    interval_s: int,
    link_stats: Dict,
    session: aiohttp.ClientSession,
) -> None:
    """Fetch inr_curr_power metric for all links of the network from scan service."""
    try:
        url = f"{environ.get('SCAN_SERVICE_URL', 'http://scan_service:8080')}/execution"
        start_dt_iso = datetime.fromtimestamp(time_s - interval_s).isoformat()
        end_dt_iso = datetime.fromtimestamp(time_s).isoformat()
        params = {
            "network_name": network_name,
            "status": "finished",
            "start_dt": start_dt_iso,
        }
        async with session.get(url, params=params) as resp:
            if resp.status != 200:
                logging.error(f"Request to {url} failed: {resp.reason} ({resp.status})")
                return None

            executions = json.loads(await resp.read())
            if not executions or not executions["executions"]:
                logging.error(
                    f"Scan service - No scan execution data found for {network_name} "
                    + f"between {start_dt_iso} and {end_dt_iso}."
                )
                return None

        latest_execution_id = max(row["id"] for row in executions["executions"])
        url = f"{url}/{latest_execution_id}"
        async with session.get(url) as resp:
            if resp.status != 200:
                logging.error(f"Request to {url} failed: {resp.reason} ({resp.status})")
                return None

            results = json.loads(await resp.read())
            if "n_day_avg" not in results["aggregated_inr"]:
                logging.warning(
                    f"Scan service - No interference data found for {network_name}."
                )
                return None

            for link_name, directions in results["aggregated_inr"]["n_day_avg"].items():
                inr_max = max(d["inr_curr_power"] for d in directions)
                link_stats[network_name][link_name]["interference"] = inr_max
    except (aiohttp.ClientError, asyncio.TimeoutError) as err:
        logging.error(f"Request to {url} for {network_name} failed: {err}")


async def fetch_query_link_avail(
    network_name: str, interval_s: int, link_stats: Dict, session: aiohttp.ClientSession
) -> None:
    """Fetch linkAlive and linkAvailForData metrics from query service."""
    try:
        url = f"{environ.get('QUERY_SERVICE_URL', 'http://query_service:8086')}/link_health/{network_name}/{math.ceil(interval_s/3600)}"
        async with session.get(url) as resp:
            if resp.status != 200:
                logging.error(f"Request to {url} failed: {resp.reason} ({resp.status})")
                return None

            results = json.loads(await resp.read())
            if not results or not results["events"]:
                logging.warning(f"Query service - No data found for {network_name}.")
                return None
    except (aiohttp.ClientError, asyncio.TimeoutError) as err:
        logging.error(f"Request to {url} for {network_name} failed: {err}")
        return None

    for link_name, data in results["events"].items():
        if "linkAlive" in data:
            link_stats[network_name][link_name]["link_alive"] = data["linkAlive"]
        if "linkAvailForData" in data:
            link_stats[network_name][link_name]["link_avail_for_data"] = data[
                "linkAvailForData"
            ]
