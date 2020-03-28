#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import unittest

from terragraph_thrift.Topology.ttypes import Node, NodeStatusType, NodeType
from tglib.utils.serialization import thrift2binary, thrift2json


class SerializationTests(unittest.TestCase):
    def setUp(self) -> None:
        node = Node()
        node.name = "node"
        node.node_type = NodeType.DN
        node.is_primary = True
        node.mac_addr = "00:11:22:33:44:55"
        node.pop_node = False
        node.status = NodeStatusType.ONLINE
        node.wlan_mac_addrs = []
        node.site_name = "site"
        node.ant_azimuth = 0.0
        node.ant_elevation = 0.0
        self.node = node
        self.empty = Node()

    def test_thrift2binary(self) -> None:
        output = thrift2binary(self.empty)
        self.assertIsInstance(output, bytes)
        self.assertEqual(output, b"\x00")

        output = thrift2binary(self.node)
        self.assertIsInstance(output, bytes)
        self.assertEqual(
            output,
            b"\x0b\x00\x01\x00\x00\x00\x04node\x08\x00\x02\x00\x00\x00\x02\x02\x00\x03\x01\x0b\x00\x04\x00\x00\x00\x1100:11:22:33:44:55\x02\x00\x05\x00\x08\x00\t\x00\x00\x00\x02\x0f\x00\x0b\x0b\x00\x00\x00\x00\x0b\x00d\x00\x00\x00\x04site\x04\x00e\x00\x00\x00\x00\x00\x00\x00\x00\x04\x00f\x00\x00\x00\x00\x00\x00\x00\x00\x00",
        )

    def test_thrift2json(self) -> None:
        output = thrift2json(self.empty)
        self.assertIsInstance(output, bytes)
        self.assertEqual(output, b"{}")

        output = thrift2json(self.node)
        self.assertIsInstance(output, bytes)
        self.assertEqual(
            output,
            b'{"1":{"str":"node"},"2":{"i32":2},"3":{"tf":1},"4":{"str":"00:11:22:33:44:55"},"5":{"tf":0},"9":{"i32":2},"11":{"lst":["str",0]},"100":{"str":"site"},"101":{"dbl":0.0},"102":{"dbl":0.0}}',
        )
