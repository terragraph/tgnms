#!/usr/bin/env python3

import os
import sys
import time
import unittest

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from module.beringei_time_series import read_time_series_list
from module.topology_handler import fetch_network_info
from module.visibility import NodePowerStatus, write_power_status

sys.path.append(
    os.path.abspath(os.path.join(os.path.dirname(__file__), "..") + "/interface/gen-py")
)
from facebook.gorilla.Topology.ttypes import NodeType


class VisibilityTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.network_info = fetch_network_info()
        current_time = int(time.time())
        window = 900
        interval = 30
        write_power_status(current_time, window, interval, window, cls.network_info)

        cls.id_to_cns = {}
        cls.id_to_tsl = {}

        for id, info in cls.network_info.items():
            topology = info["topology"]

            cns = [
                node["mac_addr"]
                for node in topology["nodes"]
                if node["node_type"] == NodeType.CN
            ]

            tsl = read_time_series_list(
                name="power_status",
                src_macs=cns,
                peer_macs=[],
                start_time=current_time - window,
                end_time=current_time,
                interval=interval,
                topology_name=topology["name"],
            )

            cls.id_to_cns[id] = cns
            cls.id_to_tsl[id] = tsl

    def test_power_status_for_each_cn(self):
        for id in self.network_info:
            self.assertEqual(len(self.id_to_cns[id]), len(self.id_to_tsl[id]))

    def test_valid_power_status(self):
        for tsl in self.id_to_tsl.values():
            for ts in tsl:
                for status in ts.values:
                    self.assertTrue(NodePowerStatus.has_value(status))


if __name__ == "__main__":
    unittest.main()
