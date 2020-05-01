#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import logging
from typing import Dict, List, Set

import numpy as np


# beamwidth of the broadside beam (in terms of index)
BORESIDE_BW_IDX = 10
# minimum reporeted RSSI in dBm
MINIMUM_RSSI_DBM = -80
# minimum reporeted SNR in dB
MINIMUM_SNR_DB = -10
# threshold to judge if RSSI is saturated
RSSI_SATURATE_THRESH_DBM = -40
# threshold to judge if SNR is saturated
SNR_SATURATE_THRESH_DB = 25
# how far two identified routes should be (in idx)
BEAM_SEPERATE_IDX = 6
# maximum expected sidelobe level
MAX_SIDELOBE_LEVEL_DB = 12
# max beam index
MAX_BEAM_INDEX = 64
# min beam index
MIN_BEAM_INDEX = 0
# beam order
BEAM_ORDER = [
    31,
    30,
    29,
    28,
    27,
    26,
    25,
    24,
    23,
    22,
    21,
    20,
    19,
    18,
    17,
    16,
    15,
    14,
    13,
    12,
    11,
    10,
    9,
    8,
    7,
    6,
    5,
    4,
    3,
    2,
    1,
    0,
    32,
    33,
    34,
    35,
    36,
    37,
    38,
    39,
    40,
    41,
    42,
    43,
    44,
    45,
    46,
    47,
    48,
    49,
    50,
    51,
    52,
    53,
    54,
    55,
    56,
    57,
    58,
    59,
    60,
    61,
    62,
    63,
]


def find_routes_compute(
    beam_map: np.array, saturation_threshhold: int, target: int
) -> List:
    """Find a list of beam index pairs above target between the TX and RX node."""

    routes = []
    current_max = np.int(beam_map.max())
    while current_max >= target:
        idx_max = np.unravel_index(beam_map.argmax(), beam_map.shape)
        routes.append((BEAM_ORDER[idx_max[0]], BEAM_ORDER[idx_max[1]], current_max))
        # clear up map for finished cross
        tx_left = max([idx_max[0] - int(BORESIDE_BW_IDX / 2), MIN_BEAM_INDEX])
        tx_right = min([idx_max[0] + int(BORESIDE_BW_IDX / 2), MAX_BEAM_INDEX - 1])
        rx_left = max([idx_max[1] - int(BORESIDE_BW_IDX / 2), MIN_BEAM_INDEX])
        rx_right = min([idx_max[1] + int(BORESIDE_BW_IDX / 2), MAX_BEAM_INDEX - 1])

        # check if saturated
        is_saturated = current_max > saturation_threshhold
        for i in range(tx_left, tx_right + 1):
            for j in range(MIN_BEAM_INDEX, MAX_BEAM_INDEX):
                # check if sidelobe less than 12dB (+-1dB variation),
                # or is saturated, or map idx for rx is on the left/right
                if (
                    is_saturated
                    or (beam_map[i, j] < current_max - MAX_SIDELOBE_LEVEL_DB)
                    or (rx_left <= j <= rx_right)
                ):
                    beam_map[i, j] = target - 1
        for j in range(rx_left, rx_right + 1):
            for i in range(MIN_BEAM_INDEX, MAX_BEAM_INDEX):
                # check if sidelobe less than 12dB (+-1dB variation),
                # or is saturated, or map idx for rx is on the left/right
                if (
                    is_saturated
                    or (beam_map[i, j] < current_max - MAX_SIDELOBE_LEVEL_DB)
                    or (rx_left <= j <= rx_right)
                ):
                    beam_map[i, j] = target - 1
        current_max = np.int(beam_map.max())
    return routes


def separate_beams(routes: List) -> None:
    """Keep one route if multiple routes have similar beam indices and
    remove the rest."""

    idx_remove: Set = set()
    for i in range(len(routes) - 1, -1, -1):
        for j in range(len(routes) - 1, i, -1):
            diff_tx = abs(BEAM_ORDER[routes[i][0]] - BEAM_ORDER[routes[j][0]])
            diff_rx = abs(BEAM_ORDER[routes[i][1]] - BEAM_ORDER[routes[j][1]])
            if diff_tx < BEAM_SEPERATE_IDX or diff_rx < BEAM_SEPERATE_IDX:
                idx_remove.add(j if routes[i][2] > routes[j][2] else i)

    for i in range(len(routes) - 1, -1, -1):
        if i in idx_remove:
            del routes[i]


def find_routes(im_data: Dict, target: int, use_rssi: bool) -> List:
    """Find a list of beam index pairs above target RSSI/SNR between the TX and RX node."""

    beam_map = np.array([[0] * MAX_BEAM_INDEX] * MAX_BEAM_INDEX)
    saturation_threshhold = (
        RSSI_SATURATE_THRESH_DBM if use_rssi else SNR_SATURATE_THRESH_DB
    )
    for i in range(MIN_BEAM_INDEX, MAX_BEAM_INDEX):
        for j in range(MIN_BEAM_INDEX, MAX_BEAM_INDEX):
            tx_rx = f"{BEAM_ORDER[i]}_{BEAM_ORDER[j]}"

            if use_rssi:
                beam_map[i][j] = (
                    im_data[tx_rx]["rssi"] if tx_rx in im_data else MINIMUM_RSSI_DBM
                )
            else:
                beam_map[i][j] = (
                    im_data[tx_rx]["snr_est"] if tx_rx in im_data else MINIMUM_SNR_DB
                )

    routes = find_routes_compute(beam_map, saturation_threshhold, target)
    # keep one route if multiple routes have similar beam indices
    separate_beams(routes)
    return routes


def analyze_connectivity(
    im_data: Dict, network_name: str, target: int = 15, use_rssi: bool = False
) -> List[Dict]:
    """Analyze connectivity for a TX node based on IM scan data."""

    result: List = []
    tx_node = im_data["tx_node"]
    logging.info(
        f"Analyzing connectivity graph for {tx_node} with target SNR = {target}dB"
    )
    for rx_node in im_data["responses"]:
        routes = find_routes(im_data["responses"][rx_node], target, use_rssi)
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
