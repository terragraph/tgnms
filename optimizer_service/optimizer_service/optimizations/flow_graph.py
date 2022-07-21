#!/usr/bin/env python3

# Copyright (c) Meta Platforms, Inc. and affiliates.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

import logging
from typing import Dict, List, Optional, Set

from cvxpy import ECOS, Maximize, Problem, SolverError, Variable, abs


class FlowNode:
    """ A node with net_flow. """

    def __init__(self, id: str, net_flow: bool = False) -> None:
        self.net_flow = Variable() if net_flow else 0
        self.id = id
        self.share_time = False
        self.edge_flows: List[Variable] = []
        self.edge_times: List[Variable] = []

    # Return the node's internal constraints
    def constraints(self) -> List[bool]:
        if self.share_time:
            return [sum(self.edge_flows) == self.net_flow, sum(self.edge_times) <= 1]
        else:
            return [sum(self.edge_flows) == self.net_flow]


class FlowEdge:
    """ An undirected, capacity limited edge. """

    def __init__(
        self,
        capacity: float,
        in_node: FlowNode,
        out_node: FlowNode,
        share_time: Optional[bool] = False,
    ) -> None:
        self.capacity = capacity
        self.in_node = in_node
        self.out_node = out_node
        self.flow = Variable()
        self.time = Variable()
        self.share_time = share_time

        self.in_node.edge_flows.append(-self.flow)
        self.out_node.edge_flows.append(self.flow)

        if share_time:
            self.in_node.share_time = True
            self.in_node.edge_times.append(self.time)
            self.out_node.share_time = True
            self.out_node.edge_times.append(self.time)

    # Return the edge's internal constraints
    def constraints(self) -> List[bool]:
        if self.share_time:
            return [abs(self.flow) <= self.time * self.capacity, self.time >= 0]
        else:
            return [abs(self.flow) <= self.capacity]


class FlowGraph:
    def __init__(self) -> None:
        self.nodes: Dict[str, FlowNode] = {}
        self.edges: Dict[str, FlowEdge] = {}
        self.constraints: List = []
        self.result = float("nan")

    def add_node(self, id: str, net_flow: bool = False) -> None:
        if id not in self.nodes:
            self.nodes[id] = FlowNode(id, net_flow)

    def add_edge(
        self,
        capacity: float,
        in_node: str,
        out_node: str,
        name: Optional[str] = None,
        share_time: Optional[bool] = False,
    ) -> None:
        if name is None:
            name = f"{in_node}-{out_node}"
        if name not in self.edges:
            self.add_node(in_node)
            self.add_node(out_node)
            self.edges[name] = FlowEdge(
                capacity,
                self.nodes[in_node],
                self.nodes[out_node],
                share_time=share_time,
            )

    def add_constraints(self) -> None:
        # Add node constraints
        for node in self.nodes.values():
            self.constraints += node.constraints()
        # Add edge constraints
        for edge in self.edges.values():
            self.constraints += edge.constraints()

    def solve_maximize_min_problem(self, sources: Set[str], sinks: Set[str]) -> None:
        opt_flow = Variable()
        for sink in sinks:
            self.constraints += [opt_flow <= -self.nodes[sink].net_flow]
        # Solve optimization problem
        self.prob = Problem(Maximize(opt_flow), self.constraints)
        try:
            self.result = self.prob.solve(solver=ECOS)
            for source in sources:
                logging.debug(
                    f"Optimal net_flow for source {source}: "
                    f"{self.nodes[source].net_flow.value}"
                )
            for sink in sinks:
                logging.debug(
                    f"Optimal net_flow for sink {sink}: "
                    f"{self.nodes[sink].net_flow.value}"
                )
        except SolverError:
            logging.exception("Could not solve the optimization problem")
