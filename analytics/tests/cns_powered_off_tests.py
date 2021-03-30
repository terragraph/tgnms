#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import unittest

from analytics.utils.topology import NetworkInfo
from analytics.visibility import _get_cn_info_for_network
from terragraph_thrift.Topology.ttypes import LinkType, NodeType


class VisibilityUtilsTest(unittest.TestCase):
    def test_get_cn_info(self) -> None:
        nodes = [
            {
                "wlan_mac_addrs": ["00:11:22:33:44:55"],
                "node_type": NodeType.CN,
                "mac_addr": "00:11:22:33:44:55",
            },
            {
                "wlan_mac_addrs": ["11:11:22:33:44:55"],
                "node_type": NodeType.CN,
                "mac_addr": "11:11:22:33:44:55",
            },
            {
                "wlan_mac_addrs": ["22:11:22:33:44:55"],
                "node_type": NodeType.DN,
                "mac_addr": "22:11:22:33:44:55",
            },
            {
                "wlan_mac_addrs": ["33:11:22:33:44:55"],
                "node_type": NodeType.DN,
                "mac_addr": "33:11:22:33:44:55",
            },
        ]
        link1 = {
            "a_node_mac": "00:11:22:33:44:55",
            "z_node_mac": "22:11:22:33:44:55",
            "a_node_name": "CNnode1",
            "z_node_name": "DNnode1",
            "name": "link1",
            "link_type": LinkType.WIRELESS,
        }
        link2 = {
            "a_node_mac": "11:11:22:33:44:55",
            "z_node_mac": "22:11:22:33:44:55",
            "a_node_name": "CNnode2",
            "z_node_name": "DNnode1",
            "name": "link2",
            "link_type": LinkType.WIRELESS,
        }
        link3 = {
            "a_node_mac": "22:11:22:33:44:55",
            "z_node_mac": "33:11:22:33:44:55",
            "a_node_name": "DNnode1",
            "z_node_name": "DNnode2",
            "name": "link3",
            "link_type": LinkType.WIRELESS,
        }
        links = [link1, link2, link3]
        network = NetworkInfo(
            name="test_network", nodes=nodes, links=links, sites=[], config={}
        )
        cn_info = _get_cn_info_for_network(network)
        self.assertIn("link1", cn_info.link_name_set)
        self.assertIn("link2", cn_info.link_name_set)
        self.assertNotIn("link3", cn_info.link_name_set)
        self.assertEqual(cn_info.link_name_to_dn_mac["link1"], "22:11:22:33:44:55")
