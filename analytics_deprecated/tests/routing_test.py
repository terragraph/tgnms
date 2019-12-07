#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import unittest
from unittest import mock

from facebook.gorilla.Topology.ttypes import LinkType
from module.routing import RoutesForNode, RouteToPop, get_routes_for_nodes


def mocked_fetch(*args, **kwargs):
    nodes = args[2]

    output = {}
    if "A1" in nodes:
        output["A1"] = [
            ["A1", "C1", "C2", "P2", "P1"],
            ["A1", "A2", "D1", "D2", "P2", "P1"],
            ["A1", "A3", "E1", "E2", "P3", "P1"],
            ["A1", "C1", "C2", "P2"],
            ["A1", "A2", "D1", "D2", "P2"],
            ["A1", "A3", "E1", "E2", "P3", "P2"],
            ["A1", "C1", "C2", "P2", "P3"],
            ["A1", "A2", "D1", "D2", "P2", "P3"],
            ["A1", "A3", "E1", "E2", "P3"],
        ]

    if "A2" in nodes:
        output["A2"] = [
            ["A2", "D1", "D2", "P2", "P1"],
            ["A2", "A1", "C1", "C2", "P2", "P1"],
            ["A2", "A3", "E1", "E2", "P3", "P1"],
            ["A2", "D1", "D2", "P2"],
            ["A2", "A1", "C1", "C2", "P2"],
            ["A2", "A3", "E1", "E2", "P3", "P2"],
            ["A2", "D1", "D2", "P2", "P3"],
            ["A2", "A1", "C1", "C2", "P2", "P3"],
            ["A2", "A3", "E1", "E2", "P3"],
        ]

    if "A3" in nodes:
        output["A3"] = [
            ["A3", "E1", "E2", "P3", "P1"],
            ["A3", "A2", "D1", "D2", "P2", "P1"],
            ["A3", "A1", "C1", "C2", "P2", "P1"],
            ["A3", "E1", "E2", "P3", "P2"],
            ["A3", "A2", "D1", "D2", "P2"],
            ["A3", "A1", "C1", "C2", "P2"],
            ["A3", "E1", "E2", "P3"],
            ["A3", "A2", "D1", "D2", "P2", "P3"],
            ["A3", "A1", "C1", "C2", "P2", "P3"],
        ]

    if "B1" in nodes:
        output["B1"] = [
            ["B1", "B2", "F1", "F2", "P1"],
            ["B1", "B2", "F1", "F2", "P1", "P2"],
            ["B1", "B2", "F1", "F2", "P1", "P3"],
        ]

    if "B2" in nodes:
        output["B2"] = [
            ["B2", "F1", "F2", "P1"],
            ["B2", "F1", "F2", "P1", "P2"],
            ["B2", "F1", "F2", "P1", "P3"],
        ]

    if "C1" in nodes:
        output["C1"] = [
            ["C1", "C2", "P2", "P1"],
            ["C1", "C2", "P2"],
            ["C1", "C2", "P2", "P3"],
        ]

    if "C2" in nodes:
        output["C2"] = [["C2", "P2", "P1"], ["C2", "P2"], ["C2", "P2", "P3"]]

    if "D1" in nodes:
        output["D1"] = [
            ["D1", "D2", "P2", "P1"],
            ["D1", "D2", "P2"],
            ["D1", "D2", "P2", "P3"],
        ]

    if "D2" in nodes:
        output["D2"] = [["D2", "P2", "P1"], ["D2", "P2"], ["D2", "P2", "P3"]]

    if "E1" in nodes:
        output["E1"] = [
            ["E1", "E2", "P3", "P1"],
            ["E1", "E2", "P3", "P2"],
            ["E1", "E2", "P3"],
        ]

    if "E2" in nodes:
        output["E2"] = [["E2", "P3", "P1"], ["E2", "P3", "P2"], ["E2", "P3"]]

    if "F1" in nodes:
        output["F1"] = [
            ["F1", "F2", "P1"],
            ["F1", "F2", "P1", "P2"],
            ["F1", "F2", "P1", "P3"],
        ]

    if "F2" in nodes:
        output["F2"] = [["F2", "P1"], ["F2", "P1", "P2"], ["F2", "P1", "P3"]]

    if "P1" in nodes:
        output["P1"] = [["P1"]]

    if "P2" in nodes:
        output["P2"] = [["P2"]]

    if "P3" in nodes:
        output["P3"] = [["P3"]]

    return output


class RoutingTest(unittest.TestCase):
    @classmethod
    @mock.patch("module.routing.fetch_default_routes", side_effect=mocked_fetch)
    def setUpClass(cls, mock_fetch):
        cls.network_info = {}

        cls.network_info["api_ip"] = ""
        cls.network_info["api_port"] = ""
        cls.network_info["topology"] = {}

        """
        Nodes with beginning with "P" are PoP nodes. All nodes beginning with
        the same letter (except PoPs) are connected via ethernet (physical)
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
            {"a_node_name": "A1", "z_node_name": "A2", "link_type": LinkType.ETHERNET},
            {"a_node_name": "A1", "z_node_name": "A3", "link_type": LinkType.ETHERNET},
            {"a_node_name": "A2", "z_node_name": "A3", "link_type": LinkType.ETHERNET},
            {"a_node_name": "B1", "z_node_name": "B2", "link_type": LinkType.ETHERNET},
            {"a_node_name": "C1", "z_node_name": "C2", "link_type": LinkType.ETHERNET},
            {"a_node_name": "D1", "z_node_name": "D2", "link_type": LinkType.ETHERNET},
            {"a_node_name": "E1", "z_node_name": "E2", "link_type": LinkType.ETHERNET},
            {"a_node_name": "F1", "z_node_name": "F2", "link_type": LinkType.ETHERNET},
            {"a_node_name": "A1", "z_node_name": "B1", "link_type": LinkType.WIRELESS},
            {"a_node_name": "B2", "z_node_name": "F1", "link_type": LinkType.WIRELESS},
            {"a_node_name": "F2", "z_node_name": "P1", "link_type": LinkType.WIRELESS},
            {"a_node_name": "A1", "z_node_name": "C1", "link_type": LinkType.WIRELESS},
            {"a_node_name": "C2", "z_node_name": "P2", "link_type": LinkType.WIRELESS},
            {"a_node_name": "A2", "z_node_name": "D1", "link_type": LinkType.WIRELESS},
            {"a_node_name": "D2", "z_node_name": "P2", "link_type": LinkType.WIRELESS},
            {"a_node_name": "A3", "z_node_name": "E1", "link_type": LinkType.WIRELESS},
            {"a_node_name": "E2", "z_node_name": "P3", "link_type": LinkType.WIRELESS},
        ]

        cls.node_name_to_routes = {
            r4n.name: r4n for r4n in get_routes_for_nodes(cls.network_info)
        }

    def test_return_size(self):
        """
        There should be one RoutesForNode object for every node in the network.
        """

        self.assertEqual(
            len(self.node_name_to_routes), len(self.network_info["topology"]["nodes"])
        )

    def test_pop_nodes(self):
        """
        Verify that PoP nodes have a 0 hop count since they are themselves their
        closest PoP nodes.
        """

        pop_node_names = {
            node["name"]
            for node in self.network_info["topology"]["nodes"]
            if node["pop_node"]
        }

        for name in pop_node_names:
            data = self.node_name_to_routes[name]
            self.assertEqual(data.num_hops, 0)

    def test_multiple_equidistant_pops(self):
        """
        Node A1 can reach both P2 and P3 in 2 wireless hops. Verify that both
        PoP names are present in A1's routes.
        """

        r4a1 = self.node_name_to_routes["A1"]
        a1_pop_names = {r2p.pop_name for r2p in r4a1.routes}

        self.assertIn("P2", a1_pop_names)
        self.assertIn("P3", a1_pop_names)

    def test_num_p2mp_hops(self):
        """
        Node A1 can reach P2 via ["A1", "C1", "C2", "P2"] which includes a
        P2MP hop as A1 is also wirelessly linked to B1. Verify that this route
        has one P2MP hop and is a member of A1"s routes.
        """

        r4a1 = self.node_name_to_routes["A1"]
        expected_r2p = RouteToPop(
            pop_name="P2", num_p2mp_hops=1, ecmp=True, path=["A1", "C1", "C2", "P2"]
        )

        self.assertIn(expected_r2p, r4a1.routes)

    def test_multiple_routes_to_same_pop(self):
        """
        Node A1 can reach each PoP through three distinct (but equal in terms of
        number of wireless hops) paths.

        Verify that ecmp is True for all routes.
        """

        r4a1 = self.node_name_to_routes["A1"]

        for r2p in r4a1.routes:
            self.assertTrue(r2p.ecmp)

    def test_get_non_ecmp_routes(self):
        """
        Node A1 has three unique equidistant routes to each PoP. Node B1 has
        only one unique route to each PoP. Verify that get_non_ecmp_routes will
        return empty for A1, but be length 3 for B1.
        """

        r4a1 = self.node_name_to_routes["A1"]
        r4b1 = self.node_name_to_routes["B1"]

        self.assertEqual(len(r4a1.get_non_ecmp_routes()), 0)
        self.assertEqual(len(r4b1.get_non_ecmp_routes()), 3)

    @mock.patch("module.routing.fetch_default_routes", side_effect=mocked_fetch)
    def test_filtered_node_names(self, mock_fetch):
        """
        get_routes_for_nodes can accept an additional (optional) argument that
        allows the user to provide a subset of node names to filter by. Verify
        that the output only contains RoutesForNode objects corresponding to the
        node names in the filter set.
        """

        node_filter_list = ["A1", "D2", "E1", "E2", "P3"]

        output = get_routes_for_nodes(self.network_info, node_filter_list)
        self.assertListEqual([r4n.name for r4n in output], node_filter_list)

    @mock.patch("module.routing.fetch_default_routes", side_effect=mocked_fetch)
    def test_non_existent_filtered_node_names(self, mock_fetch):
        """
        Verify that if a node name doesn't exist in the topology, no
        RoutesForNode object should be created for that node.
        """

        node_filter_set = ["A1", "D2", "Z"]

        output = get_routes_for_nodes(self.network_info, node_filter_set)
        self.assertListEqual([r4n.name for r4n in output], ["A1", "D2"])

    def test_route_to_pop_comparison(self):
        """
        Verify how RouteToPop objects are compared.
        """

        r2p_1 = RouteToPop(pop_name="A", num_p2mp_hops=10, ecmp=True, path=[])
        r2p_2 = RouteToPop(pop_name="B", num_p2mp_hops=0, ecmp=True, path=[])

        self.assertLess(r2p_1, r2p_2)

        r2p_2.pop_name = "A"
        self.assertLess(r2p_2, r2p_1)

    def test_route_for_node_equality(self):
        """
        Verify that RouteForPop objects can be equal, even if their routes lists
        are not the same order.
        """

        r2p_1 = RouteToPop(pop_name="A", num_p2mp_hops=0, ecmp=False, path=[])
        r2p_2 = RouteToPop(pop_name="B", num_p2mp_hops=10, ecmp=True, path=[])

        r4p_1 = RoutesForNode(name="A", num_hops=5, routes=[r2p_1, r2p_2])
        r4p_2 = RoutesForNode(name="A", num_hops=5, routes=[r2p_2, r2p_1])

        self.assertEqual(r4p_1, r4p_2)

if __name__ == "__main__":
    unittest.main()
