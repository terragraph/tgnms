#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import logging
from collections import defaultdict
from typing import DefaultDict, Dict, List, Optional, Set

import numpy as np
from terragraph_thrift.Controller.ttypes import ScanMode

from ..utils.hardware_config import HardwareConfig
from ..utils.topology import Topology


def process_connectivity_results(connectivity_results: List[Dict]) -> Dict:
    if not connectivity_results:
        return {}

    conn_current_scan: DefaultDict = defaultdict(list)
    conn_n_days_scan: DefaultDict = defaultdict(list)
    for results in connectivity_results:
        network_name = results["network_name"]
        tx_node = results["tx_node"]
        rx_node = results["rx_node"]

        if (tx_node, rx_node) not in Topology.mac_to_link_name[network_name]:
            continue
        link_name = Topology.mac_to_link_name[network_name][(tx_node, rx_node)]

        max_snr = 0
        max_route = []
        for data in results["routes"]:
            _, _, snr = data
            if snr > max_snr:
                max_snr = snr
                max_route = data

        if results["is_n_day_avg"]:
            conn_n_days_scan[link_name].append(
                {"tx_node": tx_node, "rx_node": rx_node, "max_snr_route": max_route}
            )
        else:
            conn_current_scan[link_name].append(
                {"tx_node": tx_node, "rx_node": rx_node, "max_snr_route": max_route}
            )

    return {"current": conn_current_scan, "n_day_avg": conn_n_days_scan}


def find_routes_compute(
    beam_map: np.array, saturation_threshhold: int, target: int
) -> List:
    """Find a list of beam index pairs above target between the TX and RX node."""
    routes = []
    current_max = np.int(beam_map.max())
    beam_map_size = beam_map.shape
    while current_max >= target:
        idx_max = np.unravel_index(beam_map.argmax(), beam_map_size)
        routes.append((idx_max[0], idx_max[1], current_max))
        # Clear up map for finished cross
        tx_left = max([idx_max[0] - int(HardwareConfig.BORESIDE_BW_IDX / 2), 0])
        tx_right = min(
            [idx_max[0] + int(HardwareConfig.BORESIDE_BW_IDX / 2), beam_map_size[0] - 1]
        )
        rx_left = max([idx_max[1] - int(HardwareConfig.BORESIDE_BW_IDX / 2), 0])
        rx_right = min(
            [idx_max[1] + int(HardwareConfig.BORESIDE_BW_IDX / 2), beam_map_size[1] - 1]
        )

        # Check if saturated
        is_saturated = current_max > saturation_threshhold
        for i in range(tx_left, tx_right + 1):
            for j in range(beam_map_size[1]):
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
            for i in range(beam_map_size[0]):
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

    # Keep one route if multiple routes have similar beam indices
    # Run here for each tx-rx dimension combination separately
    separate_beams(routes)
    return routes


def separate_beams(routes: List) -> None:
    """Filter one route for multiple routes with similar beam indices."""
    idx_remove: Set = set()
    for i in range(len(routes) - 1, -1, -1):
        for j in range(len(routes) - 1, i, -1):
            diff_tx = abs(routes[i][0] - routes[j][0])
            diff_rx = abs(routes[i][1] - routes[j][1])
            if (
                diff_tx < HardwareConfig.BEAM_SEPERATE_IDX
                or diff_rx < HardwareConfig.BEAM_SEPERATE_IDX
            ):
                idx_remove.add(j if routes[i][2] > routes[j][2] else i)

    for i in range(len(routes) - 1, -1, -1):
        if i in idx_remove:
            del routes[i]


def convert_order_to_beams(
    routes_order: List, tx_beam_order: List, rx_beam_order: List
) -> List:
    return [
        (tx_beam_order[route[0]], rx_beam_order[route[1]], route[2])
        for route in routes_order
    ]


def find_routes(
    im_data: Dict, tx_beam_order: List, rx_beam_order: List, target: int
) -> List:
    beam_map = np.array([[0] * len(rx_beam_order)] * len(tx_beam_order))
    for i in range(len(tx_beam_order)):
        for j in range(len(rx_beam_order)):
            tx_rx = f"{tx_beam_order[i]}_{rx_beam_order[j]}"
            beam_map[i][j] = (
                im_data[tx_rx]["snr_avg"]
                if tx_rx in im_data
                else HardwareConfig.MINIMUM_SNR_DB
            )

    routes = convert_order_to_beams(
        find_routes_compute(beam_map, HardwareConfig.SNR_SATURATE_THRESH_DB, target),
        tx_beam_order,
        rx_beam_order,
    )
    return routes


def find_routes_all(im_data: Dict, target: int) -> List:
    """Get list of beam index pairs above target SNR between TX and RX node."""
    routes_all: List = []
    for tx_tile, tx_elevation_data in HardwareConfig.BEAM_ORDER.items():
        for tx_elevation, tx_beam_order in tx_elevation_data.items():
            for rx_tile, rx_elevation_data in HardwareConfig.BEAM_ORDER.items():
                for rx_elevation, rx_beam_order in rx_elevation_data.items():
                    logging.info(
                        f"Analyzing routes between tx tile {tx_tile} and elevation "
                        f"{tx_elevation} and rx tile {rx_tile} and elevation {rx_elevation}"
                    )
                    routes_all += find_routes(
                        im_data, tx_beam_order, rx_beam_order, target
                    )
    return routes_all


def get_connectivity_data(im_data: Dict, target: int, is_n_day_avg: bool) -> List[Dict]:
    network_name = im_data["network_name"]
    tx_node = im_data["tx_node"]
    result: List = []
    rx_responses = (
        im_data["n_day_avg_rx_responses"]
        if is_n_day_avg
        else im_data["current_avg_rx_responses"]
    )

    for rx_node in rx_responses:
        logging.info(f"Analyzing connectivity between {tx_node} to {rx_node}")

        # Skip if they map to the same site
        tx_site_name = Topology.wlan_mac_to_site_name.get(network_name, {}).get(tx_node)
        rx_site_name = Topology.wlan_mac_to_site_name.get(network_name, {}).get(rx_node)
        if tx_site_name is not None and rx_site_name is not None:
            if tx_site_name == rx_site_name:
                logging.debug(
                    f"{tx_node} and {rx_node} are radios on the same site."
                    "Skipping connectivity analysis."
                )
                continue
        else:
            logging.debug(f"Ignoring missing site name for {tx_node} &/or {rx_node}.")

        routes = find_routes_all(rx_responses[rx_node], target)
        logging.info(f"No. of routes between {tx_node} and {rx_node} are {len(routes)}")
        if not routes:
            continue

        result.append(
            {
                "group_id": im_data.get("group_id"),
                "token": im_data.get("token"),
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
