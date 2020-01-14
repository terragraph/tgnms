#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import unittest

from topology_service.utils import sanitize_topology


class SanitizeTopologyTests(unittest.TestCase):
    def test_empty_topology(self) -> None:
        input = {"name": "Topo A", "config": {}, "links": [], "nodes": [], "sites": []}
        expected_output = {"name": "Topo A", "links": [], "nodes": [], "sites": []}
        sanitize_topology(input)
        self.assertDictEqual(expected_output, input)

    def test_basic_topology(self) -> None:
        input = {
            "name": "Topo A",
            "config": {},
            "links": [
                {
                    "a_node_mac": "00:00:00:00:00:00",
                    "a_node_name": "A",
                    "is_alive": False,
                    "link_type": 1,
                    "linkup_attempts": 3,
                    "name": "link-A-Z",
                    "z_node_mac": "00:00:00:00:00:01",
                    "z_node_name": "Z",
                }
            ],
            "nodes": [
                {
                    "ant_azimuth": 0,
                    "ant_elevation": 0,
                    "is_primary": False,
                    "mac_addr": "00:00:00:00:00:00",
                    "name": "Z",
                    "node_type": 1,
                    "pop_node": False,
                    "prefix": "face:b00c:cafe:tt00::/64",
                    "wlan_mac_addrs": [],
                    "site_name": "ZZ",
                    "status": 1,
                },
                {
                    "ant_azimuth": 0,
                    "ant_elevation": 0,
                    "is_primary": True,
                    "mac_addr": "00:00:00:00:00:00",
                    "name": "A",
                    "node_type": 2,
                    "pop_node": True,
                    "prefix": "face:b00c:cafe:ff00::/64",
                    "wlan_mac_addrs": [],
                    "site_name": "AA",
                    "status": 1,
                },
            ],
            "sites": [
                {
                    "name": "Z",
                    "location": {
                        "accuracy": 40000000,
                        "altitude": 0,
                        "latitude": 37.48494650336529,
                        "longitude": -122.14806478512173,
                    },
                },
                {
                    "name": "A",
                    "location": {
                        "accuracy": 36.909646787797904,
                        "altitude": 6.56,
                        "latitude": 37.484926667,
                        "longitude": -122.147381667,
                    },
                },
            ],
        }

        expected_output = {
            "name": "Topo A",
            "links": [
                {
                    "a_node_mac": "00:00:00:00:00:00",
                    "a_node_name": "A",
                    "link_type": 1,
                    "name": "link-A-Z",
                    "z_node_mac": "00:00:00:00:00:01",
                    "z_node_name": "Z",
                }
            ],
            "nodes": [
                {
                    "ant_azimuth": 0,
                    "ant_elevation": 0,
                    "is_primary": True,
                    "mac_addr": "00:00:00:00:00:00",
                    "name": "A",
                    "node_type": 2,
                    "pop_node": True,
                    "prefix": "face:b00c:cafe:ff00::/64",
                    "wlan_mac_addrs": [],
                    "site_name": "AA",
                },
                {
                    "ant_azimuth": 0,
                    "ant_elevation": 0,
                    "is_primary": False,
                    "mac_addr": "00:00:00:00:00:00",
                    "name": "Z",
                    "node_type": 1,
                    "pop_node": False,
                    "prefix": "face:b00c:cafe:tt00::/64",
                    "wlan_mac_addrs": [],
                    "site_name": "ZZ",
                },
            ],
            "sites": [
                {
                    "name": "A",
                    "location": {
                        "accuracy": 36.909646787797904,
                        "altitude": 6.56,
                        "latitude": 37.484926667,
                        "longitude": -122.147381667,
                    },
                },
                {
                    "name": "Z",
                    "location": {
                        "accuracy": 40000000,
                        "altitude": 0,
                        "latitude": 37.48494650336529,
                        "longitude": -122.14806478512173,
                    },
                },
            ],
        }

        sanitize_topology(input)
        self.assertDictEqual(expected_output, input)
