#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import json
import unittest

import networkx as nx
from cut_edge_optimizer.graph_analysis import build_topology_graph, find_cn_cut_edges


class GraphAnalysisTests(unittest.TestCase):
    def test_build_topology_graph(self) -> None:
        network_name = "test_network"
        with open("tests/topology_" + network_name + ".json") as json_data:
            topology = json.load(json_data)
        topology_graph, cns = build_topology_graph(network_name, topology)
        expected_output = {"nodes": 14, "edges": 14, "cns": 4, "pops": 2}
        pops = {node for node in topology_graph["source"]}
        actual_output = {
            "nodes": len(topology_graph.nodes),
            "edges": len(topology_graph.edges),
            "cns": len(cns),
            "pops": len(pops),
        }
        self.assertIsInstance(topology_graph, nx.Graph)
        self.assertIsInstance(cns, set)
        self.assertDictEqual(expected_output, actual_output)

    def test_find_cn_cut_edges(self) -> None:
        network_name = "test_network"
        with open("tests/topology_" + network_name + ".json") as json_data:
            topology = json.load(json_data)
        topology_graph, cns = build_topology_graph(network_name, topology)
        cn_cut_edges = find_cn_cut_edges(topology_graph, cns)
        expected_output = 6
        actual_output = len(cn_cut_edges)
        self.assertEqual(expected_output, actual_output)
