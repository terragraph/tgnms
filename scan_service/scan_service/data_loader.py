#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import logging
from typing import Dict, Optional

from terragraph_thrift.Controller.ttypes import ScanFwStatus, ScanType


def aggregate_rx_responses(responses: Dict) -> Dict:
    """Aggregate IM scan response from an RX node."""

    aggregated_responses = {}
    for rx_node, rx_response in responses.items():
        aggregate: Dict = {}
        counts: Dict = {}
        # compatible with the 2018 tg scan status json format
        if rx_response["status"] != ScanFwStatus.COMPLETE:
            continue

        for measurement in rx_response["routeInfoList"]:
            key = f"{measurement['route']['tx']}_{measurement['route']['rx']}"
            if key in aggregate:
                counts[key] += 1
                aggregate[key]["rssi"] += measurement["rssi"]
                aggregate[key]["snr_est"] += measurement["snrEst"]
                aggregate[key]["post_snr"] += measurement["postSnr"]
            else:
                counts[key] = 1
                aggregate[key] = {
                    "rssi": measurement["rssi"],
                    "snr_est": measurement["snrEst"],
                    "post_snr": measurement["postSnr"],
                }

        # Average routes
        for key in aggregate:
            aggregate[key]["rssi"] /= counts[key]
            aggregate[key]["snr_est"] /= counts[key]
            aggregate[key]["post_snr"] /= counts[key]
        logging.debug(f"Response length for rx node {rx_node} is {len(aggregate)}")
        if len(aggregate) > 0:
            aggregate["relative_im_beams"] = {
                beam["addr"]: beam["beam"]
                for beam in rx_response.get("beamInfoList", {})
            }
            aggregated_responses[rx_node] = aggregate
    return aggregated_responses


def get_im_data(scan: Dict) -> Optional[Dict]:
    """Aggregate IM scan data for a TX node."""

    # skip if not IM scan
    if scan["type"] != ScanType.IM:
        logging.info(
            f"Scan type is {scan['type']}, not IM, for groupId {scan['groupId']}"
        )
        return None
    tx_node = scan["txNode"]

    logging.info(f"Analyzing response for tx node {tx_node}, groupId {scan['groupId']}")
    # skip if response from tx_node is not present
    if tx_node not in scan["responses"]:
        logging.info(f"No txNode in scan responses for groupId {scan['groupId']}")
        return None
    # skip if response from tx_node is not complete
    tx_res = scan["responses"][tx_node]
    if tx_res["status"] != ScanFwStatus.COMPLETE:
        logging.error(
            f"Scan is not COMPLETE for tx node {tx_node}, token {tx_res['token']}"
        )
        return None

    # aggregating data (for repeated measurements)
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
        "responses": aggregate_rx_responses(scan["responses"]),
        "rx_nodes": scan.get("rxNodes"),
    }
