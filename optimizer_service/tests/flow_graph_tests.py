#!/usr/bin/env python3

# Copyright (c) Meta Platforms, Inc. and affiliates.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

import json
import unittest
from typing import Set, Tuple

from optimizer_service.optimizations.flow_graph import FlowGraph


class FlowGraphTests(unittest.TestCase):
    def create_test_graph(self) -> Tuple[FlowGraph, Set[str], Set[str]]:
        flow_graph = FlowGraph()
        flow_graph.add_node("0", net_flow=True)
        flow_graph.add_node("1")
        flow_graph.add_node("2", net_flow=True)
        flow_graph.add_node("3", net_flow=True)
        flow_graph.add_edge(1000, "0", "1")
        flow_graph.add_edge(1000, "1", "2")
        flow_graph.add_edge(500, "1", "3")
        sources = set("0")
        sinks = set(["2", "3"])
        return flow_graph, sources, sinks

    def create_test_graph_share_time(self) -> Tuple[FlowGraph, Set[str], Set[str]]:
        flow_graph = FlowGraph()
        flow_graph.add_node("0", net_flow=True)
        flow_graph.add_node("1")
        flow_graph.add_node("2", net_flow=True)
        flow_graph.add_node("3", net_flow=True)
        flow_graph.add_edge(1000, "0", "1", share_time=True)
        flow_graph.add_edge(1000, "1", "2", share_time=True)
        flow_graph.add_edge(500, "1", "3", share_time=True)
        sources = set("0")
        sinks = set(["2", "3"])
        return flow_graph, sources, sinks

    def test_maxmin_optimization(self) -> None:
        flow_graph, sources, sinks = self.create_test_graph()
        # Maximize total flow
        flow_graph.add_constraints()
        flow_graph.solve_maximize_min_problem(sources, sinks)
        self.assertAlmostEqual(500, flow_graph.result, 0)
        self.assertAlmostEqual(-1000, flow_graph.edges["0-1"].flow.value, 0)
        self.assertAlmostEqual(-500, flow_graph.edges["1-2"].flow.value, 0)
        self.assertAlmostEqual(-500, flow_graph.edges["1-3"].flow.value, 0)

    def test_maxmin_optimization_share_time(self) -> None:
        flow_graph, sources, sinks = self.create_test_graph_share_time()
        flow_graph.add_constraints()
        # Maximize total flow
        flow_graph.solve_maximize_min_problem(sources, sinks)
        self.assertAlmostEqual(200, flow_graph.result, 0)
        self.assertAlmostEqual(-400, flow_graph.edges["0-1"].flow.value, 0)
        self.assertAlmostEqual(-200, flow_graph.edges["1-2"].flow.value, 0)
        self.assertAlmostEqual(-200, flow_graph.edges["1-3"].flow.value, 0)
        self.assertAlmostEqual(0.4, flow_graph.edges["0-1"].time.value, 1)
        self.assertAlmostEqual(0.2, flow_graph.edges["1-2"].time.value, 1)
        self.assertAlmostEqual(0.4, flow_graph.edges["1-3"].time.value, 1)
