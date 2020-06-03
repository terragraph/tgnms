#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import asyncio
import logging
import typing
from collections import defaultdict
from typing import Any, Collection, Dict, List, Optional

import numpy as np
from tglib.clients.prometheus_client import PrometheusClient, consts, ops
from tglib.exceptions import ClientRuntimeError

from .math_utils import index2deg


async def compute_link_foliage(
    network_names: Collection[str],
    network_stats: List,
    number_of_windows: int,
    min_window_size: int,
    minimum_var: float,
    foliage_factor_threshold: float,
    query_interval: int,
) -> List[Dict]:

    results: List[Dict] = []
    for network_name, metrics in zip(network_names, network_stats):
        network_tx_power_stats = metrics.get("tx_power")
        network_rssi_stats = metrics.get("rssi")
        foliage_factor_stats: Dict = {}
        forward_link_metrics: Dict = {}
        reverse_link_metrics: Dict = {}
        if network_tx_power_stats and network_rssi_stats:
            for tx_power_per_link in network_tx_power_stats:
                rssi_per_link = list(
                    filter(
                        lambda x: x["linkName"] == tx_power_per_link["linkName"],
                        network_rssi_stats,
                    )
                )
                for rssi in rssi_per_link:
                    if (
                        rssi["linkDirection"] == "Z"
                        and tx_power_per_link["linkDirection"] == "A"
                    ):
                        path_loss = calculate_path_loss(
                            tx_power_per_link["values"], rssi["values"]
                        )
                        forward_link_metrics[tx_power_per_link["linkName"]] = path_loss
                    if (
                        rssi["linkDirection"] == "A"
                        and tx_power_per_link["linkDirection"] == "Z"
                    ):
                        path_loss = calculate_path_loss(
                            tx_power_per_link["values"], rssi["values"]
                        )
                        reverse_link_metrics[tx_power_per_link["linkName"]] = path_loss

            for link_name, forward_link_path_loss in forward_link_metrics.items():
                reverse_link_path_loss: Optional[List] = reverse_link_metrics.get(
                    link_name
                )
                if reverse_link_path_loss:
                    foliage_factor_stats[
                        link_name
                    ] = compute_single_link_foliage_factor(
                        forward_link_path_loss,
                        reverse_link_path_loss,
                        number_of_windows,
                        min_window_size,
                        minimum_var,
                    )
        total_wireless_links = 0
        if metrics.get("topology_wireless_links_total"):
            total_wireless_links = metrics.get("topology_wireless_links_total")
        network_foliage_stats = get_link_foliage_num(
            total_wireless_links, foliage_factor_stats, foliage_factor_threshold
        )
        results.append({network_name: foliage_factor_stats})
        logging.info(
            f"Link foliage stats of {network_name} : {dict(network_foliage_stats)}"
        )
    return results


def calculate_path_loss(tx_power: List, rssi: List) -> List:
    pathloss: List = []
    max_pwr_indx = 21  # max power index allowed
    max_pwr_db = 40  # dBm when it is 21
    for tx_power_index, rx_rssi in zip(tx_power, rssi):
        if tx_power_index >= max_pwr_indx:
            power_dBm = max_pwr_db + 0.5 * (tx_power_index - max_pwr_indx)
        else:
            power_dBm = max_pwr_db - (max_pwr_indx - tx_power_index)
        pl = power_dBm - rx_rssi
        pathloss.append(pl)
    return pathloss


def compute_single_link_foliage_factor(
    forward_link_path_loss: List,
    reverse_link_path_loss: List,
    number_of_windows: int,
    min_window_size: int,
    minimum_var: float,
) -> Optional[float]:
    if len(forward_link_path_loss) != len(reverse_link_path_loss):
        logging.error("Different lengths of forward and reverse link pathloss")
        return None

    if len(forward_link_path_loss) < min_window_size * number_of_windows:
        logging.error(
            (
                "Cannot compute foliage factor, need"
                f"{min_window_size * number_of_windows} samples,"
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
        foliage_factor = foliage_factor / total_weight
    return foliage_factor


def get_link_foliage_num(
    total_num_links: int, foliage_factor_stats: Dict, foliage_factor_threshold: float
) -> Dict:
    links_foliage_stats: defaultdict = defaultdict(int)
    for link, foliage_factor in foliage_factor_stats.items():
        if foliage_factor and foliage_factor >= foliage_factor_threshold:
            links_foliage_stats["num_foliage_links"] += 1
        else:
            links_foliage_stats["num_foliage_free_links"] += 1

    links_foliage_stats["num_unclassified_foliage_links"] = (
        total_num_links
        - links_foliage_stats["num_foliage_links"]
        - links_foliage_stats["num_foliage_free_links"]
    )
    return links_foliage_stats


async def fetch_foliage_metrics(
    network_name: str, start_time: int, end_time: int
) -> Dict:

    client = PrometheusClient(timeout=2)
    labels = {consts.network: network_name}
    step = "1s"
    window_s = end_time - start_time
    tx_power_query = client.format_query("tx_power", labels)
    rssi_query = client.format_query("rssi", labels)
    total_links_query = ops.max_over_time(
        client.format_query("topology_wireless_links_total", labels), f"{window_s}s"
    )
    coros = [
        client.query_range(tx_power_query, step, start_time, end_time),
        client.query_range(rssi_query, step, start_time, end_time),
        client.query_latest(total_links_query),
    ]

    try:
        values: Dict = {}
        for response in await asyncio.gather(*coros):
            if response["status"] != "success":
                logging.error(f"Failed to fetch foliage metrics for {network_name}")
                continue
            output = response["data"]["result"]
            if not output:
                logging.debug(f"Failed to find foliage metrics for {network_name}")
                continue
            result = []
            if len(output) > 1:
                for val in output:
                    result.append(
                        {
                            "linkName": val["metric"][consts.link_name],
                            "linkDirection": val["metric"][consts.link_direction],
                            "values": [int(element[1]) for element in val["values"]],
                        }
                    )
                values[output[0]["metric"]["__name__"]] = result
            if len(output) == 1:
                values["topology_wireless_links_total"] = int(output[0]["value"][1])
        return values
    except ClientRuntimeError:
        logging.exception(
            f"Failed to fetch foliage metrics from Prometheus for {network_name}."
        )
        return {}


async def analyze_alignment(
    network_names: Collection[str],
    start_time_ms: int,
    threshold_misalign_degree: int,
    threshold_tx_rx_degree_diff: int,
) -> None:
    coros = []
    metrics = ["tx_beam_idx", "rx_beam_idx"]

    for network_name in network_names:
        coros.append(fetch_beam_index(network_name, metrics, int(start_time_ms / 1e3)))

    node_alignment_stats: Dict = {}
    network_stats = zip(network_names, await asyncio.gather(*coros))
    for network_name, stats in network_stats:
        tx_beam_idx_stats = stats.get("tx_beam_idx")
        rx_beam_idx_stats = stats.get("rx_beam_idx")

        if (tx_beam_idx_stats is None) or (rx_beam_idx_stats is None):
            node_alignment_stats[network_name] = {}
            continue

        values: defaultdict = defaultdict(dict)
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
                values[link][key] = {
                    "tx_beam_idx": value,
                    "rx_beam_idx": rx_idx,
                    "tx_degree": index2deg(int(value)),
                    "rx_degree": index2deg(int(rx_idx)),
                    "node_alignment_status": "TX_RX_HEALTHY",
                }

            if (
                abs(values[link][key]["tx_degree"]) > threshold_misalign_degree
                or abs(values[link][key]["rx_degree"]) > threshold_misalign_degree
            ):
                values[link][key]["node_alignment_status"] = "LARGE_ANGLE"
            if (
                abs(values[link][key]["tx_degree"])
                - abs(values[link][key]["rx_degree"])
                > threshold_tx_rx_degree_diff
            ):
                values[link][key]["node_alignment_status"] = "TX_RX_DIFF"

        node_alignment_stats[network_name] = values


async def fetch_beam_index(
    network_name: str,
    metrics: List[str],
    start_time_ms: int,
    sample_period: int = 300,
    hold_period: int = 30,
) -> Dict:
    """Fetch latest metrics for all links in the network"""
    client = PrometheusClient(timeout=2)
    coros = []
    for metric in metrics:
        coros.append(
            client.query_range(
                client.format_query(metric, {"network": network_name}),
                step=f"{hold_period}s",
                start=start_time_ms - sample_period,
                end=start_time_ms,
            )
        )

    try:
        values: Dict = {}
        for metric, response in zip(metrics, await asyncio.gather(*coros)):
            if response["status"] != "success":
                logging.error(f"Failed to fetch {metric} data for {network_name}")
                continue
            output = response["data"]["result"]
            if not output:
                logging.debug(f"Found no {metric} results for {network_name}")
                continue
            results: defaultdict = defaultdict(dict)
            for val in output:
                results[val["metric"][consts.link_name]][
                    (
                        val["metric"][consts.link_direction],
                        val["metric"][consts.node_name],
                    )
                ] = val["values"][-1][1]

            values[metric] = results
        return values
    except ClientRuntimeError:
        logging.exception("Failed to fetch beam index stats from Prometheus.")
        return {}
