#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import logging
from copy import deepcopy
from typing import Dict, List, Set, Tuple

import networkx as nx
from terragraph_thrift.Topology.ttypes import LinkType, NodeType


def build_topology_graph(
    network_name: str, topology: Dict
) -> Tuple[nx.Graph, Set[str]]:
    graph = nx.Graph()
    nodes = []
    edges = []
    cns: Set[str] = set()
    for node in topology["nodes"]:
        nodes.append((node["name"], node))
        # connecting all PoP nodes to a common 'source' since PoP-PoP connections
        # are not in the topology
        if node["pop_node"] and node["is_primary"]:
            edges.append(
                ("source", node["name"], {"name": "link-source-" + node["name"]})
            )
        if node["node_type"] == NodeType.CN:
            cns.add(node["name"])

    for link in topology["links"]:
        edges.append((link["a_node_name"], link["z_node_name"], link))
    graph.add_nodes_from(nodes)
    graph.add_edges_from(edges)
    logging.debug(
        f"Created graph with {len(graph.edges)} nodes, {len(graph.nodes)} "
        f"edges and {len(cns)} CNs for {network_name}"
    )
    return graph, cns


def find_cn_cut_edges(
    graph: nx.Graph, cns: Set[str]
) -> Dict[Tuple[str, str], List[str]]:
    cut_edges = nx.bridges(graph)
    # check if topology has unconnected nodes so they don't affect cut-edge analysis
    topology_components = list(nx.connected_components(graph))
    logging.debug(f"Number of connected components {len(topology_components)}")
    if len(topology_components) > 1:
        logging.warning("Topology already has some unconnected nodes")

    pops = {node for node in graph["source"]}
    # mapping from cut-edge to the CNs it cuts off, if any
    cn_cut_edges = {}
    for edge in cut_edges:
        link_attributes = graph.get_edge_data(*edge)
        # skip wired links
        if link_attributes.get("link_type") == LinkType.WIRELESS:
            logging.debug(f"Analyzing cut edge between {edge[0]} and {edge[1]}")
            cut_cns = is_cn_cut_edge(graph, edge, cns, pops, topology_components)
            if cut_cns:
                cn_cut_edges[edge] = cut_cns

    return cn_cut_edges


def is_cn_cut_edge(
    graph: nx.Graph,
    edge: Tuple[str, str],
    cns: Set[str],
    pops: Set[str],
    topology_components: List[Set[str]],
) -> List[str]:
    # if the edge is a CN-DN edge then it is a CN cut edge
    cut_cns = list(set(edge) & cns)
    if cut_cns:
        logging.debug(f"Cut edge between {edge[0]} and {edge[1]} cuts off CN {cut_cns}")
        return cut_cns
    # for non-CN cut edges check if removing the link cuts off a CN from PoPs
    graph.remove_edge(*edge)
    connected_components = nx.connected_components(graph)
    # if removing the edge has created a graph component that has no PoPs but has CNs
    # then it is a CN cut edge
    for component in connected_components:
        # if this component isn't already disconnected in the original topology
        # i.e. it has been created by removing the edge
        if component not in topology_components:
            if not (component & pops):
                cut_cns = list(component & cns)
                if cut_cns:
                    logging.debug(
                        f"Cut edge between {edge[0]} and {edge[1]} cuts off CNs "
                        f"{cut_cns}"
                    )
                break
    graph.add_edge(*edge)
    return cut_cns
