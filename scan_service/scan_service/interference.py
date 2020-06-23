#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import asyncio
import logging
from typing import Dict, List, Optional, Tuple

import numpy as np
from terragraph_thrift.Controller.ttypes import ScanMode

from .utils.stats import create_link_mac_map, get_latest_stats


# rule: 1:1 when index from 0 to 22; 1:0.5 when beyond 22
CUT_OFF_IDX = 22
MAX_PWR_IDX = 21
# minimum reporeted RSSI in dBm
MINIMUM_RSSI_DBM = -80
BEAM_GRAN_DEG = 1.5


def index2deg(idx: int, round_digit: int = 2) -> float:
    """Convert index to angle w.r.t. broadside."""
    return (
        round(-idx * 45.0 / 31, round_digit)
        if (idx < 32)
        else round((idx - 31) * 45.0 / 32, round_digit)
    )


def deg2index(angle: float) -> int:
    """Convert angle to index w.r.t. broadside."""
    return (
        int(round(angle * 32.0 / 45)) + 31
        if angle > 0
        else int(round(-angle * 31.0 / 45))
    )


def estimate_interference(
    data: Dict, target_pwr_idx: int = MAX_PWR_IDX, ref_pwr_idx: int = MAX_PWR_IDX
) -> Dict:
    """Estimate inr on target power index, given inr at reference power index."""
    estimate: Dict = {}
    if target_pwr_idx == ref_pwr_idx:
        offset = 0
    else:
        # rule: 1:1 when index from 0 to 22; 1:0.5 when beyond 22
        target_diff = float(target_pwr_idx - CUT_OFF_IDX)
        if target_diff > 0:
            target_diff /= 2
        ref_diff = float(ref_pwr_idx - CUT_OFF_IDX)
        if ref_diff > 0:
            ref_diff /= 2
        offset = round(target_diff - ref_diff)
    if data["rssi"] + offset > MINIMUM_RSSI_DBM:
        estimate = {
            "rssi": data["rssi"] + offset,
            "snr_est": data["snr_est"] + offset,
            "post_snr": data["post_snr"] + offset,
        }
    return estimate


def get_interference_data(
    response: Dict[str, Dict], tx_beam: int, rx_beam: int, use_exact_beam: bool = False
) -> Optional[Dict]:
    """Get the INR measurement given a particular tx and rx beam index."""
    tx_idx_left = deg2index(index2deg(tx_beam) - BEAM_GRAN_DEG)
    tx_idx_right = deg2index(index2deg(tx_beam) + BEAM_GRAN_DEG)
    rx_idx_left = deg2index(index2deg(rx_beam) - BEAM_GRAN_DEG)
    rx_idx_right = deg2index(index2deg(rx_beam) + BEAM_GRAN_DEG)
    key = f"{tx_beam}_{rx_beam}"
    key_up = f"{tx_beam}_{rx_idx_left}"
    key_down = f"{tx_beam}_{rx_idx_right}"
    key_left = f"{tx_idx_left}_{rx_beam}"
    key_right = f"{tx_idx_right}_{rx_beam}"
    if key in response:
        return response[key]
    if not use_exact_beam:
        for key in [key_left, key_right, key_up, key_down]:
            if key in response:
                return response[key]
    logging.debug(f"No measurements at tx_beam {tx_beam} and rx_beam {rx_beam}")
    return None


def get_inr(
    rx_response: Dict,
    tx_beam: str,
    rx_beam: str,
    scan_power_idx: int,
    curr_power_idx: Optional[int],
) -> Optional[Tuple[Dict, Dict]]:
    """Get INR at tx and rx beam pair with max and current power."""
    # get the interference measurement of the tx-rx pair
    inr = get_interference_data(rx_response, int(tx_beam), int(rx_beam))
    if inr is None:
        return None

    # if not using max power for scans, we will
    # adjust the results to estimate what it looks like when
    # using max txPowerIdx (for APPROXIMATION only)
    if scan_power_idx == MAX_PWR_IDX:
        inr_max = inr
    else:
        logging.debug(
            "IM scan was not done with max power, "
            f"mapping from power index {scan_power_idx} to max power"
        )
        inr_max = estimate_interference(
            inr, target_pwr_idx=MAX_PWR_IDX, ref_pwr_idx=scan_power_idx
        )

    # estimate inr with current power
    inr_curr = (
        estimate_interference(
            inr, target_pwr_idx=curr_power_idx, ref_pwr_idx=scan_power_idx
        )
        if curr_power_idx is not None
        else {}
    )

    return inr_curr, inr_max


async def get_interference_from_current_beams(
    im_data: Dict, network_name: str, link_mac_map: Dict
) -> List[Dict]:
    """Process relative IM scan data and compute interference with current beams."""
    result: List = []
    tx_node = im_data["tx_node"]
    logging.info(f"Analyzing interference for {tx_node}")
    token = im_data["token"]
    scan_power_idx = im_data["tx_pwr_idx"]

    tx_infos = await get_latest_stats(network_name, link_mac_map, tx_node, ["tx_power"])

    for rx_node in im_data["responses"]:
        if rx_node == tx_node:
            continue
        logging.info(f"Analyzing interference from {tx_node} to {rx_node}")

        # loop through tx_beam and rx_beam combinations
        for tx_to_node, tx_beam in im_data["relative_im_beams"].items():
            # skip if it's an actual link
            if rx_node == tx_to_node:
                continue
            curr_power_idx = tx_infos.get(tx_to_node, {}).get("tx_power")
            if curr_power_idx is not None:
                curr_power_idx = int(curr_power_idx)
            for rx_from_node, rx_beam in im_data["responses"][rx_node][
                "relative_im_beams"
            ].items():
                # skip if it's an actual link
                if rx_from_node == tx_node:
                    continue
                logging.debug(
                    f"TX to {tx_to_node} from {tx_node} uses tx_beam {tx_beam} and "
                    f"tx_power {curr_power_idx}"
                )
                logging.debug(
                    f"RX for {rx_node} from {rx_from_node} uses rx_beam {rx_beam}"
                )

                inr = get_inr(
                    im_data["responses"][rx_node],
                    tx_beam,
                    rx_beam,
                    scan_power_idx,
                    curr_power_idx,
                )
                if not inr:
                    continue
                inr_curr_power, inr_max_power = inr
                result.append(
                    {
                        "group_id": im_data["group_id"],
                        "token": token,
                        "tx_node": tx_node,
                        "tx_to_node": tx_to_node,
                        "tx_power_idx": curr_power_idx,
                        "rx_node": rx_node,
                        "rx_from_node": rx_from_node,
                        "inr_curr_power": inr_curr_power,
                        "inr_max_power": inr_max_power,
                    }
                )
    logging.info(f"{tx_node} causes interference to {len(result)} other nodes")

    return result


async def get_interference_from_directional_beams(
    im_data: Dict, network_name: str, link_mac_map: Dict
) -> List[Dict]:
    """Process fine/coarse IM scan data and compute interference for directional beams."""

    result: List = []
    tx_node = im_data["tx_node"]
    logging.info(f"Analyzing interference for {tx_node}")
    token = im_data["token"]
    scan_power_idx = im_data["tx_pwr_idx"]

    tx_infos = await get_latest_stats(
        network_name, link_mac_map, tx_node, ["tx_beam_idx", "tx_power"]
    )
    coros = []
    rx_nodes = []
    for rx_node in im_data["responses"]:
        # skip if they are the same
        if tx_node == rx_node:
            continue
        logging.info(f"Analyzing interference from {tx_node} to {rx_node}")
        rx_nodes.append(rx_node)
        coros.append(
            get_latest_stats(network_name, link_mac_map, rx_node, ["rx_beam_idx"])
        )
    for rx_node, rx_infos in zip(rx_nodes, await asyncio.gather(*coros)):
        # loop through tx_beam and rx_beam combinations
        for tx_to_node, tx_info in tx_infos.items():
            # skip if it's an actual link
            if rx_node == tx_to_node:
                continue
            tx_beam = tx_info.get("tx_beam_idx")
            if tx_beam is None:
                continue
            curr_power_idx = tx_info.get("tx_power")
            if curr_power_idx is not None:
                curr_power_idx = int(curr_power_idx)
            for rx_from_node, rx_info in rx_infos.items():
                # skip if it's an actual link
                if rx_from_node == tx_node:
                    continue
                rx_beam = rx_info.get("rx_beam_idx")
                if rx_beam is None:
                    continue
                logging.debug(
                    f"TX to {tx_to_node} from {tx_node} uses tx_beam {tx_beam} and "
                    f"tx_power {curr_power_idx}"
                )
                logging.debug(
                    f"RX for {rx_node} from {rx_from_node} uses rx_beam {rx_beam}"
                )

                inr = get_inr(
                    im_data["responses"][rx_node],
                    tx_beam,
                    rx_beam,
                    scan_power_idx,
                    curr_power_idx,
                )
                if not inr:
                    continue
                inr_curr_power, inr_max_power = inr
                result.append(
                    {
                        "group_id": im_data["group_id"],
                        "token": token,
                        "tx_node": tx_node,
                        "tx_to_node": tx_to_node,
                        "tx_power_idx": curr_power_idx,
                        "rx_node": rx_node,
                        "rx_from_node": rx_from_node,
                        "inr_curr_power": inr_curr_power,
                        "inr_max_power": inr_max_power,
                    }
                )
    logging.info(f"{tx_node} causes interference to {len(result)} other nodes")

    return result


async def analyze_interference(
    im_data: Optional[Dict], network_name: str
) -> Optional[List[Dict]]:
    """Derive interference based on current topology."""
    if im_data is None:
        return None

    link_mac_map = await create_link_mac_map(network_name)
    if link_mac_map is None:
        return None

    if im_data["mode"] == ScanMode.RELATIVE:
        return await get_interference_from_current_beams(
            im_data, network_name, link_mac_map
        )
    elif im_data["mode"] == ScanMode.FINE or im_data["mode"] == ScanMode.COARSE:
        return await get_interference_from_directional_beams(
            im_data, network_name, link_mac_map
        )
    logging.info(f"Unsupported ScanMode {im_data['mode']} for interference analysis")
    return None
