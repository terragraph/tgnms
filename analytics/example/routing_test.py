#!/usr/bin/env python3

import itertools
import os
import sys
import unittest
from unittest import mock

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from module.routing import get_routes_for_nodes, RouteToPop

sys.path.append(
    os.path.abspath(os.path.join(os.path.dirname(__file__), "..") + "/interface/gen-py")
)
from facebook.gorilla.Topology.ttypes import LinkType


async def mocked_fetch(*args, **kwargs):
    if args[1] == "A1":
        if args[2] == "P1":
            return [
                ["A1", "C1", "C2", "P2", "P1"],
                ["A1", "A2", "D1", "D2", "P2", "P1"],
                ["A1", "A3", "E1", "E2", "P3", "P1"],
            ]
        elif args[2] == "P2":
            return [
                ["A1", "C1", "C2", "P2"],
                ["A1", "A2", "D1", "D2", "P2"],
                ["A1", "A3", "E1", "E2", "P3", "P2"],
            ]
        elif args[2] == "P3":
            return [
                ["A1", "C1", "C2", "P2", "P3"],
                ["A1", "A2", "D1", "D2", "P2", "P3"],
                ["A1", "A3", "E1", "E2", "P3"],
            ]
    elif args[1] == "A2":
        if args[2] == "P1":
            return [
                ["A2", "D1", "D2", "P2", "P1"],
                ["A2", "A1", "C1", "C2", "P2", "P1"],
                ["A2", "A3", "E1", "E2", "P3", "P1"],
            ]
        elif args[2] == "P2":
            return [
                ["A2", "D1", "D2", "P2"],
                ["A2", "A1", "C1", "C2", "P2"],
                ["A2", "A3", "E1", "E2", "P3", "P2"],
            ]
        elif args[2] == "P3":
            return [
                ["A2", "D1", "D2", "P2", "P3"],
                ["A2", "A1", "C1", "C2", "P2", "P3"],
                ["A2", "A3", "E1", "E2", "P3"],
            ]
    elif args[1] == "A3":
        if args[2] == "P1":
            return [
                ["A3", "E1", "E2", "P3", "P1"],
                ["A3", "A2", "D1", "D2", "P2", "P1"],
                ["A3", "A1", "C1", "C2", "P2", "P1"],
            ]
        elif args[2] == "P2":
            return [
                ["A3", "E1", "E2", "P3", "P2"],
                ["A3", "A2", "D1", "D2", "P2"],
                ["A3", "A1", "C1", "C2", "P2"],
            ]
        elif args[2] == "P3":
            return [
                ["A3", "E1", "E2", "P3"],
                ["A3", "A2", "D1", "D2", "P2", "P3"],
                ["A3", "A1", "C1", "C2", "P2", "P3"],
            ]
    elif args[1] == "B1":
        if args[2] == "P1":
            return [["B1", "B2", "F1", "F2", "P1"]]
        elif args[2] == "P2":
            return [["B1", "B2", "F1", "F2", "P1", "P2"]]
        elif args[2] == "P3":
            return [["B1", "B2", "F1", "F2", "P1", "P3"]]
    elif args[1] == "B2":
        if args[2] == "P1":
            return [["B2", "F1", "F2", "P1"]]
        elif args[2] == "P2":
            return [["B2", "F1", "F2", "P1", "P2"]]
        elif args[2] == "P3":
            return [["B2", "F1", "F2", "P1", "P3"]]
    elif args[1] == "C1":
        if args[2] == "P1":
            return [["C1", "C2", "P2", "P1"]]
        elif args[2] == "P2":
            return [["C1", "C2", "P2"]]
        elif args[2] == "P3":
            return [["C1", "C2", "P2", "P3"]]
    elif args[1] == "C2":
        if args[2] == "P1":
            return [["C2", "P2", "P1"]]
        elif args[2] == "P2":
            return [["C2", "P2"]]
        elif args[2] == "P3":
            return [["C2", "P2", "P3"]]
    elif args[1] == "D1":
        if args[2] == "P1":
            return [["D1", "D2", "P2", "P1"]]
        elif args[2] == "P2":
            return [["D1", "D2", "P2"]]
        elif args[2] == "P3":
            return [["D1", "D2", "P2", "P3"]]
    elif args[1] == "D2":
        if args[2] == "P1":
            return [["D2", "P2", "P1"]]
        elif args[2] == "P2":
            return [["D2", "P2"]]
        elif args[2] == "P3":
            return [["D2", "P2", "P3"]]
    elif args[1] == "E1":
        if args[2] == "P1":
            return [["E1", "E2", "P3", "P1"]]
        elif args[2] == "P2":
            return [["E1", "E2", "P3", "P2"]]
        elif args[2] == "P3":
            return [["E1", "E2", "P3"]]
    elif args[1] == "E2":
        if args[2] == "P1":
            return [["E2", "P3", "P1"]]
        elif args[2] == "P2":
            return [["E2", "P3", "P2"]]
        elif args[2] == "P3":
            return [["E2", "P3"]]
    elif args[1] == "F1":
        if args[2] == "P1":
            return [["F1", "F2", "P1"]]
        elif args[2] == "P2":
            return [["F1", "F2", "P1", "P2"]]
        elif args[2] == "P3":
            return [["F1", "F2", "P1", "P3"]]
    elif args[1] == "F2":
        if args[2] == "P1":
            return [["F2", "P1"]]
        elif args[2] == "P2":
            return [["F2", "P1", "P2"]]
        elif args[2] == "P3":
            return [["F2", "P1", "P3"]]

    return None


class RoutingTest(unittest.TestCase):
    @classmethod
    @mock.patch("module.routing._fetch", side_effect=mocked_fetch)
    def setUpClass(cls, mock_fetch):
        cls.network_info = {}

        cls.network_info["api_ip"] = ""
        cls.network_info["api_port"] = ""
        cls.network_info["topology"] = {}

        """
        Nodes with beginning with "P" are POP nodes. All nodes beginning with
        the same letter (except POPs) are connected via ethernet (physical)
        links.

        D2--D1------A2--A3------E1--E2------P3
        |            |   |
        |            +--A1------B1--B2------F1--F2
        |                |                       |
        |                |                       |
        |                |                       |
        |                |                       P1
        |                |
        P2-----------C2--C1
        """

        cls.network_info["topology"]["nodes"] = [
            {"name": "A1", "pop_node": False},
            {"name": "A2", "pop_node": False},
            {"name": "A3", "pop_node": False},
            {"name": "B1", "pop_node": False},
            {"name": "B2", "pop_node": False},
            {"name": "C1", "pop_node": False},
            {"name": "C2", "pop_node": False},
            {"name": "D1", "pop_node": False},
            {"name": "D2", "pop_node": False},
            {"name": "E1", "pop_node": False},
            {"name": "E2", "pop_node": False},
            {"name": "F1", "pop_node": False},
            {"name": "F2", "pop_node": False},
            {"name": "P1", "pop_node": True},
            {"name": "P2", "pop_node": True},
            {"name": "P3", "pop_node": True},
        ]

        cls.network_info["topology"]["links"] = [
            {
                "a_node_name": "A1",
                "z_node_name": "A2",
                "link_type": LinkType().ETHERNET,
            },
            {
                "a_node_name": "A1",
                "z_node_name": "A3",
                "link_type": LinkType().ETHERNET,
            },
            {
                "a_node_name": "A2",
                "z_node_name": "A3",
                "link_type": LinkType().ETHERNET,
            },
            {
                "a_node_name": "B1",
                "z_node_name": "B2",
                "link_type": LinkType().ETHERNET,
            },
            {
                "a_node_name": "C1",
                "z_node_name": "C2",
                "link_type": LinkType().ETHERNET,
            },
            {
                "a_node_name": "D1",
                "z_node_name": "D2",
                "link_type": LinkType().ETHERNET,
            },
            {
                "a_node_name": "E1",
                "z_node_name": "E2",
                "link_type": LinkType().ETHERNET,
            },
            {
                "a_node_name": "F1",
                "z_node_name": "F2",
                "link_type": LinkType().ETHERNET,
            },
            {
                "a_node_name": "A1",
                "z_node_name": "B1",
                "link_type": LinkType().WIRELESS,
            },
            {
                "a_node_name": "B2",
                "z_node_name": "F1",
                "link_type": LinkType().WIRELESS,
            },
            {
                "a_node_name": "F2",
                "z_node_name": "P1",
                "link_type": LinkType().WIRELESS,
            },
            {
                "a_node_name": "A1",
                "z_node_name": "C1",
                "link_type": LinkType().WIRELESS,
            },
            {
                "a_node_name": "C2",
                "z_node_name": "P2",
                "link_type": LinkType().WIRELESS,
            },
            {
                "a_node_name": "A2",
                "z_node_name": "D1",
                "link_type": LinkType().WIRELESS,
            },
            {
                "a_node_name": "D2",
                "z_node_name": "P2",
                "link_type": LinkType().WIRELESS,
            },
            {
                "a_node_name": "A3",
                "z_node_name": "E1",
                "link_type": LinkType().WIRELESS,
            },
            {
                "a_node_name": "E2",
                "z_node_name": "P3",
                "link_type": LinkType().WIRELESS,
            },
        ]

        cls.node_name_to_routes = {
            r4n.name: r4n for r4n in get_routes_for_nodes(cls.network_info)
        }

        cls.call_args_list = mock_fetch.call_args_list

    def test_mock_method_state(self):
        """
        Verify that the mocked method is called the correct number of times and
        with the correct parameters. The mocked fetch method is invoked
        properly if the call list is the same length as that of the number of
        (node, pop_node) pairs. In addition, each arg pair in the call list
        should appear in the set of (node, pop_node) pairs once.
        """

        nodes = []
        pop_nodes = []
        for node in self.network_info["topology"]["nodes"]:
            (pop_nodes if node["pop_node"] else nodes).append(node["name"])

        node_pairs = set(itertools.product(nodes, pop_nodes))
        self.assertEqual(len(self.call_args_list), len(node_pairs))

        for args, _kwargs in self.call_args_list:
            (src, dst) = (args[1], args[2])
            self.assertIn((src, dst), node_pairs)
            node_pairs.remove((src, dst))

    def test_return_size(self):
        """
        There should be one RoutesForNode object for every node in the network.
        """

        self.assertEqual(
            len(self.node_name_to_routes), len(self.network_info["topology"]["nodes"])
        )

    def test_pop_nodes(self):
        """
        Verify that POP nodes have a 0 hop count and empty route list since they
        are themselves their closest POP nodes.
        """

        pop_node_names = {
            node["name"]
            for node in self.network_info["topology"]["nodes"]
            if node["pop_node"]
        }

        for name in pop_node_names:
            data = self.node_name_to_routes[name]
            self.assertEqual(data.num_hops, 0)
            self.assertEqual(data.routes, [])

    def test_ignore_ethernet_links(self):
        """
        Verify that no hops in any RoutesForNode routes are ethernet links.
        """

        link_map = {
            (link["a_node_name"], link["z_node_name"]): link["link_type"]
            for link in self.network_info["topology"]["links"]
        }

        for r4n in self.node_name_to_routes.values():
            for r2p in r4n.routes:
                for hop in r2p.path:
                    self.assertEqual(link_map[hop], LinkType().WIRELESS)

    def test_only_one_pop_in_route(self):
        """
        Verify that no routes have more than one POP node and confirm that the
        last node in the route is the POP node.
        """

        pop_node_names = {
            node["name"]
            for node in self.network_info["topology"]["nodes"]
            if node["pop_node"]
        }

        for r4n in self.node_name_to_routes.values():
            for r2p in r4n.routes:
                nodes_in_path = list(itertools.chain(*r2p.path))
                self.assertEqual(len(pop_node_names.intersection(nodes_in_path)), 1)
                self.assertTrue(nodes_in_path[-1] in pop_node_names)

    def test_multiple_equidistant_pops(self):
        """
        Node A1 can reach both P2 and P3 in 2 wireless hops. Verify that both
        POP names are present in A1's routes.
        """

        routes_for_a1 = self.node_name_to_routes["A1"]
        a1_pop_names = {r2p.pop_name for r2p in routes_for_a1.routes}

        self.assertIn("P2", a1_pop_names)
        self.assertIn("P3", a1_pop_names)

    def test_num_p2mp_hops(self):
        """
        Node A1 can reach P2 via [("A1", "C1"), ("C2", "P2")] which includes a
        P2MP hop as A1 is also wirelessly linked to B1. Verify that this route
        has one P2MP hop and is a member of A1"s routes.
        """

        routes_for_a1 = self.node_name_to_routes["A1"]
        expected_r2p = RouteToPop(
            pop_name="P2",
            num_p2mp_hops=1,
            ecmp=True,
            path=[("A1", "C1"), ("C2", "P2")],
        )

        self.assertIn(expected_r2p, routes_for_a1.routes)

    def test_multiple_routes_to_same_pop(self):
        """
        Node A1 can reach P2 through two distinct (but equal in terms of number
        of wireless hops) paths: [("A1", "C1"), ("C2", "P2")] and
        [("A1", "D1"), ("D2", "P2")]. A1 can reach P3 through only one route
        [("A3", "E1"), ("E2", "P3")].

        Verify that ecmp is True for both P2 routes and False for the route to
        P3 since it can only be reached one way.
        """

        routes_for_a1 = self.node_name_to_routes["A1"]

        num_routes_to_p2 = 0
        for r2p in routes_for_a1.routes:
            if r2p.pop_name == "P2":
                num_routes_to_p2 += 1
                self.assertTrue(r2p.ecmp)
            else:
                self.assertFalse(r2p.ecmp)

        self.assertEqual(num_routes_to_p2, 2)

    def test_get_non_ecmp_routes(self):
        """
        Node A1 has three unique equidistant routes to POPs. Two of them are to
        P2, and one is to P3. Verify that get_non_ecmp_routes will only return
        the RouteToPop ending at P3.
        """

        routes_for_a1 = self.node_name_to_routes["A1"]
        expected_r2p = RouteToPop(
            pop_name="P3",
            num_p2mp_hops=0,
            ecmp=False,
            path=[("A3", "E1"), ("E2", "P3")],
        )

        non_ecmp_routes = routes_for_a1.get_non_ecmp_routes()

        self.assertEqual(len(non_ecmp_routes), 1)
        self.assertIn(expected_r2p, non_ecmp_routes)


if __name__ == "__main__":
    unittest.main()
