#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import logging
from collections import defaultdict
from typing import DefaultDict, Dict, Iterable, List, Optional, Tuple

from terragraph_thrift.Controller.ttypes import ScanFwStatus, ScanMode

from .db import fetch_aggregated_responses
from .hardware_config import HardwareConfig


def average_rx_responses(stats: DefaultDict) -> DefaultDict:
    """Average IM scan response from all RX nodes."""
    averaged_stats: DefaultDict = defaultdict(
        lambda: defaultdict(lambda: defaultdict(float))
    )
    for rx_node, data in stats.items():
        for key in data:
            averaged_stats[rx_node][key]["snr_avg"] = (
                stats[rx_node][key]["snr_sum"] / stats[rx_node][key]["count"]
            )
    return averaged_stats


def aggregate_all_responses(
    previous_rx_responses: Iterable, current_stats: Dict
) -> DefaultDict:
    """Aggregate all current and previous IM scan responses from all RX nodes."""
    aggregated_stats: DefaultDict = defaultdict(
        lambda: defaultdict(lambda: defaultdict(float))
    )

    for row in previous_rx_responses:
        for key, stat in row.stats.items():
            aggregated_stats[row.rx_node][key]["count"] += stat["count"]
            aggregated_stats[row.rx_node][key]["snr_sum"] += stat["snr_sum"]

    for rx_node, data in current_stats.items():
        for key, stat in data.items():
            aggregated_stats[rx_node][key]["count"] += stat["count"]
            aggregated_stats[rx_node][key]["snr_sum"] += stat["snr_sum"]

    return aggregated_stats


def aggregate_current_responses(
    responses: Dict, tx_node: str
) -> Tuple[DefaultDict, List]:
    """Aggregate IM scan response from all RX nodes."""
    to_db = []
    current_stats: DefaultDict = defaultdict(
        lambda: defaultdict(lambda: defaultdict(float))
    )

    tx_pwr_index = responses.get(tx_node, {}).get("txPwrIndex")
    for rx_node, rx_response in responses.items():
        # Compatible with the 2018 tg scan status json format
        if rx_response["status"] != ScanFwStatus.COMPLETE:
            continue

        if tx_pwr_index is None:
            continue

        # Scale all measurements to max tx power index
        offset = HardwareConfig.get_pwr_offset(ref_pwr_idx=tx_pwr_index)
        for measurement in rx_response["routeInfoList"]:
            key = f"{measurement['route']['tx']}_{measurement['route']['rx']}"
            current_stats[rx_node][key]["count"] += 1
            current_stats[rx_node][key]["snr_sum"] += measurement["snrEst"] + offset

        if current_stats[rx_node]:
            to_db.append(
                {
                    "tx_node": tx_node,
                    "rx_node": rx_node,
                    "stats": current_stats[rx_node],
                }
            )

    return current_stats, to_db


async def get_im_data(scan: Dict, network_name: str, n_days: int) -> Optional[Dict]:
    """Aggregate IM scan data for a TX node."""
    tx_node = scan["txNode"]
    logging.info(
        f"Aggregating IM scan response for tx node {tx_node}, "
        f"groupId {scan['groupId']}, scan mode {scan['mode']}"
    )
    # Skip if response from tx_node is not present
    if tx_node not in scan["responses"]:
        logging.info(f"No txNode in scan responses for groupId {scan['groupId']}")
        return None
    # Skip if response from tx_node is not complete
    tx_res = scan["responses"][tx_node]
    if tx_res["status"] != ScanFwStatus.COMPLETE:
        logging.error(
            f"Scan is not COMPLETE for tx node {tx_node}, token {tx_res['token']}"
        )
        return None

    # Aggregate rx responses over repeated measurements
    current_stats, to_db = aggregate_current_responses(scan["responses"], tx_node)

    # Average rx responses
    current_avg_rx_responses = average_rx_responses(current_stats)
    n_day_avg_rx_responses: DefaultDict = defaultdict()
    if scan["mode"] == ScanMode.RELATIVE:
        to_db.clear()
        for rx_node, data in current_avg_rx_responses.items():
            data["relative_im_beams"] = {
                beam["addr"]: beam["beam"]
                for beam in scan["responses"][rx_node].get("beamInfoList", {})
            }
    elif scan["mode"] == ScanMode.FINE or scan["mode"] == ScanMode.COARSE:
        prev_responses = await fetch_aggregated_responses(network_name, tx_node, n_days)
        aggregated_stats = aggregate_all_responses(prev_responses, current_stats)
        n_day_avg_rx_responses = average_rx_responses(aggregated_stats)

    return {
        "tx_node": tx_node,
        "group_id": scan.get("groupId"),
        "token": tx_res["token"],
        "type": scan["type"],
        "mode": scan["mode"],
        "cur_superframe_num": tx_res["curSuperframeNum"],
        "tx_pwr_idx": tx_res.get("txPwrIndex", 0),
        "start_bwgd_idx": scan["startBwgdIdx"],
        "relative_im_beams": {
            beam["addr"]: beam["beam"] for beam in tx_res.get("beamInfoList", {})
        },
        "current_avg_rx_responses": current_avg_rx_responses,
        "n_day_avg_rx_responses": n_day_avg_rx_responses,
        "rx_nodes": scan.get("rxNodes"),
        "curr_aggregated_responses": to_db,
    }
