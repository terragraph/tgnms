#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import asyncio
import logging
import typing
from collections import defaultdict
from enum import IntEnum
from typing import Any, Collection, DefaultDict, Dict, Iterable, List, Optional

import numpy as np
from tglib.clients.prometheus_client import PrometheusClient, PrometheusMetric, consts
from tglib.exceptions import ClientRuntimeError

from .utils.hardware_config import HardwareConfig


class NodeAlignmentStatus(IntEnum):
    """List of possible status of a node in a network
    1. the node alignment is accurate
    2. the tx degree or rx degree is larger than the threshold misaligned degree
    3. the difference between tx degree and rx degree is larger that the threshold value

    Ordering/values should not be changed for backward compatibility; add
    new entries to the end of the list.
    """

    TX_RX_HEALTHY = 1
    LARGE_ANGLE = 2
    TX_RX_DIFF = 3


def compute_link_foliage(
    network_stats: Iterable,
    number_of_windows: int,
    min_window_size: int,
    minimum_var: float,
    query_interval: int,
) -> None:

    foliage_metrics: List = []
    for network_name, prom_results in network_stats:
        if prom_results is None:
            continue
        stats = process_foliage_metrics(prom_results, network_name)
        network_tx_power_stats = stats.get("tx_power")
        network_rssi_stats = stats.get("rssi")
        forward_link_metrics: Dict = {}
        reverse_link_metrics: Dict = {}
        if network_tx_power_stats is None or network_rssi_stats is None:
            continue
        for tx_power_per_link in network_tx_power_stats:
            rssi_per_link = filter(
                lambda x: x["link_name"] == tx_power_per_link["link_name"],
                network_rssi_stats,
            )
            for rssi in rssi_per_link:
                if (
                    rssi["link_direction"] == "Z"
                    and tx_power_per_link["link_direction"] == "A"
                ):
                    path_loss = calculate_path_loss(
                        tx_power_per_link["values"], rssi["values"]
                    )
                    forward_link_metrics[tx_power_per_link["link_name"]] = path_loss
                if (
                    rssi["link_direction"] == "A"
                    and tx_power_per_link["link_direction"] == "Z"
                ):
                    path_loss = calculate_path_loss(
                        tx_power_per_link["values"], rssi["values"]
                    )
                    reverse_link_metrics[tx_power_per_link["link_name"]] = path_loss

        for link_name, forward_link_path_loss in forward_link_metrics.items():
            reverse_link_path_loss: Optional[Dict] = reverse_link_metrics.get(link_name)
            if reverse_link_path_loss is None:
                continue
            foliage_factor = compute_single_link_foliage_factor(
                network_name,
                link_name,
                forward_link_path_loss,
                reverse_link_path_loss,
                number_of_windows,
                min_window_size,
                minimum_var,
            )
            if foliage_factor is None:
                continue
            logging.info(
                f"{network_name}:{link_name} foliage_factor is {foliage_factor}"
            )
            labels = {consts.network: network_name, consts.link_name: link_name}
            foliage_metrics.append(
                PrometheusMetric(
                    name="analytics_foliage_factor", value=foliage_factor, labels=labels
                )
            )
    PrometheusClient.write_metrics(foliage_metrics)


def calculate_path_loss(tx_power: List, rssi: List) -> Dict:
    """Calculate pathloss using TX tx_power and RX rssi for synced timestamps.

    tx_power and rssi values could be sampled at different timestamps. Calculate
    pathloss only for those timestamps that have both the stat values.
    """
    pathloss: Dict = {}
    i, j = 0, 0
    while i < len(tx_power) and j < len(rssi):
        tx_power_time, tx_power_index = tx_power[i]
        rssi_time, rx_rssi = rssi[j]
        if tx_power_time > rssi_time:
            j += 1
            continue
        if tx_power_time < rssi_time:
            i += 1
            continue
        i += 1
        j += 1
        power_dBm = HardwareConfig.TXPOWERIDX_TO_TXPOWER["default_channel"][
            "default_mcs"
        ].get(int(tx_power_index))
        if power_dBm is None:
            continue
        pathloss[tx_power_time] = power_dBm - int(rx_rssi)
    return pathloss


def compute_single_link_foliage_factor(
    network_name: str,
    link_name: str,
    forward_path_loss_w_time: Dict,
    reverse_path_loss_w_time: Dict,
    number_of_windows: int,
    min_window_size: int,
    minimum_var: float,
) -> Optional[float]:
    common_timestaps = set(forward_path_loss_w_time).intersection(
        reverse_path_loss_w_time
    )
    forward_link_path_loss = [forward_path_loss_w_time[i] for i in common_timestaps]
    reverse_link_path_loss = [reverse_path_loss_w_time[i] for i in common_timestaps]

    if len(forward_link_path_loss) < min_window_size * number_of_windows:
        logging.error(
            (
                f"Cannot compute foliage factor for {link_name} of {network_name}, "
                f"need {min_window_size * number_of_windows} samples, "
                f"{len(forward_link_path_loss)} provided"
            )
        )
        return None

    window_len = int(len(forward_link_path_loss) / number_of_windows)
    windows = [(i * window_len, (i + 1) * window_len) for i in range(number_of_windows)]
    cross_covariances = []
    for start_idx, end in windows:
        end_idx = end + 1
        forward_link_offsets = forward_link_path_loss[start_idx:end_idx]
        reverse_link_offsets = reverse_link_path_loss[start_idx:end_idx]
        forward_var = np.var(forward_link_offsets)
        reverse_var = np.var(reverse_link_offsets)

        if forward_var <= minimum_var or reverse_var <= minimum_var:
            # ###Channel is too stable, skip the window
            continue
        else:
            # Compute the un-normalized covariance between forward and reverse pathloss
            cross_covariance = np.cov([forward_link_offsets, reverse_link_offsets])[0][
                1
            ]
            # Normalize by variance of forward and reverse link pathloss
            cross_covariance /= np.sqrt(forward_var * reverse_var)
            cross_covariances.append((forward_var + reverse_var, cross_covariance))
    foliage_factor = 0.0
    total_weight = 0
    for weight, factor in cross_covariances:
        foliage_factor += weight * factor
        total_weight += weight

    if total_weight > 0:
        foliage_factor = round(foliage_factor / total_weight, 3)
    return foliage_factor


def process_foliage_metrics(prom_results: Dict, network_name: str) -> Dict:
    foliage_stats: Dict = {}
    for metric, values in prom_results.items():
        if not prom_results[metric]:
            logging.debug(f"Found no {metric} results for {network_name}")
            continue
        foliage_stats[metric] = [
            {
                "link_name": val["metric"][consts.link_name],
                "link_direction": val["metric"][consts.link_direction],
                "values": val["values"],
            }
            for val in values
        ]
    return foliage_stats


def analyze_alignment(
    network_stats: Iterable,
    threshold_misalign_degree: int,
    threshold_tx_rx_degree_diff: int,
) -> None:

    alignment_stats: List = []
    for network_name, prom_results in network_stats:
        if prom_results is None:
            continue
        stats = process_node_alignment_metrics(prom_results, network_name)
        tx_beam_idx_stats = stats.get("tx_beam_idx")
        rx_beam_idx_stats = stats.get("rx_beam_idx")

        if tx_beam_idx_stats is None or rx_beam_idx_stats is None:
            continue

        for link in tx_beam_idx_stats:
            tx_stats = tx_beam_idx_stats[link]
            rx_stats = rx_beam_idx_stats.get(link)
            if not rx_stats:
                logging.debug(
                    f"For {link}, tx beam stats is available, missing rx beam stats."
                )
                continue

            for key, value in tx_stats.items():
                rx_idx = rx_stats.get(key)
                if not rx_idx or not value:
                    logging.debug(f"Beam index missing for {link}.")
                    continue

                tx_degree_info = HardwareConfig.BEAM_IDX_TO_TILE_ELE_ANGLE.get(value)
                rx_degree_info = HardwareConfig.BEAM_IDX_TO_TILE_ELE_ANGLE.get(rx_idx)
                if tx_degree_info is None or rx_degree_info is None:
                    continue
                _, _, tx_degree = rx_degree_info
                _, _, rx_degree = rx_degree_info

                node_alignment_status = NodeAlignmentStatus.TX_RX_HEALTHY
                if (
                    tx_degree > threshold_misalign_degree
                    or rx_degree > threshold_misalign_degree
                ):
                    node_alignment_status = NodeAlignmentStatus.LARGE_ANGLE
                if tx_degree - rx_degree > threshold_tx_rx_degree_diff:
                    node_alignment_status = NodeAlignmentStatus.TX_RX_DIFF

                labels = {
                    consts.network: network_name,
                    consts.link_name: link,
                    consts.link_direction: key[0],
                    consts.node_name: key[1],
                }
                alignment_stats += [
                    PrometheusMetric(
                        "analytics_alignment_status",
                        labels,
                        node_alignment_status.value,
                    ),
                    PrometheusMetric("analytics_tx_beam_angle", labels, tx_degree),
                    PrometheusMetric("analytics_rx_beam_angle", labels, rx_degree),
                ]
    PrometheusClient.write_metrics(alignment_stats)


def process_node_alignment_metrics(prom_results: Dict, network_name: str) -> Dict:
    node_alignment_results: Dict = {}
    for metric, values in prom_results.items():
        if not prom_results[metric]:
            logging.debug(f"Found no {metric} results for {network_name}")
            continue
        results: DefaultDict = defaultdict(dict)
        for val in values:
            if not val["values"]:
                continue
            results[val["metric"][consts.link_name]][
                (val["metric"][consts.link_direction], val["metric"][consts.node_name])
            ] = int(val["values"][-1][1])
        node_alignment_results[metric] = results
    return node_alignment_results


async def fetch_metrics(
    network_name: str, metrics: List[str], start_time: int, end_time: int, step: int
) -> Optional[Dict]:
    """Fetch latest metrics for all links in the network"""
    client = PrometheusClient(timeout=2)
    coros = []
    for metric in metrics:
        coros.append(
            client.query_range(
                client.format_query(metric, {"network": network_name}),
                step=f"{step}s",
                start=start_time,
                end=end_time,
            )
        )
    try:
        results: Dict = {}
        for metric, response in zip(metrics, await asyncio.gather(*coros)):
            if response["status"] != "success":
                logging.error(f"Failed to fetch {metric} data for {network_name}")
                continue
            results[metric] = response["data"]["result"]
        return results
    except ClientRuntimeError:
        logging.exception("Failed to fetch metrics from Prometheus.")
        return None
