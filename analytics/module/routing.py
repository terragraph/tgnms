#!/usr/bin/env python3

""" Provides a function which aggregates data required for periodic multihop
    topology scans and targeted network testing.
"""

import asyncio
import itertools
import logging
import os
import sys
from aiohttp import ClientSession
from typing import List, Tuple

sys.path.append(
    os.path.abspath(os.path.join(os.path.dirname(__file__), "..") + "/interface/gen-py")
)
from facebook.gorilla.Topology.ttypes import LinkType


class RouteToPop(object):
    """
    Wrapper class for storing data on a multihop route that terminates at a POP.

    Params:
        pop_name: name of the POP at which the route terminates
        num_p2mp_hops: number of (wireless) P2MP hops in the route
        ecmp: whether pop_name can be reached in additional equal cost routes
        path: list of wireless hops (as tuples) that form the route
    """

    def __eq__(self, other: object) -> bool:
        if isinstance(other, RouteToPop):
            return (
                self.pop_name == other.pop_name
                and self.num_p2mp_hops == other.num_p2mp_hops
                and self.ecmp == other.ecmp
                and self.path == other.path
            )
        return False

    def __init__(
        self, pop_name: str, num_p2mp_hops: int, ecmp: bool, path: List[Tuple]
    ) -> None:
        self.pop_name = pop_name
        self.num_p2mp_hops = num_p2mp_hops
        self.ecmp = ecmp
        self.path = path


class RoutesForNode(object):
    """
    Wrapper class for storing multihop routing info on a particular node in the
    network.

    Params:
        name: node name
        num_hops: minimum number of (wireless) hops from the nearest POP(s)
        routes: RouteToPop list, one for each route to any of the nearest POP(s)
    """

    def __eq__(self, other: object) -> bool:
        if isinstance(other, RoutesForNode):
            return (
                self.name == other.name
                and self.num_hops == other.num_hops
                and self.routes == other.routes
            )
        return False

    def __init__(self, name: str, num_hops: int, routes: List[RouteToPop]) -> None:
        self.name = name
        self.num_hops = num_hops
        self.routes = routes

    def get_non_ecmp_routes(self) -> List[RouteToPop]:
        """
        Return: list of possible RouteToPops that do not involve ECMP (i.e. are
                to a unique POP)
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


def get_routes_for_nodes(network_info: dict) -> List[RoutesForNode]:
    """
    Query the E2E controller and get a list of multihop routing info on the
    nodes in the network topology.
    """

    topology = network_info["topology"]

    nodes = set()
    pop_nodes = set()
    for node in topology["nodes"]:
        if node["pop_node"]:
            pop_nodes.add(node["name"])
        else:
            nodes.add(node["name"])

    if not pop_nodes:
        logging.error("Couldn't find any POP nodes in {}".format(topology["name"]))
        return []

    # POP nodes are trivial and can be handled separately. POPs have 0 hop count
    # and an empty route list
    return_list = [RoutesForNode(name, 0, []) for name in pop_nodes]

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
                # Skip if the route has multiple POPs
                if len(pop_nodes.intersection(route)) > 1:
                    continue

                # Count the number of wireless hops/P2MP hops and record each
                # wireless hop in the path
                num_hops = 0
                num_p2mp_hops = 0
                path = []

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
                        path.append(hop)

                if num_hops < r4n.num_hops:
                    # Shorter multihop route found
                    r2p = RouteToPop(pop_node_name, num_p2mp_hops, False, path)
                    r4n.num_hops = num_hops
                    r4n.routes = [r2p]
                elif num_hops == r4n.num_hops:
                    # Add to the list of existing routes if current route has an
                    # equal hop count
                    if pop_node_name in {r.pop_name for r in r4n.routes}:
                        # Set ecmp to True if there is already an existing route
                        # to the same POP
                        r2p = RouteToPop(pop_node_name, num_p2mp_hops, True, path)

                        for r in r4n.routes:
                            if r.pop_name == pop_node_name:
                                r.ecmp = True
                    else:
                        r2p = RouteToPop(pop_node_name, num_p2mp_hops, False, path)

                    r4n.routes.append(r2p)

        # Only add to the return list if a valid route was found
        if r4n.routes:
            return_list.append(r4n)

    return return_list
