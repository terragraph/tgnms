#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import os
import sys
from copy import deepcopy
from typing import Dict, List


class Scan:
    def __init__(self, scan_resp: Dict) -> None:
        self.token = scan_resp["token"]
        # group id was recently added, may not be in every db entry yet so return None as default
        self.group_id = scan_resp.get("group_id", None)
        self.tx_node_name = scan_resp["tx_node_name"]
        self.timestamp = scan_resp["timestamp"]
        self.tx_power = scan_resp["tx_power"]
        self.tx_resp = scan_resp["scan_resp"]
        self.n_responses_waiting = scan_resp["n_responses_waiting"]
        self.tx_status = scan_resp["status"]
        self.scan_type = scan_resp["scan_type"]
        self.scan_sub_type = scan_resp["scan_sub_type"]
        self.scan_mode = scan_resp["scan_mode"]
        self.start_bwgd = scan_resp["start_bwgd"]
        self.network = scan_resp["network"]
        self.rx_responses = []

        self.add_rx_response(scan_resp)

    def add_rx_response(self, scan_resp: Dict) -> None:
        self.rx_responses.append(
            {
                "rx_resp": scan_resp["rx_scan_resp"],
                "rx_node_name": scan_resp["rx_node_name"],
                "rx_status": scan_resp["rx_status"],
            }
        )


class ScanGroup:
    def __init__(self, scans: List[Scan]) -> None:
        self.scans = deepcopy(scans)

        self.id = scans[0].group_id
        self.network_name = scans[0].network
        self.start_bwgd = scans[0].start_bwgd
        self.end_bwgd = scans[-1].start_bwgd
        self.scan_type = scans[0].scan_type
        self.scan_sub_type = scans[0].scan_sub_type
        self.scan_mode = scans[0].scan_mode
