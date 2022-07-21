#!/usr/bin/env python3

# Copyright (c) Meta Platforms, Inc. and affiliates.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

import json
import unittest
from copy import deepcopy

import networkx as nx
from optimizer_service.optimizations.graph import (
    build_topology_graph,
    estimate_capacity,
    find_all_p2mp,
    find_cn_cut_edges,
    is_cn_cut_edge,
    remove_low_uptime_links,
)


class GraphAnalysisTests(unittest.TestCase):
    def setUp(self) -> None:
        with open("tests/topology_test_network.json") as f:
            self.topology = json.load(f)
            self.graph, self.cns = build_topology_graph(self.topology)

    def test_build_topology_graph(self) -> None:
        expected_output = {"nodes": 14, "edges": 14, "cns": 4, "pops": 2}
        pops = {node for node in self.graph["source"]}
        actual_output = {
            "nodes": len(self.graph.nodes),
            "edges": len(self.graph.edges),
            "cns": len(self.cns),
            "pops": len(pops),
        }
        self.assertIsInstance(self.graph, nx.Graph)
        self.assertIsInstance(self.cns, set)
        self.assertDictEqual(expected_output, actual_output)

    def test_find_cn_cut_edges(self) -> None:
        cn_cut_edges = find_cn_cut_edges(self.graph, self.cns)
        expected_output = 6
        actual_output = len(cn_cut_edges)
        self.assertEqual(expected_output, actual_output)

    def test_remove_low_uptime_links(self) -> None:
        uptime = [
            0.9578,
            0.9999,
            0.9834,
            0.4184,
            0.5300,
            0.5450,
            0.6760,
            0.4200,
            0.8460,
            0.9445,
            0.1956,
            0.7645,
        ]
        link_uptime_threshold = 0.5
        link_names = [link["name"] for link in self.topology["links"]]
        active_links = dict(zip(link_names, uptime))
        remove_low_uptime_links(self.graph, active_links, link_uptime_threshold)
        num_of_edges = self.graph.size()
        expected_output = 9
        self.assertIsInstance(self.graph, nx.Graph)
        self.assertEqual(num_of_edges, expected_output)

    def test_is_cn_cut_edge(self) -> None:
        pops = {node for node in self.graph["source"]}
        topology_components = list(nx.connected_components(self.graph))
        cut_edges = nx.bridges(self.graph)
        graph = deepcopy(self.graph)
        for a_node, z_node in cut_edges:
            if (a_node, z_node) == ("TEST.18-41.s1", "TEST.18-61.P4"):
                self.assertTrue(
                    is_cn_cut_edge(
                        self.graph, a_node, z_node, self.cns, pops, topology_components
                    )
                )
            if (a_node, z_node) == ("TEST.18-41.p1", "TEST.18-41.s1"):
                self.assertFalse(
                    is_cn_cut_edge(
                        self.graph, a_node, z_node, self.cns, pops, topology_components
                    )
                )
        self.assertEqual(len(graph.nodes), len(self.graph.nodes))
        self.assertEqual(len(graph.edges), len(self.graph.edges))
        self.assertEqual(len(graph["source"]), len(self.graph["source"]))

    def test_find_all_p2mp(self) -> None:
        p2mp_nodes = find_all_p2mp(self.graph)
        self.assertEqual(3, len(p2mp_nodes))
        expected_output = ["TEST.18-41.s1", "TEST.18-60.P2", "TEST.18-36.p2"]
        self.assertListEqual(expected_output, list(p2mp_nodes.keys()))

    def test_estimate_capacity(self) -> None:
        flow_graph = estimate_capacity(self.graph, self.cns, 1000, 20000)
        self.assertAlmostEqual(250, flow_graph.result, 0)
