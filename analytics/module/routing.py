#!/usr/bin/env python3

""" Provides a function which aggregates data required for periodic multihop
    topology scans and targeted network testing.
"""

import asyncio
import itertools
import logging
import sys
from aiohttp import ClientSession
from typing import List, Optional, Set

from facebook.gorilla.Topology.ttypes import LinkType


class RouteToPop(object):
    """
    Wrapper class for storing data on a multihop route that terminates at a PoP.

    Params:
        pop_name: name of the PoP at which the route terminates
        num_p2mp_hops: number of P2MP hops in the route
        ecmp: whether pop_name can be reached in additional equal cost routes
        path: list of nodes that form the route to pop_name
    """

    def __init__(
        self, pop_name: str, num_p2mp_hops: int, ecmp: bool, path: List[str]
    ) -> None:
        self.pop_name = pop_name
        self.num_p2mp_hops = num_p2mp_hops
        self.ecmp = ecmp
        self.path = path

    def __eq__(self, other: object) -> bool:
        if isinstance(other, RouteToPop):
            return (
                self.pop_name == other.pop_name
                and self.num_p2mp_hops == other.num_p2mp_hops
                and self.ecmp == other.ecmp
                and self.path == other.path
            )
        return False


class RoutesForNode(object):
    """
    Wrapper class for storing multihop routing info on a particular node in the
    network.

    Params:
        name: node name
        num_hops: minimum number of (wireless) hops to the nearest PoP(s)
        routes: RouteToPop list, one for each route to any of the nearest PoP(s)
    """

    def __init__(self, name: str, num_hops: int, routes: List[RouteToPop]) -> None:
        self.name = name
        self.num_hops = num_hops
        self.routes = routes

    def __eq__(self, other: object) -> bool:
        if isinstance(other, RoutesForNode):
            return (
                self.name == other.name
                and self.num_hops == other.num_hops
                and self.routes == other.routes
            )
        return False

    def get_non_ecmp_routes(self) -> List[RouteToPop]:
        """
        Return: list of possible RouteToPops that do not involve ECMP (i.e. are
                to a unique PoP)
        """

        return [route for route in self.routes if not route.ecmp]


async def _fetch(url, src, dst, session):
    """
    NOT to be used standalone. _fetch is a module level function used ONLY for
    implementing get_routes_for_nodes.
    """

    async with session.post(url, json={"srcNode": src, "dstNode": dst}) as resp:
        if resp.status == 200:
            body = await resp.json(encoding="utf-8")
            return body.get("routes")
        else:
            logging.error(
                "getRoutes request with params: {{srcNode: {}, dstNode: {}}} failed: '{}' ({})".format(
                    src, dst, resp.reason, resp.status
                )
            )
            return None


async def _run(hostname, port, node_names, pop_node_names):
    """
    NOT to be used standalone. _run is a module level function used ONLY for
    implementing get_routes_for_nodes.
    """

    url = "http://[{}]:{}/api/getRoutes".format(hostname, port)
    tasks = []

    # Fetch all responses within one ClientSession, keep connection alive for
    # all requests
    async with ClientSession() as session:
        for src, dst in itertools.product(node_names, pop_node_names):
            task = asyncio.ensure_future(_fetch(url, src, dst, session))
            tasks.append(task)

        return await asyncio.gather(*tasks)


def get_routes_for_nodes(
    network_info: dict, node_filter_set: Optional[Set[str]] = None
) -> List[RoutesForNode]:
    """
    Query the E2E controller and get a list of multihop routing info on the
    nodes in the network topology.

    Args:
        network_info: dict of network info from api/getTopology
        node_filter_set: an optional subset of node names that allows the user
                         to control for which nodes to compute RoutesForNodes.

    Return:
        return_list: list of RoutesForNode objects corresponding to the nodes in
                     network_info (optionally filtered by node_filter_set)
    """

    topology = network_info["topology"]
    nodes = set()  # type: Set[str]
    pop_nodes = set()  # type: Set[str]

    if node_filter_set:
        nodes = node_filter_set
        pop_nodes = {node["name"] for node in topology["nodes"] if node["pop_node"]}
    else:
        for node in topology["nodes"]:
            if node["pop_node"]:
                pop_nodes.add(node["name"])
            else:
                nodes.add(node["name"])

    if not pop_nodes:
        logging.error("Couldn't find any PoP nodes in {}".format(topology["name"]))
        return []

    # PoP nodes are trivial and can be handled separately. PoPs have 0 hop count
    # and an empty route list
    return_list = [
        RoutesForNode(name, 0, [])
        for name in pop_nodes
        if not node_filter_set or name in node_filter_set
    ]

    # Fetch route data from the controller asynchronously to reduce wait time
    output = asyncio.get_event_loop().run_until_complete(
        _run(network_info["api_ip"], network_info["api_port"], nodes, pop_nodes)
    )

    wireless_link_set = {
        (link["a_node_name"], link["z_node_name"])
        for link in topology["links"]
        if link["link_type"] == LinkType().WIRELESS
    }

    for i, node_name in enumerate(nodes):
        r4n = RoutesForNode(node_name, sys.maxsize, [])

        for j, pop_node_name in enumerate(pop_nodes):
            routes = output[i * len(pop_nodes) + j]
            if not routes:
                continue

            for route in routes:
                # Skip if the route has multiple PoPs
                if len(pop_nodes.intersection(route)) > 1:
                    continue

                # Count the number of wireless hops/P2MP hops and record each
                # wireless hop in the path
                num_hops = 0
                num_p2mp_hops = 0

                for src, dst in zip(route, route[1:]):
                    hop = tuple(sorted((src, dst)))
                    if hop in wireless_link_set:
                        num_hops += 1
                        num_p2mp_hops += (
                            1
                            if any(
                                src in link and link != hop
                                for link in wireless_link_set
                            )
                            else 0
                        )

                if num_hops < r4n.num_hops:
                    # Shorter multihop route found
                    r2p = RouteToPop(pop_node_name, num_p2mp_hops, False, route)
                    r4n.num_hops = num_hops
                    r4n.routes = [r2p]
                elif num_hops == r4n.num_hops:
                    # Add to the list of existing routes if current route has an
                    # equal hop count. Set ecmp to True if there is already an
                    # existing route to the same PoP
                    ecmp = False
                    for r2p in r4n.routes:
                        if r2p.pop_name == pop_node_name:
                            ecmp = True
                            r2p.ecmp = True

                    r4n.routes.append(
                        RouteToPop(pop_node_name, num_p2mp_hops, ecmp, route)
                    )

        # Only add to the return list if at least one valid route was found
        if r4n.routes:
            return_list.append(r4n)

    return return_list
