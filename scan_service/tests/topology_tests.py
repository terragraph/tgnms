#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

from collections import defaultdict

import asynctest
from scan_service.utils.topology import Topology
from tglib.exceptions import ClientRuntimeError


class TopologyTests(asynctest.TestCase):
    def setUp(self) -> None:
        self.maxDiff = None

    async def test_update_topologies(self) -> None:
        # Reset Topology class variables before start of the tests
        Topology.topology = {}
        Topology.node_name_to_mac = defaultdict(dict)
        Topology.node_mac_to_name = defaultdict(dict)
        Topology.link_name_to_mac = defaultdict(dict)
        Topology.mac_to_link_name = defaultdict(dict)
        Topology.node_channel = defaultdict(dict)
        Topology.node_polarity = defaultdict(dict)

        network_A = {
            "name": "network_A",
            "nodes": [
                {"name": "TEST.18-41.s1", "mac_addr": "00:00:00:2f:e6:ea"},
                {"name": "TEST.18-61.P5", "mac_addr": "00:00:00:2f:e9:43"},
            ],
            "links": [
                {
                    "name": "link-TEST.18-41.s1-TEST.18-61.P5",
                    "a_node_name": "TEST.18-41.s1",
                    "z_node_name": "TEST.18-61.P5",
                    "a_node_mac": "00:00:00:2f:e6:ea",
                    "z_node_mac": "00:00:00:2f:e9:43",
                    "link_type": 1,
                },
                {
                    "name": "link-TEST.18-41.p1-TEST.18-41.s1",
                    "a_node_name": "TEST.18-41.p1",
                    "z_node_name": "TEST.18-41.s1",
                    "a_node_mac": "00:00:00:2y:e6:rt",
                    "z_node_mac": "00:00:00:yf:yw:yy",
                    "link_type": 2,
                },
            ],
        }
        network_B = {
            "name": "network_B",
            "nodes": [
                {"name": "TEST.18-37.S1", "mac_addr": "00:00:00:28:e8:bc"},
                {"name": "TEST.18-36.p2", "mac_addr": "00:00:00:ca:1d:e5"},
            ],
            "links": [
                {
                    "name": "link-TEST.18-36.p2-TEST.18-37.S1",
                    "a_node_name": "TEST.18-36.p2",
                    "z_node_name": "TEST.18-37.S1",
                    "a_node_mac": "00:00:00:ca:1d:e5",
                    "z_node_mac": "00:00:00:28:e8:bc",
                    "link_type": 1,
                },
                {
                    "name": "link-TEST.18-60.P2-TEST.18-60.S2",
                    "a_node_name": "TEST.18-60.P2",
                    "z_node_name": "TEST.18-60.S2",
                    "a_node_mac": "00:00:00:2f:e6:ea",
                    "z_node_mac": "",
                    "link_type": 2,
                },
            ],
        }
        network_C = {
            "name": "network_C",
            "nodes": [
                {"name": "TEST.18-37.S1", "mac_addr": ""},
                {"name": "TEST.18-36.p2", "mac_addr": ""},
            ],
            "links": [
                {
                    "name": "link-TEST.18-36.p2-TEST.18-37.S1",
                    "a_node_name": "TEST.18-36.p2",
                    "z_node_name": "TEST.18-37.S1",
                    "a_node_mac": "",
                    "z_node_mac": "",
                    "link_type": 1,
                },
                {
                    "name": "link-TEST.18-60.P2-TEST.18-60.S2",
                    "a_node_name": "TEST.18-60.P2",
                    "z_node_name": "TEST.18-60.S2",
                    "a_node_mac": "00:00:00:2f:e6:ea",
                    "z_node_mac": "",
                    "link_type": 2,
                },
            ],
        }

        node_overrides_config_A = {
            "overrides": "{"
            '"TEST.18-41.s1": {'
            '    "radioParamsOverride": {'
            '        "00:00:00:2f:e6:ea": {"fwParams": {"channel": 1, "polarity": 2}}'
            "    }"
            "  },"
            '"TEST.18-61.P5": {'
            '    "radioParamsOverride": {'
            '        "00:00:00:2f:e9:43": {"fwParams": {"channel": 0, "polarity": 1}}'
            "    }"
            "  }"
            "}"
        }
        node_overrides_config_B = {
            "overrides": "{"
            '"TEST.18-37.S1": {'
            '    "radioParamsOverride": {'
            '        "00:00:00:28:e8:bc": {"fwParams": {"channel": 2, "polarity": 0}}'
            "    }"
            "  },"
            '"TEST.18-36.p2": {'
            '    "radioParamsOverride": {'
            '        "00:00:00:ca:1d:e5": {}'
            "    }"
            "  }"
            "}"
        }

        with asynctest.patch(
            "tglib.clients.api_service_client.APIServiceClient.request",
            return_value=ClientRuntimeError(),
        ):
            await Topology.update_topologies("network_A")
            self.assertDictEqual(Topology.topology, defaultdict(dict))
            self.assertDictEqual(Topology.node_name_to_mac, defaultdict(dict))
            self.assertDictEqual(Topology.node_mac_to_name, defaultdict(dict))
            self.assertDictEqual(Topology.link_name_to_mac, defaultdict(dict))
            self.assertDictEqual(Topology.mac_to_link_name, defaultdict(dict))
            self.assertDictEqual(Topology.node_channel, defaultdict(dict))
            self.assertDictEqual(Topology.node_polarity, defaultdict(dict))

        with asynctest.patch(
            "tglib.clients.api_service_client.APIServiceClient.request", return_value={}
        ):
            await Topology.update_topologies("network_A")
            self.assertDictEqual(Topology.topology, defaultdict(dict))
            self.assertDictEqual(Topology.node_name_to_mac, defaultdict(dict))
            self.assertDictEqual(Topology.node_mac_to_name, defaultdict(dict))
            self.assertDictEqual(Topology.link_name_to_mac, defaultdict(dict))
            self.assertDictEqual(Topology.mac_to_link_name, defaultdict(dict))
            self.assertDictEqual(Topology.node_channel, defaultdict(dict))
            self.assertDictEqual(Topology.node_polarity, defaultdict(dict))

        with asynctest.patch(
            "tglib.clients.api_service_client.APIServiceClient.request_all",
            return_value={"network_A": {}, "network_B": {}},
        ):
            await Topology.update_topologies()
            self.assertDictEqual(Topology.topology, defaultdict(dict))
            self.assertDictEqual(Topology.node_name_to_mac, defaultdict(dict))
            self.assertDictEqual(Topology.node_mac_to_name, defaultdict(dict))
            self.assertDictEqual(Topology.link_name_to_mac, defaultdict(dict))
            self.assertDictEqual(Topology.mac_to_link_name, defaultdict(dict))
            self.assertDictEqual(Topology.node_channel, defaultdict(dict))
            self.assertDictEqual(Topology.node_polarity, defaultdict(dict))

        with asynctest.patch(
            "tglib.clients.api_service_client.APIServiceClient.request",
            side_effect=[network_A, node_overrides_config_A],
        ):
            await Topology.update_topologies("network_A")
            self.assertDictEqual(Topology.topology, {"network_A": network_A})
            self.assertDictEqual(
                Topology.node_name_to_mac,
                {
                    "network_A": {
                        "TEST.18-41.s1": "00:00:00:2f:e6:ea",
                        "TEST.18-61.P5": "00:00:00:2f:e9:43",
                    }
                },
            )
            self.assertDictEqual(
                Topology.node_mac_to_name,
                {
                    "network_A": {
                        "00:00:00:2f:e6:ea": "TEST.18-41.s1",
                        "00:00:00:2f:e9:43": "TEST.18-61.P5",
                    }
                },
            )
            self.assertDictEqual(
                Topology.link_name_to_mac,
                {
                    "network_A": {
                        "link_TEST_18_41_s1_TEST_18_61_P5": (
                            "00:00:00:2f:e6:ea",
                            "00:00:00:2f:e9:43",
                        )
                    }
                },
            )
            self.assertDictEqual(
                Topology.mac_to_link_name,
                {
                    "network_A": {
                        (
                            "00:00:00:2f:e6:ea",
                            "00:00:00:2f:e9:43",
                        ): "link-TEST.18-41.s1-TEST.18-61.P5",
                        (
                            "00:00:00:2f:e9:43",
                            "00:00:00:2f:e6:ea",
                        ): "link-TEST.18-41.s1-TEST.18-61.P5",
                    }
                },
            )
            self.assertDictEqual(
                Topology.node_channel,
                {"network_A": {"00:00:00:2f:e6:ea": 1, "00:00:00:2f:e9:43": 0}},
            )
            self.assertDictEqual(
                Topology.node_polarity,
                {"network_A": {"00:00:00:2f:e6:ea": 2, "00:00:00:2f:e9:43": 1}},
            )

        with asynctest.patch(
            "tglib.clients.api_service_client.APIServiceClient.request_all",
            return_value={
                "network_A": network_A,
                "network_B": network_B,
                "network_C": network_C,
            },
        ), asynctest.patch(
            "tglib.clients.api_service_client.APIServiceClient.request",
            side_effect=[node_overrides_config_A, node_overrides_config_B],
        ):
            await Topology.update_topologies()
            self.assertDictEqual(
                Topology.topology,
                {
                    "network_A": network_A,
                    "network_B": network_B,
                    "network_C": network_C,
                },
            )
            self.assertDictEqual(
                Topology.node_name_to_mac,
                {
                    "network_A": {
                        "TEST.18-41.s1": "00:00:00:2f:e6:ea",
                        "TEST.18-61.P5": "00:00:00:2f:e9:43",
                    },
                    "network_B": {
                        "TEST.18-37.S1": "00:00:00:28:e8:bc",
                        "TEST.18-36.p2": "00:00:00:ca:1d:e5",
                    },
                    "network_C": {"TEST.18-37.S1": "", "TEST.18-36.p2": ""},
                },
            )
            self.assertDictEqual(
                Topology.node_mac_to_name,
                {
                    "network_A": {
                        "00:00:00:2f:e6:ea": "TEST.18-41.s1",
                        "00:00:00:2f:e9:43": "TEST.18-61.P5",
                    },
                    "network_B": {
                        "00:00:00:28:e8:bc": "TEST.18-37.S1",
                        "00:00:00:ca:1d:e5": "TEST.18-36.p2",
                    },
                    "network_C": {"": "TEST.18-36.p2"},
                },
            )
            self.assertDictEqual(
                Topology.link_name_to_mac,
                {
                    "network_A": {
                        "link_TEST_18_41_s1_TEST_18_61_P5": (
                            "00:00:00:2f:e6:ea",
                            "00:00:00:2f:e9:43",
                        )
                    },
                    "network_B": {
                        "link_TEST_18_36_p2_TEST_18_37_S1": (
                            "00:00:00:ca:1d:e5",
                            "00:00:00:28:e8:bc",
                        )
                    },
                },
            )
            self.assertDictEqual(
                Topology.mac_to_link_name,
                {
                    "network_A": {
                        (
                            "00:00:00:2f:e6:ea",
                            "00:00:00:2f:e9:43",
                        ): "link-TEST.18-41.s1-TEST.18-61.P5",
                        (
                            "00:00:00:2f:e9:43",
                            "00:00:00:2f:e6:ea",
                        ): "link-TEST.18-41.s1-TEST.18-61.P5",
                    },
                    "network_B": {
                        (
                            "00:00:00:ca:1d:e5",
                            "00:00:00:28:e8:bc",
                        ): "link-TEST.18-36.p2-TEST.18-37.S1",
                        (
                            "00:00:00:28:e8:bc",
                            "00:00:00:ca:1d:e5",
                        ): "link-TEST.18-36.p2-TEST.18-37.S1",
                    },
                },
            )
            self.assertDictEqual(
                Topology.node_channel,
                {
                    "network_A": {"00:00:00:2f:e6:ea": 1, "00:00:00:2f:e9:43": 0},
                    "network_B": {"00:00:00:28:e8:bc": 2},
                },
            )
            self.assertDictEqual(
                Topology.node_polarity,
                {
                    "network_A": {"00:00:00:2f:e6:ea": 2, "00:00:00:2f:e9:43": 1},
                    "network_B": {"00:00:00:28:e8:bc": 0},
                },
            )
