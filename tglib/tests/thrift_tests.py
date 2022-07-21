#!/usr/bin/env python3

# Copyright (c) Meta Platforms, Inc. and affiliates.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

import unittest

from terragraph_thrift.Topology.ttypes import Node, NodeStatusType, NodeType
from tglib.utils.thrift import binary2thrift, json2thrift, thrift2binary, thrift2json


class ThriftTests(unittest.TestCase):
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

    def test_binary(self) -> None:
        output = thrift2binary(self.empty)
        self.assertIsInstance(output, bytes)
        self.assertEqual(binary2thrift(Node, output), self.empty)

        output = thrift2binary(self.node)
        self.assertIsInstance(output, bytes)
        self.assertEqual(binary2thrift(Node, output), self.node)

    def test_json(self) -> None:
        output = thrift2json(self.empty)
        self.assertIsInstance(output, bytes)
        self.assertEqual(json2thrift(Node, output), self.empty)

        output = thrift2json(self.node)
        self.assertIsInstance(output, bytes)
        self.assertEqual(json2thrift(Node, output), self.node)
