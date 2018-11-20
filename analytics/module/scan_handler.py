#!/usr/bin/env python3

"""
   Provide ScanHandler class, which will provide functions for the network scan reports
   processing.
"""

import os
import json
import logging
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from module.mysql_db_access import MySqlDbAccess
from module.topology_handler import TopologyHelper
from module.unit_converter import UnitConverter

sys.path.append(
    os.path.abspath(os.path.join(os.path.dirname(__file__), "..") + "/interface/gen-py")
)
from terragraph_thrift.Controller.ttypes import ScanType


class ScanHandler(object):
    """
    Provide functions to process the scan reports.
    """

    def get_pathloss_from_im_scan(self, topology_name):
        """Process the interference mgmt (IM) scan reports in MySQL database for
           link pathloss. Currently, for each node, we will use the most recent IM
           scan report as the ground truth.

           Args:
           topology_name: name of the topology, like "tower G".

           Return:
           pathloss_map: dict that maps rx_mac to tx_mac to beam_pairs dicts. Each
           tx_mac to beam_pairs dict contains keys of tx_macs and values of beam_pairs
           to pathloss. The beam_pairs to pathloss maps beam_pairs (tx_beam_idx,
           rx_beam_idx) to the computed pathloss.
           Non-existence node_mac and (tx_beam_idx, rx_beam_idx) should be treated as
           links with infinite pathloss (without interface).
           tx_mac_to_scan_unix_time: node mac to the IM scan start time.
        """

        try:
            mysql_db_access = MySqlDbAccess()
            mysql_return = mysql_db_access.read_scan_results(
                topology_name, scan_type=ScanType.IM
            )
        except BaseException as err:
            raise ValueError(
                "ScanHandler failed to get the mysql_return. Error: {}".format(err.args)
            )

        logging.info(
            "Get {} rows of IM scan response from MySQL".format(len(mysql_return))
        )
        pathloss_map = {}
        tx_mac_to_scan_unix_time = {}
        topology_helper = TopologyHelper(topology_name=topology_name)
        topology_reply = topology_helper.get_topology_from_api_service()
        network_config = topology_helper.obtain_network_dict(topology_reply)
        node_name_to_mac = network_config["node_name_to_mac"]

        unit_converter = UnitConverter()
        enable_second_array = False

        for row in mysql_return:
            tx_node_mac = node_name_to_mac[row["tx_node_name"]]
            rx_node_mac = node_name_to_mac[row["rx_node_name"]]
            if rx_node_mac not in pathloss_map:
                pathloss_map[rx_node_mac] = {}
            pathloss_map[rx_node_mac][tx_node_mac] = {}

            try:
                rx_scan_resp = json.loads((row["rx_scan_resp"]))
            except BaseException as err:
                logging.error(
                    "Failed to load rx_scan_resp of {}->{}".format(
                        tx_node_mac, rx_node_mac
                    )
                )
                continue

            tx_power = unit_converter.tx_power_idx_to_power_dbm(
                row["tx_power"], enable_second_array
            )
            scan_time = unit_converter.bwgd_to_unix_time(row["start_bwgd"])
            tx_mac_to_scan_unix_time[tx_node_mac] = scan_time

            if "routeInfoList" in rx_scan_resp and rx_scan_resp["routeInfoList"]:
                for route_info in rx_scan_resp["routeInfoList"]:
                    beam_idx_pair = (
                        route_info["route"]["tx"],
                        route_info["route"]["rx"],
                    )

                    # By current implementation, im scans reports of each node will
                    # only have 1 report for each node pair and beam pairs combination.
                    # TODO: we do not have rssi in IM scan now.
                    # For IM scan, snrEst should be identical and can work. Need
                    # to migrate to rssi once available.
                    pathloss_map[rx_node_mac][tx_node_mac][beam_idx_pair] = (
                        tx_power - route_info["snrEst"]
                    )

        total_pathloss_num = sum(len(pathloss_map[rx]) for rx in pathloss_map)
        logging.info(
            "{} has {} links with pathloss reports".format(
                topology_name, total_pathloss_num
            )
        )

        return pathloss_map, tx_mac_to_scan_unix_time
