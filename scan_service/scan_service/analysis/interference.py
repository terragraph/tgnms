#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import asyncio
import logging
from typing import Dict, List, Optional

from terragraph_thrift.Controller.ttypes import ScanMode

from ..utils.hardware_config import HardwareConfig
from ..utils.stats import get_channel, get_latest_stats
from ..utils.topology import Topology


def get_inr_offset(
    target_pwr_idx: Optional[int] = None,
    ref_pwr_idx: Optional[int] = None,
    channel: Optional[str] = None,
    mcs: Optional[str] = None,
) -> int:
    """Estimate inr offset on target power idx, given inr at reference power idx."""
    if target_pwr_idx is None:
        target_pwr_idx = HardwareConfig.MAX_PWR_IDX
    if ref_pwr_idx is None:
        ref_pwr_idx = HardwareConfig.MAX_PWR_IDX
    if channel is None or channel not in HardwareConfig.TXPOWERIDX_TO_TXPOWER:
        channel = "default_channel"
    if mcs is None or mcs not in HardwareConfig.TXPOWERIDX_TO_TXPOWER[channel]:
        mcs = "default_mcs"

    return round(
        HardwareConfig.TXPOWERIDX_TO_TXPOWER[channel][mcs][target_pwr_idx]
        - HardwareConfig.TXPOWERIDX_TO_TXPOWER[channel][mcs][ref_pwr_idx]
    )


def get_interference_data(
    response: Dict[str, Dict], tx_beam: int, rx_beam: int, use_exact_beam: bool = False
) -> Optional[Dict]:
    """Get the INR measurement given a particular tx and rx beam index."""
    tx_idx_left = HardwareConfig.get_adjacent_beam_index(tx_beam, add=False)
    tx_idx_right = HardwareConfig.get_adjacent_beam_index(tx_beam, add=True)
    rx_idx_left = HardwareConfig.get_adjacent_beam_index(rx_beam, add=False)
    rx_idx_right = HardwareConfig.get_adjacent_beam_index(rx_beam, add=True)

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


async def get_interference_from_current_beams(
    im_data: Dict, network_name: str, channel: Optional[str]
) -> List[Dict]:
    """Process relative IM scan data and compute interference with current beams."""
    result: List = []
    tx_node = im_data["tx_node"]
    logging.info(f"Analyzing interference for {tx_node}")
    token = im_data["token"]

    tx_infos = await get_latest_stats(network_name, tx_node, ["mcs", "tx_power"])

    for rx_node in im_data["current_avg_rx_responses"]:
        if rx_node == tx_node:
            continue
        logging.info(f"Analyzing interference from {tx_node} to {rx_node}")

        # Loop through tx_beam and rx_beam combinations
        for tx_to_node, tx_beam in im_data["relative_im_beams"].items():
            # Skip if it's an actual link
            if rx_node == tx_to_node:
                continue
            curr_power_idx = tx_infos.get(tx_to_node, {}).get("tx_power")
            if curr_power_idx is not None:
                curr_power_idx = int(curr_power_idx)
            for rx_from_node, rx_beam in im_data["current_avg_rx_responses"][rx_node][
                "relative_im_beams"
            ].items():
                # Skip if it's an actual link
                if rx_from_node == tx_node:
                    continue
                logging.debug(
                    f"TX to {tx_to_node} from {tx_node} uses tx_beam {tx_beam} and "
                    f"tx_power {curr_power_idx}"
                )
                logging.debug(
                    f"RX for {rx_node} from {rx_from_node} uses rx_beam {rx_beam}"
                )

                inr = get_interference_data(
                    im_data["current_avg_rx_responses"][rx_node],
                    int(tx_beam),
                    int(rx_beam),
                )
                if inr is None:
                    continue

                inr_curr_power = {}
                if curr_power_idx is not None:
                    curr_inr_offset = get_inr_offset(
                        target_pwr_idx=curr_power_idx,
                        channel=channel,
                        mcs=tx_infos.get(tx_to_node, {}).get("mcs"),
                    )
                    inr_curr_power = {"snr_est": inr["snr_avg"] + curr_inr_offset}

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
                        "inr_max_power": {"snr_avg": inr["snr_avg"]},
                        "is_n_day_avg": False,
                    }
                )
    logging.info(
        f"{tx_node} caused interference to {len(result)} other nodes "
        "in the current scan."
    )

    return result


async def get_interference_from_directional_beams(  # noqa: C901
    im_data: Dict,
    network_name: str,
    channel: Optional[str],
    n_days: int,
    is_n_day_avg: bool,
) -> List[Dict]:
    """Process fine/coarse IM scan data & compute interference for directional beams."""
    result: List = []
    tx_node = im_data["tx_node"]
    logging.info(f"Analyzing interference for {tx_node}")
    token = im_data["token"]
    rx_responses = (
        im_data["n_day_avg_rx_responses"]
        if is_n_day_avg
        else im_data["current_avg_rx_responses"]
    )

    tx_infos = await get_latest_stats(
        network_name, tx_node, ["mcs", "tx_beam_idx", "tx_power"]
    )

    coros = []
    rx_nodes = []
    for rx_node in rx_responses:
        # Skip if they are the same
        if tx_node == rx_node:
            continue
        logging.info(f"Analyzing interference from {tx_node} to {rx_node}")
        rx_nodes.append(rx_node)
        coros.append(get_latest_stats(network_name, rx_node, ["rx_beam_idx"]))

    for rx_node, rx_infos in zip(rx_nodes, await asyncio.gather(*coros)):
        # Loop through tx_beam and rx_beam combinations
        for tx_to_node, tx_info in tx_infos.items():
            # Skip if it's an actual link
            if rx_node == tx_to_node:
                continue
            tx_beam = tx_info.get("tx_beam_idx")
            if tx_beam is None:
                continue
            curr_power_idx = tx_info.get("tx_power")
            if curr_power_idx is not None:
                curr_power_idx = int(curr_power_idx)
            for rx_from_node, rx_info in rx_infos.items():
                # Skip if it's an actual link
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

                inr = get_interference_data(
                    rx_responses[rx_node], int(tx_beam), int(rx_beam)
                )
                if inr is None:
                    continue

                inr_curr_power = {}
                if curr_power_idx is not None:
                    curr_inr_offset = get_inr_offset(
                        target_pwr_idx=curr_power_idx,
                        channel=channel,
                        mcs=tx_info.get("mcs"),
                    )
                    inr_curr_power = {"snr_est": inr["snr_avg"] + curr_inr_offset}

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
                        "inr_max_power": {"snr_avg": inr["snr_avg"]},
                        "is_n_day_avg": is_n_day_avg,
                    }
                )
    logging.info(
        (
            f"{tx_node} caused interference to {len(result)} other nodes "
            f"over scans from last {n_days} days."
        )
        if is_n_day_avg
        else (
            f"{tx_node} caused interference to {len(result)} other nodes "
            "in the current scan."
        )
    )

    return result


async def analyze_interference(
    im_data: Optional[Dict], network_name: str, n_days: int
) -> Optional[List[Dict]]:
    """Derive interference based on current topology."""
    if im_data is None:
        return None

    channel: Optional[str] = await get_channel(
        network_name, Topology.node_mac_to_name[network_name].get(im_data["tx_node"])
    )

    if im_data["mode"] == ScanMode.RELATIVE:
        return await get_interference_from_current_beams(im_data, network_name, channel)
    elif im_data["mode"] == ScanMode.FINE or im_data["mode"] == ScanMode.COARSE:
        current_interference_data = await get_interference_from_directional_beams(
            im_data, network_name, channel, n_days, False
        )
        n_days_interference_data = await get_interference_from_directional_beams(
            im_data, network_name, channel, n_days, True
        )
        return current_interference_data + n_days_interference_data
    logging.info(f"Unsupported ScanMode {im_data['mode']} for interference analysis")
    return None
