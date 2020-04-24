#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import asyncio
import dataclasses
import enum
import logging
from datetime import datetime
from typing import Callable, Dict, Optional

from tglib.clients.prometheus_client import PrometheusClient, consts, ops
from tglib.exceptions import ClientRuntimeError


class LinkDirection(enum.Enum):
    """Enumerate link direction options."""

    RX = 1
    TX = 2


@dataclasses.dataclass
class FirmwareMetric:
    """Representation of firmware metric names and transformations."""

    name: str
    direction: Optional[LinkDirection] = None
    transformation: Optional[Callable] = None


FIRMWARE_METRICS = [
    FirmwareMetric("fw_uptime", None, ops.resets),
    FirmwareMetric("mcs", LinkDirection.TX, ops.avg_over_time),
    FirmwareMetric("rssi", LinkDirection.RX, ops.avg_over_time),
    FirmwareMetric("rx_beam_idx", LinkDirection.RX),
    FirmwareMetric("rx_fail", LinkDirection.RX, ops.delta),
    FirmwareMetric("rx_ok", LinkDirection.RX, ops.delta),
    FirmwareMetric("snr", LinkDirection.RX, ops.avg_over_time),
    FirmwareMetric("tx_beam_idx", LinkDirection.TX),
    FirmwareMetric("tx_ok", LinkDirection.TX, ops.delta),
    FirmwareMetric("tx_fail", LinkDirection.TX, ops.delta),
    FirmwareMetric("tx_power", LinkDirection.TX, ops.avg_over_time),
]


def create_query(
    metric: FirmwareMetric,
    network_name: str,
    link_name: str,
    src_node_mac: str,
    dst_node_mac: str,
    session_duration: int,
) -> str:
    labels = {
        consts.network: network_name,
        consts.link_name: PrometheusClient.normalize(link_name),
    }
    if metric.direction == LinkDirection.RX:
        labels[consts.node_mac] = dst_node_mac
    elif metric.direction == LinkDirection.TX:
        labels[consts.node_mac] = src_node_mac

    query = PrometheusClient.format_query(metric.name, labels)
    if metric.transformation is not None:
        query = metric.transformation(query, f"{session_duration}s")
    return query


async def compute_firmware_stats(
    start_dt: datetime,
    session_duration: int,
    network_name: str,
    link_name: str,
    src_node_mac: str,
    dst_node_mac: str,
) -> Dict[str, Optional[float]]:
    client = PrometheusClient(timeout=1)
    time = int(round(start_dt.timestamp())) + session_duration
    coros = []
    for metric in FIRMWARE_METRICS:
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
                time,
            )
        )

    try:
        values = {}
        for metric_name, response in zip(
            [metric.name for metric in FIRMWARE_METRICS], await asyncio.gather(*coros)
        ):
            if response["status"] != "success":
                logging.error(f"Failed to fetch {metric_name} data for {link_name}")
                continue

            result = response["data"]["result"]
            if not result:
                logging.debug(f"Found no {metric_name} results for {link_name}")
            else:
                values[metric_name] = float(result[0]["value"][1])
    except ClientRuntimeError:
        logging.exception("Failed to fetch firmware link stats from Prometheus")
        return {}

    rx_packet_count: Optional[float] = None
    rx_per: Optional[float] = None
    tx_packet_count: Optional[float] = None
    tx_per: Optional[float] = None
    if "fw_uptime" in values and values["fw_uptime"] == 0:
        if "rx_fail" in values and "rx_ok" in values:
            rx_packet_count = values["rx_fail"] + values["rx_ok"]
            rx_per = values["rx_fail"] / rx_packet_count if rx_packet_count else None
        if "tx_fail" in values and "tx_ok" in values:
            tx_packet_count = values["tx_fail"] + values["tx_ok"]
            tx_per = values["tx_fail"] / tx_packet_count if tx_packet_count else None

    return {
        "mcs_avg": values.get("mcs"),
        "rssi_avg": values.get("rssi"),
        "snr_avg": values.get("snr"),
        "rx_beam_idx": values.get("rx_beam_idx"),
        "rx_packet_count": rx_packet_count,
        "rx_per": rx_per,
        "tx_beam_idx": values.get("tx_beam_idx"),
        "tx_packet_count": tx_packet_count,
        "tx_per": tx_per,
        "tx_pwr_avg": values.get("tx_power"),
    }
