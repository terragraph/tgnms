#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import asyncio
import dataclasses
import logging
from datetime import datetime
from typing import Dict, Optional, Any, Callable

from tglib.clients.prometheus_client import PrometheusClient, consts, ops
from tglib.exceptions import ClientRuntimeError

from ..models import NetworkTestHealth


@dataclasses.dataclass
class NodeMetric:
    """Representation of firmware metric names and transformations."""

    name: str
    data_interval_s: Optional[int] = None
    transformation: Optional[Callable] = None
    percentile: Optional[float] = None


INSTANT_METRICS = [
    NodeMetric("udp_pinger_loss_ratio", 30, ops.quantile_over_time, 0.75),
    NodeMetric("udp_pinger_rtt_avg", 30, ops.quantile_over_time, 0.75),
]


def create_query(
    metric: NodeMetric, network_name: str, node_name: str, session_duration: int
) -> str:
    """Create a PromQL query given metric and label information."""
    labels: Dict[str, Any] = {consts.network: network_name, consts.node_name: node_name}

    if metric.data_interval_s is not None:
        labels[consts.data_interval_s] = metric.data_interval_s

    query = PrometheusClient.format_query(metric.name, labels)
    if metric.transformation is not None and metric.percentile is not None:
        query = metric.transformation(query, f"{session_duration}s", metric.percentile)

    return query


async def fetch_node_stats(
    start_dt: datetime, session_duration: int, network_name: str, node_name: str
) -> Dict[str, float]:
    """Fetch node stats for a given node during the specified session time."""
    client = PrometheusClient(timeout=1)
    start = int(round(start_dt.timestamp()))
    coros = []
    for metric in INSTANT_METRICS:
        coros.append(
            client.query_latest(
                create_query(metric, network_name, node_name, session_duration),
                time=start + session_duration,
            )
        )

    values: Dict[str, Any] = {}
    for metric, response in zip(
        INSTANT_METRICS, await asyncio.gather(*coros, return_exceptions=True)
    ):
        if isinstance(response, ClientRuntimeError) or response["status"] != "success":
            logging.error(f"Failed to fetch {metric.name} data for {node_name}")
            continue

        result = response["data"]["result"]
        if not result:
            logging.debug(f"Found no {metric.name} results for {node_name}")
            continue
        values[metric.name] = float(result[0]["value"][1])

    return values


def compute_node_health(
    expected_bitrate: int, iperf_avg_throughput: float
) -> NetworkTestHealth:
    """Compute the health of a node under test using simple traffic rate metrics."""
    iperf_tput_ratio = iperf_avg_throughput / expected_bitrate
    if iperf_tput_ratio >= 0.99:
        return NetworkTestHealth.EXCELLENT
    elif iperf_tput_ratio >= 0.95:
        return NetworkTestHealth.GOOD
    elif iperf_tput_ratio >= 0.75:
        return NetworkTestHealth.MARGINAL
    else:
        return NetworkTestHealth.POOR
