#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import json
from collections import defaultdict

import aiohttp
import asynctest
from network_health_service.stats.fetch_stats import (
    fetch_network_link_health,
    fetch_network_node_health,
    fetch_prometheus_stats,
    fetch_query_link_avail,
    fetch_scan_stats,
)
from network_health_service.stats.metrics import Metrics
from tglib.exceptions import ClientRuntimeError


class FetchStatsTests(asynctest.TestCase):
    def setUp(self) -> None:
        self.maxDiff = None
        with open("tests/metrics.json") as f:
            metrics = json.load(f)
            Metrics.update_metrics(metrics, prometheus_hold_time=30)

    @asynctest.patch(
        "tglib.clients.prometheus_client.PrometheusClient.query_latest",
        return_value={"status": "success", "data": {"result": []}},
    )
    async def test_fetch_prometheus_stats_no_results(self, mock_query_latest) -> None:
        link_stats = {"network_A": defaultdict()}
        node_stats = {"network_A": defaultdict()}
        await fetch_prometheus_stats("network_A", 0, 3600, link_stats, node_stats)
        self.assertDictEqual(link_stats, {"network_A": defaultdict()})
        self.assertDictEqual(node_stats, {"network_A": defaultdict()})

    @asynctest.patch(
        "tglib.clients.prometheus_client.PrometheusClient.query_latest",
        side_effect=[
            {
                "metric": "analytics_alignment_status",
                "status": "success",
                "data": {"result": [{"metric": {"linkName": "link"}, "value": (0, 0)}]},
            },
            {
                "metric": "topology_link_is_online",
                "status": "success",
                "data": {"result": [{"metric": {"linkName": "link"}, "value": (0, 1)}]},
            },
            {
                "metric": "tx_byte",
                "status": "success",
                "data": {"result": [{"metric": {"linkName": "link"}, "value": (0, 2)}]},
            },
            {
                "metric": "analytics_foliage_factor",
                "status": "success",
                "data": {"result": [{"metric": {"linkName": "link"}, "value": (0, 3)}]},
            },
            {
                "metric": "drs_cn_egress_routes_count",
                "status": "success",
                "data": {"result": [{"metric": {"linkName": "link"}, "value": (0, 4)}]},
            },
            {
                "metric": "tx_ok",
                "status": "success",
                "data": {"result": [{"metric": {"linkName": "link"}, "value": (0, 5)}]},
            },
            {
                "metric": "link_avail",
                "status": "success",
                "data": {"result": [{"metric": {"linkName": "link"}, "value": (0, 6)}]},
            },
            {
                "metric": "mcs",
                "status": "success",
                "data": {"result": [{"metric": {"linkName": "link"}, "value": (0, 7)}]},
            },
            {
                "metric": "mcs_diff",
                "status": "success",
                "data": {"result": [{"metric": {"linkName": "link"}, "value": (0, 8)}]},
            },
            {
                "metric": "tx_power_diff",
                "status": "success",
                "data": {"result": [{"metric": {"linkName": "link"}, "value": (0, 9)}]},
            },
            {
                "metric": "analytics_cn_power_status",
                "status": "success",
                "data": {
                    "result": [{"metric": {"nodeName": "node"}, "value": (0, 10)}]
                },
            },
            {
                "metric": "topology_node_is_online",
                "status": "success",
                "data": {
                    "result": [{"metric": {"nodeName": "node"}, "value": (0, 11)}]
                },
            },
            {
                "metric": "udp_pinger_loss_ratio",
                "status": "success",
                "data": {
                    "result": [{"metric": {"nodeName": "node"}, "value": (0, 12)}]
                },
            },
            {"metric": "node_online", "status": "failed"},
            ClientRuntimeError(),
        ],
    )
    async def test_fetch_prometheus_stats_results(self, mock_query_latest) -> None:
        link_stats = {"network_A": defaultdict(lambda: defaultdict())}
        node_stats = {"network_A": defaultdict(lambda: defaultdict())}
        await fetch_prometheus_stats("network_A", 0, 3600, link_stats, node_stats)
        self.assertDictEqual(
            link_stats,
            {
                "network_A": {
                    "link": {
                        "analytics_alignment_status": 0.0,
                        "topology_link_is_online": 1.0,
                        "tx_byte": 2.0,
                        "analytics_foliage_factor": 3.0,
                        "drs_cn_egress_routes_count": 4.0,
                        "tx_ok": 5.0,
                        "link_avail": 6.0,
                        "mcs": 7.0,
                        "mcs_diff": 8.0,
                        "tx_power_diff": 9.0,
                    }
                }
            },
        )
        self.assertDictEqual(
            node_stats,
            {
                "network_A": {
                    "node": {
                        "analytics_cn_power_status": 10.0,
                        "topology_node_is_online": 11.0,
                        "udp_pinger_loss_ratio": 12.0,
                    }
                }
            },
        )

    @asynctest.patch("aiohttp.ClientSession.get")
    async def test_fetch_network_link_health(self, get) -> None:
        link_stats = {"network_A": defaultdict(lambda: defaultdict())}

        async with aiohttp.ClientSession() as session:
            get.return_value.__aenter__.return_value.status = 500
            await fetch_network_link_health("network_A", 0, 3600, link_stats, session)
            self.assertDictEqual(link_stats, {"network_A": defaultdict()})

            get.return_value.__aenter__.return_value.status = 200
            get.return_value.__aenter__.return_value.read = asynctest.CoroutineMock(
                return_value="{}"
            )
            await fetch_network_link_health("network_A", 0, 3600, link_stats, session)
            self.assertDictEqual(link_stats, {"network_A": defaultdict()})

            get.side_effect = aiohttp.ClientError()
            await fetch_network_link_health("network_A", 0, 3600, link_stats, session)
            self.assertDictEqual(link_stats, {"network_A": defaultdict()})

            get.side_effect = None
            get.return_value.__aenter__.return_value.read = asynctest.CoroutineMock(
                side_effect=[
                    '{"executions": [{"id": 0}, {"id": 1}, {"id": 2}]}',
                    '{"results": [{"asset_name": "link", "health": null}]}',
                ]
            )
            await fetch_network_link_health("network_A", 0, 3600, link_stats, session)
            self.assertDictEqual(link_stats, {"network_A": defaultdict()})

            get.return_value.__aenter__.return_value.read = asynctest.CoroutineMock(
                side_effect=[
                    '{"executions": [{"id": 0}, {"id": 1}, {"id": 2}]}',
                    '{"results": [{"asset_name": "link", "health": "MISSING"}]}',
                ]
            )
            await fetch_network_link_health("network_A", 0, 3600, link_stats, session)
            self.assertDictEqual(link_stats, {"network_A": defaultdict()})

            get.return_value.__aenter__.return_value.read = asynctest.CoroutineMock(
                side_effect=[
                    '{"executions": [{"id": 0}, {"id": 1}, {"id": 2}]}',
                    '{"results": [{"asset_name": "link", "health": "EXCELLENT"}]}',
                ]
            )
            await fetch_network_link_health("network_A", 0, 3600, link_stats, session)
            self.assertDictEqual(
                link_stats, {"network_A": {"link": {"link_health": 1.0}}}
            )

    @asynctest.patch("aiohttp.ClientSession.get")
    async def test_fetch_network_node_health(self, get) -> None:
        node_stats = {"network_A": defaultdict(lambda: defaultdict())}

        async with aiohttp.ClientSession() as session:
            get.return_value.__aenter__.return_value.status = 500
            await fetch_network_node_health("network_A", 0, 3600, node_stats, session)
            self.assertDictEqual(node_stats, {"network_A": defaultdict()})

            get.return_value.__aenter__.return_value.status = 200
            get.return_value.__aenter__.return_value.read = asynctest.CoroutineMock(
                return_value="{}"
            )
            await fetch_network_node_health("network_A", 0, 3600, node_stats, session)
            self.assertDictEqual(node_stats, {"network_A": defaultdict()})

            get.side_effect = aiohttp.ClientError()
            await fetch_network_node_health("network_A", 0, 3600, node_stats, session)
            self.assertDictEqual(node_stats, {"network_A": defaultdict()})

            get.side_effect = None
            get.return_value.__aenter__.return_value.read = asynctest.CoroutineMock(
                side_effect=[
                    '{"executions": [{"id": 0}, {"id": 1}, {"id": 2}]}',
                    '{"results": [{"asset_name": "node", "health": null}]}',
                ]
            )
            await fetch_network_node_health("network_A", 0, 3600, node_stats, session)
            self.assertDictEqual(node_stats, {"network_A": defaultdict()})

            get.return_value.__aenter__.return_value.read = asynctest.CoroutineMock(
                side_effect=[
                    '{"executions": [{"id": 0}, {"id": 1}, {"id": 2}]}',
                    '{"results": [{"asset_name": "node", "health": "MISSING"}]}',
                ]
            )
            await fetch_network_node_health("network_A", 0, 3600, node_stats, session)
            self.assertDictEqual(node_stats, {"network_A": defaultdict()})

            get.return_value.__aenter__.return_value.read = asynctest.CoroutineMock(
                side_effect=[
                    '{"executions": [{"id": 0}, {"id": 1}, {"id": 2}]}',
                    '{"results": [{"asset_name": "node", "health": "GOOD"}]}',
                ]
            )
            await fetch_network_node_health("network_A", 0, 3600, node_stats, session)
            self.assertDictEqual(
                node_stats, {"network_A": {"node": {"node_health": 2.0}}}
            )

    @asynctest.patch("aiohttp.ClientSession.get")
    async def test_fetch_scan_stats(self, get) -> None:
        link_stats = {"network_A": defaultdict(lambda: defaultdict())}

        async with aiohttp.ClientSession() as session:
            get.return_value.__aenter__.return_value.status = 500
            await fetch_scan_stats("network_A", 0, 3600, link_stats, session)
            self.assertDictEqual(link_stats, {"network_A": defaultdict()})

            get.return_value.__aenter__.return_value.status = 200
            get.return_value.__aenter__.return_value.read = asynctest.CoroutineMock(
                return_value="{}"
            )
            await fetch_scan_stats("network_A", 0, 3600, link_stats, session)
            self.assertDictEqual(link_stats, {"network_A": defaultdict()})

            get.return_value.__aenter__.return_value.read = asynctest.CoroutineMock(
                side_effect=[
                    '{"executions": [{"id": 0}, {"id": 1}, {"id": 2}]}',
                    '{"aggregated_inr": {}}',
                ]
            )
            await fetch_scan_stats("network_A", 0, 3600, link_stats, session)
            self.assertDictEqual(link_stats, {"network_A": defaultdict()})

            get.side_effect = aiohttp.ClientError()
            await fetch_scan_stats("network_A", 0, 3600, link_stats, session)
            self.assertDictEqual(link_stats, {"network_A": defaultdict()})

            get.side_effect = None
            get.return_value.__aenter__.return_value.read = asynctest.CoroutineMock(
                side_effect=[
                    '{"executions": [{"id": 0}, {"id": 1}, {"id": 2}]}',
                    '{"aggregated_inr": {"n_day_avg": {"link": [{"inr_curr_power": 2}, {"inr_curr_power": 4}]}}}',
                ]
            )
            await fetch_scan_stats("network_A", 0, 3600, link_stats, session)
            self.assertDictEqual(
                link_stats, {"network_A": {"link": {"interference": 4.0}}}
            )

    @asynctest.patch("aiohttp.ClientSession.get")
    async def test_fetch_query_link_avail(self, get) -> None:
        link_stats = {"network_A": defaultdict(lambda: defaultdict())}

        async with aiohttp.ClientSession() as session:
            get.return_value.__aenter__.return_value.status = 500
            await fetch_query_link_avail("network_A", 3600, link_stats, session)
            self.assertDictEqual(link_stats, {"network_A": defaultdict()})

            get.return_value.__aenter__.return_value.status = 200
            get.return_value.__aenter__.return_value.read = asynctest.CoroutineMock(
                return_value="{}"
            )
            await fetch_query_link_avail("network_A", 3600, link_stats, session)
            self.assertDictEqual(link_stats, {"network_A": defaultdict()})

            get.side_effect = aiohttp.ClientError()
            await fetch_query_link_avail("network_A", 3600, link_stats, session)
            self.assertDictEqual(link_stats, {"network_A": defaultdict()})

            get.side_effect = None
            get.return_value.__aenter__.return_value.read = asynctest.CoroutineMock(
                return_value='{"events": {"link": {"linkAlive": 2, "linkAvailForData": 3}}}'
            )
            await fetch_query_link_avail("network_A", 3600, link_stats, session)
            self.assertDictEqual(
                link_stats,
                {
                    "network_A": {
                        "link": {"link_alive": 2.0, "link_avail_for_data": 3.0}
                    }
                },
            )
