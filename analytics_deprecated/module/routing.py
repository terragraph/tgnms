#!/usr/bin/env python3

""" Provides a function which aggregates data required for periodic multihop
    topology scans and targeted network testing.
"""

import json
import logging
from typing import List, Optional

import requests
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

    def __lt__(self, other: object) -> bool:
        if isinstance(other, RouteToPop):
            return (self.pop_name, self.num_p2mp_hops, self.ecmp, self.path) < (
                other.pop_name,
                other.num_p2mp_hops,
                other.ecmp,
                other.path,
            )
        raise NotImplementedError


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
                and sorted(self.routes) == sorted(other.routes)
            )
        return False

    def get_non_ecmp_routes(self) -> List[RouteToPop]:
        """
        Return: list of possible RouteToPops that do not involve ECMP (i.e. are
                to a unique PoP)
        """

        return [route for route in self.routes if not route.ecmp]


def fetch_default_routes(hostname: str, port: str, nodes: List[str]) -> Optional[dict]:
    url = "http://[{}]:{}/api/getDefaultRoutes".format(hostname, port)
    resp = requests.post(url, data=json.dumps({"nodes": nodes}))

    if resp.status_code == 200:
        body = resp.json(encoding="utf-8")
        return body.get("defaultRoutes")

    logging.error(
        "getDefaultRoutes failed: {} '{}'".format(resp.status_code, resp.reason)
    )
    return None


def get_routes_for_nodes(
    network_info: dict, node_filter_list: Optional[List[str]] = None
) -> List[RoutesForNode]:
    """
    Query the E2E controller and get a list of multihop routing info on the
    nodes in the network topology.

    Args:
        network_info: dict of network info from api/getTopology
        node_filter_list: an optional sublist of node names that allows the user
                          to control for which nodes to compute RoutesForNodes.

    Return:
        return_list: list of RoutesForNode objects corresponding to the nodes in
                     network_info (optionally filtered by node_filter_list)
    """

    topology = network_info["topology"]

    return_list = []
    output = fetch_default_routes(
        network_info["api_ip"],
        network_info["api_port"],
        node_filter_list or [node["name"] for node in topology["nodes"]],
    )

    if not output:
        return return_list

    wireless_link_set = {
        (link["a_node_name"], link["z_node_name"])
        for link in topology["links"]
        if link["link_type"] == LinkType.WIRELESS
    }

    for node, default_route_list in output.items():
        # Skip if the node has no default routes (offline)
        if not default_route_list:
            continue

        # "num_hops" is the same for every route in default_route_list, so we
        # just compute it once using the first route in the list
        num_hops = 0
        for src, dst in zip(default_route_list[0], default_route_list[0][1:]):
            hop = tuple(sorted((src, dst)))
            if hop in wireless_link_set:
                num_hops += 1

        r4n = RoutesForNode(name=node, num_hops=num_hops, routes=[])

        for route in default_route_list:
            pop_name = route[-1]
            num_p2mp_hops = 0

            for src, dst in zip(route, route[1:]):
                hop = tuple(sorted((src, dst)))
                if hop in wireless_link_set and any(
                    src in link and link != hop for link in wireless_link_set
                ):
                    num_p2mp_hops += 1

            ecmp = False
            for r2p in r4n.routes:
                # Set "ecmp" to True if there is already an existing route
                # to the same PoP
                if r2p.pop_name == pop_name:
                    ecmp = True
                    r2p.ecmp = True

            r4n.routes.append(RouteToPop(pop_name, num_p2mp_hops, ecmp, route))

        return_list.append(r4n)

    return return_list
