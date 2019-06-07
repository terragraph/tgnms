#!/usr/bin/env python3

import os
import sys

from terragraph_thrift.Controller.ttypes import ScanFwStatus, ScanType, ScanMode, ScanSubType

def get_names_from_enum(enum_in):
    ret = {}
    for name, code in enum_in.items():
        ret[code] = name
    return ret


ScanTypeNames = ScanType._VALUES_TO_NAMES
ScanStatusNames = ScanFwStatus._VALUES_TO_NAMES
ScanModeNames = ScanMode._VALUES_TO_NAMES
ScanSubTypeNames = ScanSubType._VALUES_TO_NAMES

class Scan(object):

    def __init__(self, scan_resp):
        self.token = scan_resp['token']
        self.group_id = scan_resp['group_id']
        self.tx_node_name = scan_resp['tx_node_name']
        self.timestamp = scan_resp['timestamp']
        self.tx_power = scan_resp['tx_power']
        self.tx_resp = scan_resp['scan_resp']
        self.n_responses_waiting = scan_resp['n_responses_waiting']
        self.tx_status = scan_resp['status']
        self.scan_type = scan_resp['scan_type']
        self.scan_sub_type = scan_resp['scan_sub_type']
        self.scan_mode = scan_resp['scan_mode']
        self.start_bwgd = scan_resp['start_bwgd']
        self.rx_responses = []

        self.add_rx_response(scan_resp)

    def add_rx_response(self, scan_resp):
        self.rx_responses.append({
            'rx_resp': scan_resp['rx_scan_resp'],
            'rx_node_name': scan_resp['rx_node_name'],
            'rx_status': scan_resp['rx_status']
        })
