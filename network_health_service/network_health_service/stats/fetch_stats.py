#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import asyncio
import json
import logging
import math
from datetime import datetime
from typing import Any, Dict

import aiohttp
from tglib.clients.prometheus_client import PrometheusClient, consts, ops
from tglib.exceptions import ClientRuntimeError

from ..models import NodeAlignmentStatus, NodePowerStatus, Health
from .metrics import Metrics


def get_link_queries(network_name: str, period_s: int) -> Dict[str, str]:
    """Create PromQL queries for link metrics."""
    queries = {}
    labels: Dict[str, Any] = {consts.network: network_name}

    base_query = PrometheusClient.format_query("analytics_alignment_status", labels)
    hold_time = min(
        Metrics.prometheus_hold_time, Metrics.analytics_alignment_status.interval_s
    )
    queries["analytics_alignment_status"] = ops.sum_over_time(
        ops.min_by(
            f"{base_query} == bool {NodeAlignmentStatus.TX_RX_HEALTHY.value}",
            consts.link_name,
        ),
        f"{period_s - 1}s:{hold_time}s",
    )

    base_query = PrometheusClient.format_query("topology_link_is_online", labels)
    hold_time = min(
        Metrics.prometheus_hold_time, Metrics.topology_link_is_online.interval_s
    )
    queries["topology_link_is_online"] = ops.sum_over_time(
        ops.min_by(base_query, consts.link_name), f"{period_s - 1}s:{hold_time}s"
    )

    base_query = PrometheusClient.format_query("tx_byte", labels)
    queries["tx_byte"] = ops.quantile_over_time(
        ops.sum_by(base_query, consts.link_name),
        f"{period_s - 1}s:{Metrics.tx_byte.interval_s}s",
        0.75,
    )

    base_query = PrometheusClient.format_query("analytics_foliage_factor", labels)
    hold_time = min(
        Metrics.prometheus_hold_time, Metrics.analytics_foliage_factor.interval_s
    )
    queries["analytics_foliage_factor"] = ops.quantile_over_time(
        ops.abs(base_query), f"{period_s - 1}s:{hold_time}s", 0.75
    )

    base_query = PrometheusClient.format_query("drs_cn_egress_routes_count", labels)
    hold_time = min(
        Metrics.prometheus_hold_time, Metrics.drs_cn_egress_routes_count.interval_s
    )
    queries["drs_cn_egress_routes_count"] = ops.quantile_over_time(
        ops.max_by(base_query, consts.link_name), f"{period_s - 1}s:{hold_time}s", 0.75
    )

    # All stats below can be found using intervalSec label
    labels[consts.data_interval_s] = 1

    base_query = PrometheusClient.format_query("tx_ok", labels)
    queries["tx_ok"] = ops.quantile_over_time(
        ops.sum_by(base_query, consts.link_name),
        f"{period_s - 1}s:{Metrics.tx_ok.interval_s}s",
        0.75,
    )

    base_query = PrometheusClient.format_query("link_avail", labels)
    queries["link_avail"] = ops.max_by(
        ops.resets(base_query, f"{period_s}s"), consts.link_name
    )

    base_query = PrometheusClient.format_query("mcs", labels)
    queries["mcs"] = ops.quantile_over_time(
        ops.min_by(base_query, consts.link_name),
        f"{period_s - 1}s:{Metrics.mcs.interval_s}s",
        0.25,
    )

    labels[consts.link_direction] = "A"
    query_A = PrometheusClient.format_query("mcs", labels)
    labels[consts.link_direction] = "Z"
    query_Z = PrometheusClient.format_query("mcs", labels)
    queries["mcs_diff"] = ops.quantile_over_time(
        ops.abs(ops.diff_on(query_A, query_Z, consts.link_name)),
        f"{period_s - 1}s:{Metrics.mcs_diff.interval_s}s",
        0.75,
    )

    labels[consts.link_direction] = "A"
    query_A = PrometheusClient.format_query("tx_power", labels)
    labels[consts.link_direction] = "Z"
    query_Z = PrometheusClient.format_query("tx_power", labels)
    queries["tx_power_diff"] = ops.quantile_over_time(
        ops.abs(ops.diff_on(query_A, query_Z, consts.link_name)),
        f"{period_s - 1}s:{Metrics.tx_power_diff.interval_s}s",
        0.75,
    )

    return queries


def get_node_queries(network_name: str, period_s: int) -> Dict[str, str]:
    """Create PromQL queries for node metrics."""
    queries = {}
    labels: Dict[str, Any] = {consts.network: network_name}

    base_query = PrometheusClient.format_query("analytics_cn_power_status", labels)
    hold_time = min(
        Metrics.prometheus_hold_time, Metrics.analytics_cn_power_status.interval_s
    )
    queries["analytics_cn_power_status"] = ops.sum_over_time(
        f"({base_query} == bool {NodePowerStatus.LINK_ALIVE.value})",
        f"{period_s - 1}s:{hold_time}s",
    )

    base_query = PrometheusClient.format_query("topology_node_is_online", labels)
    queries["topology_node_is_online"] = ops.sum_over_time(base_query, f"{period_s}s")

    # All stats below can be found using intervalSec label
    labels[consts.data_interval_s] = 30

    base_query = PrometheusClient.format_query("udp_pinger_loss_ratio", labels)
    queries["udp_pinger_loss_ratio"] = ops.sum_over_time(
        f"({base_query} < bool 0.9)",
        f"{period_s - 1}s:{Metrics.udp_pinger_loss_ratio.interval_s}s",
    )

    base_query = PrometheusClient.format_query("node_online", labels)
    queries["node_online"] = ops.sum_over_time(base_query, f"{period_s}s")

    base_query = PrometheusClient.format_query("udp_pinger_rtt_avg", labels)
    queries["udp_pinger_rtt_avg"] = ops.quantile_over_time(
        base_query, f"{period_s}s", 0.75
    )

    return queries


async def fetch_prometheus_stats(
    network_name: str, time_s: int, period_s: int, link_stats: Dict, node_stats: Dict
) -> None:
    """Fetch metrics for all links of the network from Prometheus."""
    client = PrometheusClient(timeout=60)
    coros = []
    metrics = []
    link_queries = get_link_queries(network_name, period_s)
    node_queries = get_node_queries(network_name, period_s)

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
                link_name = result["metric"][consts.link_name]
                link_stats[network_name][link_name][metric] = float(value)
            if metric in node_queries:
                node_name = result["metric"][consts.node_name]
                node_stats[network_name][node_name][metric] = float(value)


async def fetch_network_link_health(
    network_name: str,
    time_s: int,
    period_s: int,
    link_stats: Dict,
    session: aiohttp.ClientSession,
) -> None:
    """Fetch health metric for all links from network test service."""
    try:
        url = "http://network_test:8080/execution"
        start_dt_iso = datetime.fromtimestamp(time_s - period_s).isoformat()
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
    period_s: int,
    node_stats: Dict,
    session: aiohttp.ClientSession,
) -> None:
    """Fetch health metric for all nodes from network test service."""
    try:
        url = "http://network_test:8080/execution"
        start_dt_iso = datetime.fromtimestamp(time_s - period_s).isoformat()
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
    period_s: int,
    link_stats: Dict,
    session: aiohttp.ClientSession,
) -> None:
    """Fetch inr_curr_power metric for all links of the network from scan service."""
    try:
        url = "http://scan_service:8080/execution"
        start_dt_iso = datetime.fromtimestamp(time_s - period_s).isoformat()
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
    network_name: str, period_s: int, link_stats: Dict, session: aiohttp.ClientSession
) -> None:
    """Fetch linkAlive and linkAvailForData metrics from query service."""
    try:
        url = (
            "http://query_service:8086/link_health/"
            f"{network_name}/{math.ceil(period_s/3600)}"
        )
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
