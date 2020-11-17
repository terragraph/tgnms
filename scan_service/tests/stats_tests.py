#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

from collections import defaultdict

import asynctest
from scan_service.utils.stats import get_latest_stats, reshape_values
from scan_service.utils.topology import Topology
from tglib.exceptions import ClientRuntimeError


class StatsTests(asynctest.TestCase):
    async def setUp(self) -> None:
        self.maxDiff = None

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
        with asynctest.patch(
            "tglib.clients.api_service_client.APIServiceClient.request",
            side_effect=[network_A, node_overrides_config_A],
        ):
            await Topology.update_topologies("network_A")

    def test_reshape_values(self) -> None:
        values = {}
        self.assertDictEqual(reshape_values("network_A", values), defaultdict())

        values = {"metric_A": []}
        self.assertDictEqual(reshape_values("network_A", values), defaultdict())

        values = {"metric_A": [{"metric": {"linkName": "dummy_link"}}]}
        self.assertDictEqual(reshape_values("network_A", values), defaultdict())

        values = {
            "metric_A": [
                {
                    "metric": {
                        "linkName": "link-TEST.18-41.s1-TEST.18-61.P5",
                        "nodeMac": "dummy_node_mac",
                    },
                    "values": [(0, 1)],
                }
            ]
        }
        self.assertDictEqual(reshape_values("network_A", values), defaultdict())

        values = {
            "metric_A": [
                {
                    "metric": {
                        "linkName": "link-TEST.18-41.s1-TEST.18-61.P5",
                        "nodeMac": "00:00:00:2f:e6:ea",
                    },
                    "values": [(0, 0)],
                }
            ]
        }
        self.assertDictEqual(
            reshape_values("network_A", values), {"00:00:00:2f:e9:43": {"metric_A": 0}}
        )

        values = {
            "metric_A": [
                {
                    "metric": {
                        "linkName": "link-TEST.18-41.s1-TEST.18-61.P5",
                        "nodeMac": "00:00:00:2f:e9:43",
                    },
                    "values": [(0, 1)],
                }
            ]
        }
        self.assertDictEqual(
            reshape_values("network_A", values), {"00:00:00:2f:e6:ea": {"metric_A": 1}}
        )

    async def test_get_latest_stats_failed(self) -> None:
        with asynctest.patch(
            "tglib.clients.prometheus_client.PrometheusClient.query_range",
            return_value={"status": "failed"},
        ):
            stats = await get_latest_stats(
                "network_A", "dummy_mac", ["metrics_A"], 300, 30
            )
            self.assertDictEqual(stats, defaultdict())

        with asynctest.patch(
            "tglib.clients.prometheus_client.PrometheusClient.query_range",
            return_value=ClientRuntimeError(),
        ):
            stats = await get_latest_stats(
                "network_A", "dummy_mac", ["metrics_A"], 300, 30
            )
            self.assertDictEqual(stats, defaultdict())

        with asynctest.patch(
            "tglib.clients.prometheus_client.PrometheusClient.query_range",
            return_value={"status": "success", "data": {"result": []}},
        ):
            stats = await get_latest_stats(
                "network_A", "dummy_mac", ["metrics_A"], 300, 30
            )
            self.assertDictEqual(stats, defaultdict())

        with asynctest.patch(
            "tglib.clients.prometheus_client.PrometheusClient.query_range",
            return_value={
                "status": "success",
                "data": {
                    "result": [
                        {
                            "metric": {
                                "linkName": "link-TEST.18-41.s1-TEST.18-61.P5",
                                "nodeMac": "00:00:00:2f:e6:ea",
                            },
                            "values": [(0, 0)],
                        }
                    ]
                },
            },
        ):
            stats = await get_latest_stats(
                "network_A", "dummy_mac", ["metrics_A"], 300, 30
            )
            self.assertDictEqual(stats, {"00:00:00:2f:e9:43": {"metrics_A": 0}})
