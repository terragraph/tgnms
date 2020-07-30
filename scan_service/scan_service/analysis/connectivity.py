#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import logging
from typing import Dict, List, Optional, Set

import numpy as np
from terragraph_thrift.Controller.ttypes import ScanMode

from ..utils.hardware_config import HardwareConfig


def find_routes_compute(
    beam_map: np.array, saturation_threshhold: int, target: int
) -> List:
    """Find a list of beam index pairs above target between the TX and RX node."""
    routes = []
    current_max = np.int(beam_map.max())
    while current_max >= target:
        idx_max = np.unravel_index(beam_map.argmax(), beam_map.shape)
        routes.append(
            (
                HardwareConfig.BEAM_ORDER[idx_max[0]],
                HardwareConfig.BEAM_ORDER[idx_max[1]],
                current_max,
            )
        )
        # Clear up map for finished cross
        tx_left = max(
            [
                idx_max[0] - int(HardwareConfig.BORESIDE_BW_IDX / 2),
                HardwareConfig.MIN_BEAM_INDEX,
            ]
        )
        tx_right = min(
            [
                idx_max[0] + int(HardwareConfig.BORESIDE_BW_IDX / 2),
                HardwareConfig.MAX_BEAM_INDEX - 1,
            ]
        )
        rx_left = max(
            [
                idx_max[1] - int(HardwareConfig.BORESIDE_BW_IDX / 2),
                HardwareConfig.MIN_BEAM_INDEX,
            ]
        )
        rx_right = min(
            [
                idx_max[1] + int(HardwareConfig.BORESIDE_BW_IDX / 2),
                HardwareConfig.MAX_BEAM_INDEX - 1,
            ]
        )

        # Check if saturated
        is_saturated = current_max > saturation_threshhold
        for i in range(tx_left, tx_right + 1):
            for j in range(
                HardwareConfig.MIN_BEAM_INDEX, HardwareConfig.MAX_BEAM_INDEX
            ):
                # Check if sidelobe less than 12dB (+-1dB variation),
                # or is saturated, or map idx for rx is on the left/right
                if (
                    is_saturated
                    or (
                        beam_map[i, j]
                        < current_max - HardwareConfig.MAX_SIDELOBE_LEVEL_DB
                    )
                    or (rx_left <= j <= rx_right)
                ):
                    beam_map[i, j] = target - 1
        for j in range(rx_left, rx_right + 1):
            for i in range(
                HardwareConfig.MIN_BEAM_INDEX, HardwareConfig.MAX_BEAM_INDEX
            ):
                # Check if sidelobe less than 12dB (+-1dB variation),
                # or is saturated, or map idx for rx is on the left/right
                if (
                    is_saturated
                    or (
                        beam_map[i, j]
                        < current_max - HardwareConfig.MAX_SIDELOBE_LEVEL_DB
                    )
                    or (rx_left <= j <= rx_right)
                ):
                    beam_map[i, j] = target - 1
        current_max = np.int(beam_map.max())
    return routes


def separate_beams(routes: List) -> None:
    """Filter one route for multiple routes with similar beam indices."""
    idx_remove: Set = set()
    for i in range(len(routes) - 1, -1, -1):
        for j in range(len(routes) - 1, i, -1):
            diff_tx = abs(
                HardwareConfig.BEAM_ORDER[routes[i][0]]
                - HardwareConfig.BEAM_ORDER[routes[j][0]]
            )
            diff_rx = abs(
                HardwareConfig.BEAM_ORDER[routes[i][1]]
                - HardwareConfig.BEAM_ORDER[routes[j][1]]
            )
            if (
                diff_tx < HardwareConfig.BEAM_SEPERATE_IDX
                or diff_rx < HardwareConfig.BEAM_SEPERATE_IDX
            ):
                idx_remove.add(j if routes[i][2] > routes[j][2] else i)

    for i in range(len(routes) - 1, -1, -1):
        if i in idx_remove:
            del routes[i]


def find_routes(im_data: Dict, target: int) -> List:
    """Get list of beam index pairs above target SNR between TX and RX node."""
    beam_map = np.array(
        [[0] * HardwareConfig.MAX_BEAM_INDEX] * HardwareConfig.MAX_BEAM_INDEX
    )
    for i in range(HardwareConfig.MIN_BEAM_INDEX, HardwareConfig.MAX_BEAM_INDEX):
        for j in range(HardwareConfig.MIN_BEAM_INDEX, HardwareConfig.MAX_BEAM_INDEX):
            tx_rx = f"{HardwareConfig.BEAM_ORDER[i]}_{HardwareConfig.BEAM_ORDER[j]}"
            beam_map[i][j] = (
                im_data[tx_rx]["snr_avg"]
                if tx_rx in im_data
                else HardwareConfig.MINIMUM_SNR_DB
            )

    routes = find_routes_compute(
        beam_map, HardwareConfig.SNR_SATURATE_THRESH_DB, target
    )
    # Keep one route if multiple routes have similar beam indices
    separate_beams(routes)
    return routes


def get_connectivity_data(im_data: Dict, target: int, is_n_day_avg: bool) -> List[Dict]:
    tx_node = im_data["tx_node"]
    result: List = []
    rx_responses = (
        im_data["n_day_avg_rx_responses"]
        if is_n_day_avg
        else im_data["current_avg_rx_responses"]
    )

    for rx_node in rx_responses:
        logging.info(f"Analyzing connectivity between {tx_node} to {rx_node}")
        routes = find_routes(rx_responses[rx_node], target)
        logging.info(f"No. of routes between {tx_node} and {rx_node} are {len(routes)}")
        if not routes:
            continue

        result.append(
            {
                "group_id": im_data["group_id"],
                "token": im_data["token"],
                "tx_node": tx_node,
                "rx_node": rx_node,
                "routes": routes,
                "is_n_day_avg": is_n_day_avg,
            }
        )
    return result


def analyze_connectivity(
    im_data: Optional[Dict], n_days: int, target: int = 15
) -> Optional[List[Dict]]:
    """Analyze connectivity for a TX node based on IM scan data."""
    if im_data is None:
        return None

    if im_data["mode"] not in {ScanMode.FINE, ScanMode.COARSE}:
        logging.info(
            f"Unsupported ScanMode {im_data['mode']} for connectivity analysis"
        )
        return None

    tx_node = im_data["tx_node"]
    logging.info(
        f"Analyzing connectivity graph for {tx_node} with target SNR = {target}dB"
    )
    current_connectivity_data = get_connectivity_data(im_data, target, False)
    n_days_connectivity_data = get_connectivity_data(im_data, target, True)
    logging.info(
        f"{tx_node} has routes to {len(current_connectivity_data)} "
        "other nodes in the current scan."
    )
    logging.info(
        f"{tx_node} has routes to {len(n_days_connectivity_data)} "
        f"other nodes over scans from last {n_days} days."
    )
    return current_connectivity_data + n_days_connectivity_data
