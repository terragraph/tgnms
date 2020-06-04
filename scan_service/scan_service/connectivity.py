#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import dataclasses
import logging
from typing import Dict, List, Optional, Set

import numpy as np
from terragraph_thrift.Controller.ttypes import ScanMode


@dataclasses.dataclass
class HardwareConfig:
    # beam order
    BEAM_ORDER: List[int]
    # beamwidth of the broadside beam (in terms of index)
    BORESIDE_BW_IDX: int
    # minimum reporeted RSSI in dBm
    MINIMUM_RSSI_DBM: int
    # minimum reporeted SNR in dB
    MINIMUM_SNR_DB: int
    # threshold to judge if RSSI is saturated
    RSSI_SATURATE_THRESH_DBM: int
    # threshold to judge if SNR is saturated
    SNR_SATURATE_THRESH_DB: int
    # how far two identified routes should be (in idx)
    BEAM_SEPERATE_IDX: int
    # maximum expected sidelobe level
    MAX_SIDELOBE_LEVEL_DB: int
    # max beam index
    MAX_BEAM_INDEX: int
    # min beam index
    MIN_BEAM_INDEX: int


def find_routes_compute(
    beam_map: np.array, saturation_threshhold: int, target: int, con: HardwareConfig
) -> List:
    """Find a list of beam index pairs above target between the TX and RX node."""

    routes = []
    current_max = np.int(beam_map.max())
    while current_max >= target:
        idx_max = np.unravel_index(beam_map.argmax(), beam_map.shape)
        routes.append(
            (con.BEAM_ORDER[idx_max[0]], con.BEAM_ORDER[idx_max[1]], current_max)
        )
        # clear up map for finished cross
        tx_left = max([idx_max[0] - int(con.BORESIDE_BW_IDX / 2), con.MIN_BEAM_INDEX])
        tx_right = min(
            [idx_max[0] + int(con.BORESIDE_BW_IDX / 2), con.MAX_BEAM_INDEX - 1]
        )
        rx_left = max([idx_max[1] - int(con.BORESIDE_BW_IDX / 2), con.MIN_BEAM_INDEX])
        rx_right = min(
            [idx_max[1] + int(con.BORESIDE_BW_IDX / 2), con.MAX_BEAM_INDEX - 1]
        )

        # check if saturated
        is_saturated = current_max > saturation_threshhold
        for i in range(tx_left, tx_right + 1):
            for j in range(con.MIN_BEAM_INDEX, con.MAX_BEAM_INDEX):
                # check if sidelobe less than 12dB (+-1dB variation),
                # or is saturated, or map idx for rx is on the left/right
                if (
                    is_saturated
                    or (beam_map[i, j] < current_max - con.MAX_SIDELOBE_LEVEL_DB)
                    or (rx_left <= j <= rx_right)
                ):
                    beam_map[i, j] = target - 1
        for j in range(rx_left, rx_right + 1):
            for i in range(con.MIN_BEAM_INDEX, con.MAX_BEAM_INDEX):
                # check if sidelobe less than 12dB (+-1dB variation),
                # or is saturated, or map idx for rx is on the left/right
                if (
                    is_saturated
                    or (beam_map[i, j] < current_max - con.MAX_SIDELOBE_LEVEL_DB)
                    or (rx_left <= j <= rx_right)
                ):
                    beam_map[i, j] = target - 1
        current_max = np.int(beam_map.max())
    return routes


def separate_beams(routes: List, con: HardwareConfig) -> None:
    """Keep one route if multiple routes have similar beam indices and
    remove the rest."""

    idx_remove: Set = set()
    for i in range(len(routes) - 1, -1, -1):
        for j in range(len(routes) - 1, i, -1):
            diff_tx = abs(con.BEAM_ORDER[routes[i][0]] - con.BEAM_ORDER[routes[j][0]])
            diff_rx = abs(con.BEAM_ORDER[routes[i][1]] - con.BEAM_ORDER[routes[j][1]])
            if diff_tx < con.BEAM_SEPERATE_IDX or diff_rx < con.BEAM_SEPERATE_IDX:
                idx_remove.add(j if routes[i][2] > routes[j][2] else i)

    for i in range(len(routes) - 1, -1, -1):
        if i in idx_remove:
            del routes[i]


def find_routes(
    im_data: Dict, target: int, use_rssi: bool, con: HardwareConfig
) -> List:
    """Find a list of beam index pairs above target RSSI/SNR between the TX and RX node."""

    beam_map = np.array([[0] * con.MAX_BEAM_INDEX] * con.MAX_BEAM_INDEX)
    saturation_threshhold = (
        con.RSSI_SATURATE_THRESH_DBM if use_rssi else con.SNR_SATURATE_THRESH_DB
    )
    for i in range(con.MIN_BEAM_INDEX, con.MAX_BEAM_INDEX):
        for j in range(con.MIN_BEAM_INDEX, con.MAX_BEAM_INDEX):
            tx_rx = f"{con.BEAM_ORDER[i]}_{con.BEAM_ORDER[j]}"

            if use_rssi:
                beam_map[i][j] = (
                    im_data[tx_rx]["rssi"] if tx_rx in im_data else con.MINIMUM_RSSI_DBM
                )
            else:
                beam_map[i][j] = (
                    im_data[tx_rx]["snr_est"]
                    if tx_rx in im_data
                    else con.MINIMUM_SNR_DB
                )

    routes = find_routes_compute(beam_map, saturation_threshhold, target, con)
    # keep one route if multiple routes have similar beam indices
    separate_beams(routes, con)
    return routes


def analyze_connectivity(
    im_data: Optional[Dict],
    network_name: str,
    con: HardwareConfig,
    target: int = 15,
    use_rssi: bool = False,
) -> Optional[List[Dict]]:
    """Analyze connectivity for a TX node based on IM scan data."""
    if im_data is None:
        return None

    if im_data["mode"] not in {ScanMode.FINE, ScanMode.COARSE}:
        logging.info(
            f"Unsupported ScanMode {im_data['mode']} for connectivity analysis"
        )
        return None

    result: List = []
    tx_node = im_data["tx_node"]
    logging.info(
        f"Analyzing connectivity graph for {tx_node} with target SNR = {target}dB"
    )
    for rx_node in im_data["responses"]:
        logging.info(f"Analyzing connectivity between {tx_node} to {rx_node}")
        routes = find_routes(im_data["responses"][rx_node], target, use_rssi, con)
        logging.info(f"No. of routes between {tx_node} and {rx_node} are {len(routes)}")
        if not routes:
            continue

        result.append(
            {
                "network_name": network_name,
                "group_id": im_data["group_id"],
                "token": im_data["token"],
                "tx_node": tx_node,
                "rx_node": rx_node,
                "routes": routes,
            }
        )
    logging.info(f"{tx_node} has routes to {len(result)} other nodes")
    return result
