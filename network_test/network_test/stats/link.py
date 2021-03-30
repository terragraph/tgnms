#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import asyncio
import dataclasses
import enum
import logging
from datetime import datetime
from math import inf
from typing import Any, Callable, Dict, List, Optional, Tuple

from tglib.clients.prometheus_client import PrometheusClient, consts, ops
from tglib.exceptions import ClientRuntimeError

from ..models import NetworkTestHealth


BWGD_S = 25.6 / 1e3


class LinkDirection(enum.Enum):
    """Enumerate link direction options."""

    RX = 1
    TX = 2


@dataclasses.dataclass
class LinkMetric:
    """Representation of firmware metric names and transformations."""

    name: str
    data_interval_s: Optional[int] = None
    direction: Optional[LinkDirection] = None
    transformation: Optional[Callable] = None
    key: Optional[str] = None


CUSTOM_METRICS = []

INSTANT_METRICS = [
    LinkMetric("fw_uptime", 1, None, ops.delta, "fw_uptime_delta"),
    LinkMetric("fw_uptime", 1, None, ops.resets, "fw_uptime_resets"),
    LinkMetric("link_avail", 1, None, ops.delta),
    LinkMetric("mcs", 1, LinkDirection.TX, ops.avg_over_time, "mcs_avg"),
    LinkMetric("mcs", 1, LinkDirection.TX, ops.count_over_time, "mcs_count"),
    LinkMetric("rssi", 1, LinkDirection.RX, ops.avg_over_time),
    LinkMetric("rx_beam_idx", 30, LinkDirection.RX),
    LinkMetric("rx_fail", 1, LinkDirection.RX, ops.delta),
    LinkMetric("rx_ok", 1, LinkDirection.RX, ops.delta),
    LinkMetric("snr", 1, LinkDirection.RX, ops.avg_over_time),
    LinkMetric("topology_link_distance_meters"),
    LinkMetric("tx_beam_idx", 30, LinkDirection.TX),
    LinkMetric("tx_ok", 1, LinkDirection.TX, ops.delta),
    LinkMetric("tx_fail", 1, LinkDirection.TX, ops.delta),
    LinkMetric("tx_power", 1, LinkDirection.TX, ops.avg_over_time),
]


def create_query(
    metric: LinkMetric,
    network_name: str,
    link_name: str,
    src_node_mac: str,
    dst_node_mac: str,
    session_duration: int,
) -> str:
    """Create a PromQL query given metric and label information."""
    labels: Dict[str, Any] = {
        consts.network: network_name,
        consts.link_name: link_name,
    }
    if metric.direction == LinkDirection.RX:
        labels[consts.node_mac] = dst_node_mac
    elif metric.direction == LinkDirection.TX:
        labels[consts.node_mac] = src_node_mac

    if metric.data_interval_s is not None:
        labels[consts.data_interval_s] = metric.data_interval_s

    query = PrometheusClient.format_query(metric.name, labels)
    if metric.transformation is not None:
        query = metric.transformation(query, f"{session_duration}s")
    return query


async def fetch_link_stats(
    start_dt: datetime,
    session_duration: int,
    network_name: str,
    link_name: str,
    src_node_mac: str,
    dst_node_mac: str,
) -> Optional[Tuple[Dict[str, Any], Dict[str, Any]]]:
    """Fetch link stats for a given link during the specified session time."""
    client = PrometheusClient(timeout=1)
    start = int(round(start_dt.timestamp()))
    coros = []
    for metric in INSTANT_METRICS:
        coros.append(
            client.query_latest(
                create_query(
                    metric,
                    network_name,
                    link_name,
                    src_node_mac,
                    dst_node_mac,
                    session_duration,
                ),
                time=start + session_duration,
            )
        )

    labels: Dict[str, Any] = {
        consts.network: network_name,
        consts.link_name: link_name,
        consts.node_mac: src_node_mac,
        consts.data_interval_s: 1,
    }
    mcs = PrometheusClient.format_query("mcs", labels)
    la_tpc_no_traffic = PrometheusClient.format_query("la_tpc_no_traffic", labels)

    # `la_tpc_no_traffic` is a per-second counter of the number of superframes w/o
    # traffic. There are 625 SFs in a second. The delta gives the number of SFs
    # without traffic in each second. We use a cutoff of 5% of 625=31 to mark any
    # second that has 95% of SFs with traffic. Such with-traffic samples are
    # multiplied by the per-second MCS values. Only samples in which the traffic
    # and MCS product is greater than 0 are used to count/find percentile of
    # `mcs_with_traffic` during the iPerf session.
    mcs_with_traffic = (
        f"((({ops.delta(la_tpc_no_traffic, '1s')} <= bool 31) * {mcs}) > 0)"
    )

    CUSTOM_METRICS.append(LinkMetric("mcs_with_traffic_count"))
    coros.append(
        client.query_latest(
            ops.count_over_time(mcs_with_traffic, f"{session_duration}s:1s"),
            time=start + session_duration,
        )
    )

    CUSTOM_METRICS.append(LinkMetric("mcs_p10"))
    coros.append(
        client.query_latest(
            ops.quantile_over_time(mcs_with_traffic, f"{session_duration}s:1s", 0.1),
            time=start + session_duration,
        )
    )

    values: Dict[str, Any] = {}
    for metric, response in zip(
        INSTANT_METRICS + CUSTOM_METRICS,
        await asyncio.gather(*coros, return_exceptions=True),
    ):
        if isinstance(response, ClientRuntimeError) or response["status"] != "success":
            logging.error(f"Failed to fetch {metric.name} data for {link_name}")
            continue

        result = response["data"]["result"]
        if not result:
            logging.debug(f"Found no {metric.name} results for {link_name}")
            continue

        key = metric.key or metric.name
        if "value" in result[0]:
            # Instant metric
            values[key] = float(result[0]["value"][1])
        elif "values" in result[0]:
            # Range metric
            values[key] = [float(value[1]) for value in result[0]["values"]]

    rx_packet_count: Optional[float] = None
    rx_per: Optional[float] = None
    tx_packet_count: Optional[float] = None
    tx_per: Optional[float] = None
    if "fw_uptime_resets" in values and values["fw_uptime_resets"] == 0:
        if "rx_fail" in values and "rx_ok" in values:
            rx_packet_count = values["rx_fail"] + values["rx_ok"]
            rx_per = values["rx_fail"] / rx_packet_count if rx_packet_count else inf
        if "tx_fail" in values and "tx_ok" in values:
            tx_packet_count = values["tx_fail"] + values["tx_ok"]
            tx_per = values["tx_fail"] / tx_packet_count if tx_packet_count else inf

    return (
        {
            "link_distance": values.get("topology_link_distance_meters"),
            "mcs_avg": values.get("mcs_avg"),
            "rssi_avg": values.get("rssi"),
            "snr_avg": values.get("snr"),
            "rx_beam_idx": values.get("rx_beam_idx"),
            "rx_packet_count": rx_packet_count,
            "rx_per": rx_per,
            "tx_beam_idx": values.get("tx_beam_idx"),
            "tx_packet_count": tx_packet_count,
            "tx_per": tx_per,
            "tx_pwr_avg": values.get("tx_power"),
        },
        {
            "fw_uptime": values.get("fw_uptime_delta"),
            "link_avail": values.get("link_avail"),
            "link_distance_m": values.get("topology_link_distance_meters"),
            "mcs_count": values.get("mcs_count"),
            "mcs_p10": values.get("mcs_p10"),
            "mcs_with_traffic_count": values.get("mcs_with_traffic_count"),
            "tx_per": tx_per,
        },
    )


def compute_link_health(
    session_duration: int,
    expected_bitrate: int,
    iperf_avg_throughput: float,
    fw_uptime: Optional[float],
    link_avail: Optional[float],
    link_distance_m: Optional[float],
    mcs_count: Optional[float],
    mcs_p10: Optional[float],
    mcs_with_traffic_count: Optional[float],
    tx_per: Optional[float],
) -> NetworkTestHealth:
    """Compute the health of a link under test using firmware and traffic rate metrics."""
    if (
        fw_uptime is None
        or link_avail is None
        or link_distance_m is None
        or mcs_count is None
        or mcs_p10 is None
        or mcs_with_traffic_count is None
        or tx_per is None
    ):
        params = [param for param, value in locals().items() if value is None]
        logging.error(f"Unable to calculate link health: Missing {params} data")
        return NetworkTestHealth.MISSING

    link_unavail_ratio = BWGD_S * (fw_uptime - link_avail) / session_duration

    if mcs_with_traffic_count / mcs_count < 0.6:
        logging.warning("Insufficient amount of 'mcs' samples with traffic")
        return NetworkTestHealth.POOR

    iperf_tput_ratio = iperf_avg_throughput / expected_bitrate

    logging.debug(f"tx_per: {tx_per:0.4f}")
    logging.debug(f"link_unavail_ratio: {link_unavail_ratio:0.4f}")
    logging.debug(f"iperf_tput_ratio: {iperf_tput_ratio:0.2f}")
    logging.debug(f"mcs_p10: {mcs_p10:0.2f}")

    if (
        tx_per <= 0.05
        and link_unavail_ratio == 0
        and iperf_tput_ratio >= 0.98
        and mcs_p10 >= (11 if link_distance_m <= 100 else 9)
    ):
        return NetworkTestHealth.EXCELLENT
    elif (
        tx_per <= 0.1
        and link_unavail_ratio <= 0.0005
        and iperf_tput_ratio >= 0.75
        and mcs_p10 >= (9 if link_distance_m <= 100 else 7)
    ):
        return NetworkTestHealth.GOOD
    elif (
        tx_per <= 0.2
        and link_unavail_ratio <= 0.005
        and iperf_tput_ratio >= 0.40
        and mcs_p10 >= (7 if link_distance_m <= 100 else 5)
    ):
        return NetworkTestHealth.MARGINAL
    else:
        return NetworkTestHealth.POOR
