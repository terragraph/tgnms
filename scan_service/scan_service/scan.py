#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

from collections import defaultdict
from copy import deepcopy
from typing import Any, Dict, List

from terragraph_thrift.Controller.ttypes import ScanFwStatus


class Scan:
    def __init__(self, scan_resp: Dict) -> None:
        self.token = scan_resp["token"]
        self.group_id = scan_resp["scan_group_id"]
        self.tx_node_name = scan_resp["tx_node_name"]
        self.timestamp = scan_resp["timestamp"]
        self.tx_power = scan_resp["tx_power"]
        self.tx_resp = scan_resp["scan_resp_path"]
        self.n_responses_waiting = scan_resp["n_responses_waiting"]
        self.tx_status = scan_resp["status"]
        self.scan_type = scan_resp["scan_type"]
        self.scan_sub_type = scan_resp["scan_sub_type"]
        self.scan_mode = scan_resp["scan_mode"]
        self.start_bwgd = scan_resp["start_bwgd"]
        self.network_name = scan_resp["network_name"]
        self.rx_responses: List[Dict[str, Any]] = []

        self.add_rx_response(scan_resp)

    def add_rx_response(self, scan_resp: Dict) -> None:
        self.rx_responses.append(
            {
                "rx_resp_path": scan_resp["rx_scan_resp_path"],
                "rx_node_name": scan_resp["rx_node_name"],
                "rx_status": scan_resp["rx_status"],
            }
        )


class ScanGroup:
    def __init__(self, scans: List[Scan]) -> None:
        self.scans = deepcopy(scans)
        self.id = scans[0].group_id
        self.network_name = scans[0].network_name
        self.start_bwgd = scans[0].start_bwgd
        self.end_bwgd = scans[-1].start_bwgd
        self.scan_type = scans[0].scan_type
        self.scan_sub_type = scans[0].scan_sub_type
        self.scan_mode = scans[0].scan_mode

    def calculate_response_rate(self) -> Dict:
        """
        Calculate response rate stats for the scan group
        Scans fall into 3 categories:
        1. Valid Scans: Scans in which all nodes involved in the scan
            sent a non-erroneous response
        2. Invalid Scans: Scans in which at least one involved node
            sent an erroneous response
        3. Incomplete Scans: Scans in which at least one involved node
            failed to send a response
        A scan can be Valid, Invalid, Incomplete, or Invalid and Incomplete.
        In addition to tallying the number of scans in this group that fall
        into each category, we also track the frequency of error types for
        scans in the group
        """
        n_valid_scans = 0
        n_invalid_scans = 0
        n_incomplete_scans = 0
        tx_nodes = set()
        rx_nodes = []
        n_waiting = 0
        invalid_tx = []
        rx_status_counter: Dict[int, int] = defaultdict(int)
        tx_status_counter: Dict[int, int] = defaultdict(int)

        for scan in self.scans:
            # Represents whether scan contains any nonzero error codes
            is_scan_valid = True
            # Represents if the scan is missing any responses from involved nodes
            is_scan_complete = True
            tx_nodes.add(scan.tx_node_name)
            tx_status_counter[scan.tx_status.value] += 1
            if scan.tx_status != ScanFwStatus.COMPLETE:
                is_scan_valid = False
            if not scan.tx_resp:
                invalid_tx.append(
                    {"id": scan.tx_node_name, "timestamp": scan.timestamp}
                )
                is_scan_complete = False
            if scan.n_responses_waiting:
                n_waiting += scan.n_responses_waiting
                is_scan_complete = False
            for resp in scan.rx_responses:
                rx_status_counter[resp["rx_status"].value] += 1
                if resp["rx_status"] != ScanFwStatus.COMPLETE:
                    is_scan_valid = False
                rx_nodes.append(resp["rx_node_name"])

            if is_scan_valid and is_scan_complete:
                n_valid_scans += 1
            if not is_scan_valid:
                n_invalid_scans += 1
            if not is_scan_complete:
                n_incomplete_scans += 1

        resp_rate = {
            **vars(self),
            "n_scans": len(self.scans),
            "n_valid_scans": n_valid_scans,
            "n_invalid_scans": n_invalid_scans,
            "n_incomplete_scans": n_incomplete_scans,
            "total_tx_resp": len(tx_nodes),
            "invalid_tx_resp": len(invalid_tx),
            "tx_status_counter": tx_status_counter,
            "total_rx_resp": len(rx_nodes),
            "rx_status_counter": rx_status_counter,
        }

        # We don't want scan_group's scan data in response rate results
        del resp_rate["scans"]
        return resp_rate
