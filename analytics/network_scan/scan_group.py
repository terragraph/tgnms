#!/usr/bin/env python3

import os
import sys

from copy import deepcopy
from scan import ScanStatusNames, ScanTypeNames, ScanSubTypeNames, ScanModeNames
from time_conv import bwgdToDatetime

from terragraph_thrift.Controller.ttypes import ScanFwStatus

class ScanGroup(object):
    def __init__(self, scans):
        self.scans = deepcopy(scans)

        self.start_time = bwgdToDatetime(scans[0].start_bwgd)
        self.end_time = bwgdToDatetime(scans[-1].start_bwgd)
        self.scan_type = scans[0].scan_type
        self.scan_sub_type = scans[0].scan_sub_type
        self.scan_mode = scans[0].scan_mode

    def get_stats(self):
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

        for scan in self.scans:
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
                invalid_tx.append({"id": scan.tx_node_name, "timestamp": scan.timestamp})
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
                        {"id": resp["rx_node_name"], "timestamp": scan.timestamp})
            # If scan does not contain any error codes and is not missing any
            # responses we count it as valid
            n_valid_scans += is_scan_valid and is_scan_complete
            # If a scan contains nonzero error codes in any responses
            # we count it as invalid
            n_invalid_scans += not is_scan_valid
            # If a scan is missing any responses, we count it as incomplete
            n_incomplete_scans += not is_scan_complete

        n_scans = len(self.scans)
        return {
            "scan_type": self.scan_type,
            "n_scans": n_scans,
            "valid_response_rate": (n_valid_scans / n_scans) * 100,
            "invalid_response_rate": (n_invalid_scans / n_scans) * 100,
            "incomplete_response_rate": (n_incomplete_scans / n_scans) * 100,
            "rx_stats": {
                "total": len(rx_nodes) + n_waiting,
                "invalid": len(invalid_rx),
                "response_rate": (
                    (len(rx_nodes) - len(invalid_rx)) / (len(rx_nodes) + n_waiting)
                )
                * 100,
                "responses_waiting": n_waiting,
                "errors": rx_errors,
            },
            "tx_stats": {
                "total": len(tx_nodes),
                "invalid": len(invalid_tx),
                "response_rate":
                    ((len(tx_nodes) - len(invalid_tx)) / len(tx_nodes)) * 100,
                "errors": tx_errors,
            },
        }

    def print_helper(self, stats):
        print("\tTotal Responses: {}".format(stats['total']))
        print("\tInvalid Responses: {}".format(stats['invalid']))
        print("\tResponse Rate: {}".format(stats['response_rate']))
        if "responses_waiting" in stats:
            print("\tWaiting Responses: {}".format(stats['responses_waiting']))
        print("\tError Occurence Counts")
        for error_code, frequency in stats['errors'].items():
            # If we do not recognize the error code, set it to an unspecified
            # error to avoid crashing because of outdated/changed error codes
            if error_code not in ScanStatusNames:
                error_code = ScanFwStatus.UNSPECIFIED_ERROR
            print("\t\t{}: {}".format(ScanStatusNames[error_code], frequency))

    def print_stats(self):
        stats = self.get_stats()
        print ("Scan group start: {}, end: {}, num scans: {}".format(
            self.start_time,
            self.end_time,
            len(self.scans)
        ))
        print ("Scan type: {}, scan sub-type: {}, scan mode: {}".format(
            ScanTypeNames[self.scan_type],
            ScanSubTypeNames[self.scan_sub_type],
            ScanModeNames[self.scan_mode]
        ))
        print("Number of scans: {}".format(stats['n_scans']))
        print("Response rates:")
        print("\tValid: {}".format(stats['valid_response_rate']))
        print("\tInvalid: {}".format(stats['invalid_response_rate']))
        print("\tIncomplete: {}".format(stats['incomplete_response_rate']))
        print("Tx Stats:")
        self.print_helper(stats['tx_stats'])
        print("Rx Stats:")
        self.print_helper(stats['rx_stats'])
