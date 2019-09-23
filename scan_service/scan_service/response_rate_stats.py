#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

from typing import Dict

from terragraph_thrift.Controller.ttypes import (
    ScanFwStatus,
    ScanMode,
    ScanSubType,
    ScanType,
)

from scan_service.scan import ScanGroup
from scan_service.time_conv import bwgd_to_datetime


class ResponseRateStats:
    def __init__(self, scan_group: ScanGroup) -> None:

        # Fetch metadata from scan_group
        self.network_name = scan_group.network_name
        self.group_id = scan_group.id
        self.group_start_bwgd = scan_group.start_bwgd
        self.group_end_bwgd = scan_group.end_bwgd
        self.scan_type = scan_group.scan_type
        self.scan_sub_type = scan_group.scan_sub_type
        self.scan_mode = scan_group.scan_mode

        # Calculate response rate stats for scan group
        n_valid_scans = 0
        n_invalid_scans = 0
        n_incomplete_scans = 0
        tx_nodes = set()
        rx_nodes = []
        n_waiting = 0
        invalid_rx = []
        rx_errors = {}
        invalid_tx = []
        tx_errors = {}
        for scan in scan_group.scans:
            # Represents whether scan contains any nonzero error codes
            is_scan_valid = True
            # Represents if scan is missing any responses from involved nodes
            is_scan_complete = True
            tx_nodes.add(scan.tx_node_name)
            if scan.tx_status not in tx_errors:
                tx_errors[scan.tx_status] = 0
            tx_errors[scan.tx_status] += 1
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
                if resp["rx_status"] not in rx_errors:
                    rx_errors[resp["rx_status"]] = 0
                rx_errors[resp["rx_status"]] += 1
                if resp["rx_status"] != ScanFwStatus.COMPLETE:
                    is_scan_valid = False
                rx_nodes.append(resp["rx_node_name"])
                if not resp["rx_resp"]:
                    invalid_rx.append(
                        {"id": resp["rx_node_name"], "timestamp": scan.timestamp}
                    )
            # If scan does not contain any error codes and is not missing any
            # responses we count it as valid
            n_valid_scans += is_scan_valid and is_scan_complete
            # If a scan contains nonzero error codes in any responses
            # we count it as invalid
            n_invalid_scans += not is_scan_valid
            # If a scan is missing any responses, we count it as incomplete
            n_incomplete_scans += not is_scan_complete

        n_scans = len(scan_group.scans)

        self.n_scans = n_scans
        self.n_valid_scans = n_valid_scans
        self.n_invalid_scans = n_invalid_scans
        self.n_incomplete_scans = n_incomplete_scans
        self.valid_response_rate = (n_valid_scans / n_scans) * 100
        self.invalid_response_rate = (n_invalid_scans / n_scans) * 100
        self.incomplete_response_rate = (n_incomplete_scans / n_scans) * 100
        self.rx_stats = {
            "total": len(rx_nodes) + n_waiting,
            "invalid": len(invalid_rx),
            "response_rate": (
                (len(rx_nodes) - len(invalid_rx)) / (len(rx_nodes) + n_waiting)
            )
            * 100,
            "responses_waiting": n_waiting,
            "errors": rx_errors,
        }
        self.tx_stats = {
            "total": len(tx_nodes),
            "invalid": len(invalid_tx),
            "response_rate": ((len(tx_nodes) - len(invalid_tx)) / len(tx_nodes)) * 100,
            "errors": tx_errors,
        }

    def print_helper(self, stats: Dict) -> None:
        print("\tTotal Responses: {}".format(stats["total"]))
        print("\tInvalid Responses: {}".format(stats["invalid"]))
        print("\tResponse Rate: {}".format(stats["response_rate"]))
        if "responses_waiting" in stats:
            print("\tWaiting Responses: {}".format(stats["responses_waiting"]))
        print("\tError Occurence Counts")
        for error_code, frequency in stats["errors"].items():
            # If we do not recognize the error code, set it to an unspecified
            # error to avoid crashing because of outdated/changed error codes
            if error_code not in ScanFwStatus._VALUES_TO_NAMES:
                error_code = ScanFwStatus.UNSPECIFIED_ERROR
            print(
                "\t\t{}: {}".format(
                    ScanFwStatus._VALUES_TO_NAMES[error_code], frequency
                )
            )

    def print_stats(self, concise: bool = False):
        print(
            "Scan group id: {}, start: {}, end: {}, num scans: {}".format(
                self.group_id,
                bwgd_to_datetime(self.group_start_bwgd),
                bwgd_to_datetime(self.group_end_bwgd),
                self.n_scans,
            )
        )
        print(
            "Scan type: {}, scan sub-type: {}, scan mode: {}".format(
                ScanType._VALUES_TO_NAMES[self.scan_type],
                ScanSubType._VALUES_TO_NAMES[self.scan_sub_type],
                ScanMode._VALUES_TO_NAMES[self.scan_mode],
            )
        )
        print("Number of scans: {}".format(self.n_scans))
        print("Response rates:")
        print("\tValid: {}".format(self.valid_response_rate))
        print("\tInvalid: {}".format(self.invalid_response_rate))
        print("\tIncomplete: {}".format(self.incomplete_response_rate))
        if not concise:
            print("Tx Stats:")
            self.print_helper(self.tx_stats)
            print("Rx Stats:")
            self.print_helper(self.rx_stats)
