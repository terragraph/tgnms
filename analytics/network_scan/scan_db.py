#!/usr/bin/env python3

import os
import pymysql
import snappy
import sys

from scan import Scan

from thrift.protocol.TBinaryProtocol import TBinaryProtocolAcceleratedFactory
from thrift.TSerialization import deserialize

from terragraph_thrift.Controller.ttypes import ScanResp


class ScanDb(object):

    def __init__(self, db_host, db_user, db_pass, db_name):
        # Connect to db
        try:
            self.db = pymysql.connect(
                host=db_host,
                user=db_user,
                password=db_pass,
                db=db_name,
                charset="utf8mb4",
                cursorclass=pymysql.cursors.DictCursor,
            )
        except BaseException as err:
            raise err

    def decompress_and_deserialize(self, scan_resp, out_type):
        if not scan_resp:
            return None
        decomp_scan_resp = snappy.uncompress(scan_resp)
        ret = out_type()
        deserialize(ret, decomp_scan_resp, TBinaryProtocolAcceleratedFactory())
        return ret

    def get_scans(self, network_name, scan_type=None, result_window=None, decompress_scan_resp=True):
        # Query for most recent scan results
        self.cursor = self.db.cursor()
        query = (
            "SELECT tx_scan_results.*, rx_scan_results.rx_node_id,"
            "rx_scan_results.rx_node_name, rx_scan_results.scan_resp as "
            "rx_scan_resp, rx_scan_results.status as rx_status "
            "FROM tx_scan_results JOIN rx_scan_results ON "
            "rx_scan_results.tx_id=tx_scan_results.id WHERE network=\"{}\""
        ).format(network_name)
        if scan_type is not None:
            query += " AND scan_type={}".format(scan_type)
        if result_window is not None:
            query += (
                " AND tx_scan_results.timestamp BETWEEN"
                " date_sub(now(), INTERVAL {} WEEK) AND now()"
            ).format(result_window)
        query += " ORDER BY timestamp DESC"
        self.cursor.execute(query)
        scans = {}
        for result in self.cursor:
            if decompress_scan_resp:
                try:
                    result["scan_resp"] = self.decompress_and_deserialize(
                        result["scan_resp"], ScanResp)
                    result["rx_scan_resp"] = self.decompress_and_deserialize(
                        result["rx_scan_resp"], ScanResp)
                except Exception:
                    result["scan_resp"] = None
                    result["rx_scan_resp"] = None
            if result["token"] not in scans:
                scans[result["token"]] = Scan(result)
            else:
                scans[result["token"]].add_rx_response(result)
        self.cursor.close()
        return list(scans.values())
