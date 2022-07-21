#!/usr/bin/env python3

# Copyright (c) Meta Platforms, Inc. and affiliates.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

import json
import unittest

from network_health_service.models import Health
from network_health_service.stats.health import (
    get_health,
    get_link_stats_health,
    get_node_stats_health,
)
from network_health_service.stats.metrics import Metrics


class Descriptions:
    alignment_ok_percent = "Percentage of time TX and RX beam-angles were reasonable."
    topo_link_online_percent = (
        "Percentage of time the link was marked online by the controller."
    )
    link_alive_percent = "Percentage of time the link was marked alive in link stats."
    link_avail_for_data_percent = "Percentage of time the link was available for data."
    tx_byte_gbps = "75th percentile of TX bytes in Gbps."
    foliage_factor = "75th percentile of foliage factor."
    cn_routes_count = "75th percentile of number of CNs being routed through the link."
    tx_ok_total = "75th percentile of TX MPDUs per second."
    link_resets_count = "Number of link resets per hour."
    mcs = "75th percentile of MCS."
    mcs_diff = "75th percentile of difference in MCS for A and Z direction."
    tx_power_idx_diff = (
        "75th percentile of difference in TX power index for A and Z direction."
    )
    link_tput_health = "Health from the latest parallel/sequential throughput test."
    inr_db = "Interference for the link in dB."
    cn_power_ok_percent = (
        "Percentage of time the CN node was estimated to be powered on."
    )
    topo_node_online_percent = (
        "Percentage of time the node was marked online by the controller."
    )
    pinger_no_loss_perecnt = "Percentage of time node was reachable via pings."
    pinger_rtt_avg_ms = "75th percentile of average ping RTT in ms."
    reroutes_estimate_min = "Lower bound on number of reroutes for the node per hour."
    min_route_mcs = "75th percentile of node's minimum upstream route MCS."
    node_tput_health = "Health from the latest node throughput test."


class HealthTests(unittest.TestCase):
    def setUp(self) -> None:
        self.maxDiff = None
        with open("tests/metrics.json") as f:
            metrics = json.load(f)
            Metrics.update_metrics(
                metrics, prometheus_hold_time=30, use_real_throughput=True
            )

    def test_get_health(self) -> None:
        poor_health = get_health(0, Metrics.analytics_alignment_status)
        self.assertEqual(poor_health, Health.POOR.name)
        good_health = get_health(97, Metrics.analytics_alignment_status)
        self.assertEqual(good_health, Health.GOOD.name)
        excellent_health = get_health(100, Metrics.analytics_alignment_status)
        self.assertEqual(excellent_health, Health.EXCELLENT.name)

        poor_health = get_health(1.3, Metrics.tx_byte)
        self.assertEqual(poor_health, Health.POOR.name)
        good_health = get_health(1.0, Metrics.tx_byte)
        self.assertEqual(good_health, Health.GOOD.name)
        excellent_health = get_health(0.8, Metrics.tx_byte)
        self.assertEqual(excellent_health, Health.EXCELLENT.name)

    def test_get_link_stats_health(self) -> None:
        link_stats_map = {
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
            "link_alive": 10.0,
            "link_avail_for_data": 11.0,
            "link_health": 12.0,
            "interference": 13.0,
        }
        bit_map, link_health = get_link_stats_health(link_stats_map, 3600)
        self.assertEqual(bit_map, "01111101000111")
        self.assertDictEqual(
            link_health,
            {
                "overall_health": 4,
                "stats": {
                    "alignment_ok_percent": {
                        "description": Descriptions.alignment_ok_percent,
                        "health": "POOR",
                        "value": 0.0,
                    },
                    "foliage_factor": {
                        "description": Descriptions.foliage_factor,
                        "health": "POOR",
                        "value": 3.0,
                    },
                    "cn_routes_count": {
                        "description": Descriptions.cn_routes_count,
                        "health": "GOOD",
                        "value": 4.0,
                    },
                    "inr_db": {
                        "description": Descriptions.inr_db,
                        "health": "POOR",
                        "value": 13.0,
                    },
                    "link_alive_percent": {
                        "description": Descriptions.link_alive_percent,
                        "health": "POOR",
                        "value": 10.0,
                    },
                    "link_resets_count": {
                        "description": Descriptions.link_resets_count,
                        "health": "EXCELLENT",
                        "value": 6.0,
                    },
                    "link_avail_for_data_percent": {
                        "description": Descriptions.link_avail_for_data_percent,
                        "health": "POOR",
                        "value": 11.0,
                    },
                    "link_tput_health": {
                        "description": Descriptions.link_tput_health,
                        "health": "POOR",
                        "value": 12.0,
                    },
                    "mcs": {
                        "description": Descriptions.mcs,
                        "health": "GOOD",
                        "value": 7.0,
                    },
                    "mcs_diff": {
                        "description": Descriptions.mcs_diff,
                        "health": "POOR",
                        "value": 8.0,
                    },
                    "topo_link_online_percent": {
                        "description": Descriptions.topo_link_online_percent,
                        "health": "POOR",
                        "value": 0.833,
                    },
                    "tx_byte_gbps": {
                        "description": Descriptions.tx_byte_gbps,
                        "health": "EXCELLENT",
                        "value": 0.0,
                    },
                    "tx_ok_total": {
                        "description": Descriptions.tx_ok_total,
                        "health": "EXCELLENT",
                        "value": 5.0,
                    },
                    "tx_power_idx_diff": {
                        "description": Descriptions.tx_power_idx_diff,
                        "health": "POOR",
                        "value": 9.0,
                    },
                },
            },
        )

        link_stats_map = {
            "link_avail": 0.0,
            "link_avail_for_data": 100.0,
            "link_health": 1.0,
        }
        bit_map, link_health = get_link_stats_health(link_stats_map, 3600)
        self.assertEqual(bit_map, "00000000000000")
        self.assertDictEqual(
            link_health,
            {
                "overall_health": 1,
                "stats": {
                    "link_resets_count": {
                        "description": Descriptions.link_resets_count,
                        "health": "EXCELLENT",
                        "value": 0.0,
                    },
                    "link_avail_for_data_percent": {
                        "description": Descriptions.link_avail_for_data_percent,
                        "health": "EXCELLENT",
                        "value": 100.0,
                    },
                    "link_tput_health": {
                        "description": Descriptions.link_tput_health,
                        "health": "EXCELLENT",
                        "value": 1.0,
                    },
                },
            },
        )

        link_stats_map = {
            "link_avail": 0.0,
            "link_avail_for_data": 99.8,
            "link_health": 1.0,
        }
        bit_map, link_health = get_link_stats_health(link_stats_map, 3600)
        self.assertEqual(bit_map, "00000000000000")
        self.assertDictEqual(
            link_health,
            {
                "overall_health": 2,
                "stats": {
                    "link_resets_count": {
                        "description": Descriptions.link_resets_count,
                        "health": "EXCELLENT",
                        "value": 0.0,
                    },
                    "link_avail_for_data_percent": {
                        "description": Descriptions.link_avail_for_data_percent,
                        "health": "GOOD",
                        "value": 99.8,
                    },
                    "link_tput_health": {
                        "description": Descriptions.link_tput_health,
                        "health": "EXCELLENT",
                        "value": 1.0,
                    },
                },
            },
        )

        # Disable use_real_throughput
        Metrics.use_real_throughput = False
        link_stats_map = {
            "link_avail": 0.0,
            "link_avail_for_data": 99.8,
            "mcs": 11.0,
        }
        bit_map, link_health = get_link_stats_health(link_stats_map, 30)
        self.assertEqual(bit_map, "00000000000000")
        self.assertDictEqual(
            link_health,
            {
                "overall_health": 2,
                "stats": {
                    "link_resets_count": {
                        "description": Descriptions.link_resets_count,
                        "health": "EXCELLENT",
                        "value": 0.0,
                    },
                    "link_avail_for_data_percent": {
                        "description": Descriptions.link_avail_for_data_percent,
                        "health": "GOOD",
                        "value": 99.8,
                    },
                    "mcs": {
                        "description": Descriptions.mcs,
                        "health": "EXCELLENT",
                        "value": 11.0,
                    },
                },
            },
        )

    def test_get_node_stats_health(self) -> None:
        node_stats_map = {
            "analytics_cn_power_status": 10.0,
            "topology_node_is_online": 11.0,
            "udp_pinger_loss_ratio": 12.0,
            "udp_pinger_rtt_avg": 14.0,
            "node_health": 15.0,
            "drs_default_routes_changed": 16.0,
            "min_route_mcs": 3.0,
        }
        bit_map, node_health = get_node_stats_health(node_stats_map, 3600)
        self.assertEqual(bit_map, "1011111")
        self.assertDictEqual(
            node_health,
            {
                "overall_health": 4,
                "stats": {
                    "cn_power_ok_percent": {
                        "description": Descriptions.cn_power_ok_percent,
                        "health": "POOR",
                        "value": 83.333,
                    },
                    "node_tput_health": {
                        "description": Descriptions.node_tput_health,
                        "health": "POOR",
                        "value": 15.0,
                    },
                    "topo_node_online_percent": {
                        "description": Descriptions.topo_node_online_percent,
                        "health": "POOR",
                        "value": 9.167,
                    },
                    "pinger_no_loss_perecnt": {
                        "description": Descriptions.pinger_no_loss_perecnt,
                        "health": "POOR",
                        "value": 10.0,
                    },
                    "pinger_rtt_avg_ms": {
                        "description": Descriptions.pinger_rtt_avg_ms,
                        "health": "EXCELLENT",
                        "value": 14.0,
                    },
                    "reroutes_estimate_min": {
                        "description": Descriptions.reroutes_estimate_min,
                        "health": "POOR",
                        "value": 16.0,
                    },
                    "min_route_mcs": {
                        "description": Descriptions.min_route_mcs,
                        "health": "POOR",
                        "value": 3.0,
                    },
                },
            },
        )

        node_stats_map = {
            "udp_pinger_loss_ratio": 1.0,
            "udp_pinger_rtt_avg": 0.0,
            "node_health": 1.0,
        }
        bit_map, node_health = get_node_stats_health(node_stats_map, 30)
        self.assertEqual(bit_map, "0000000")
        self.assertDictEqual(
            node_health,
            {
                "overall_health": 1,
                "stats": {
                    "node_tput_health": {
                        "description": Descriptions.node_tput_health,
                        "health": "EXCELLENT",
                        "value": 1.0,
                    },
                    "pinger_no_loss_perecnt": {
                        "description": Descriptions.pinger_no_loss_perecnt,
                        "health": "EXCELLENT",
                        "value": 100.0,
                    },
                    "pinger_rtt_avg_ms": {
                        "description": Descriptions.pinger_rtt_avg_ms,
                        "health": "EXCELLENT",
                        "value": 0.0,
                    },
                },
            },
        )

        node_stats_map = {
            "udp_pinger_loss_ratio": 1.0,
            "udp_pinger_rtt_avg": 0.0,
            "node_health": 2.0,
        }
        bit_map, node_health = get_node_stats_health(node_stats_map, 30)
        self.assertEqual(bit_map, "0000000")
        self.assertDictEqual(
            node_health,
            {
                "overall_health": 2,
                "stats": {
                    "node_tput_health": {
                        "description": Descriptions.node_tput_health,
                        "health": "GOOD",
                        "value": 2.0,
                    },
                    "pinger_no_loss_perecnt": {
                        "description": Descriptions.pinger_no_loss_perecnt,
                        "health": "EXCELLENT",
                        "value": 100.0,
                    },
                    "pinger_rtt_avg_ms": {
                        "description": Descriptions.pinger_rtt_avg_ms,
                        "health": "EXCELLENT",
                        "value": 0.0,
                    },
                },
            },
        )

        # Disable use_real_throughput
        Metrics.use_real_throughput = False
        node_stats_map = {
            "udp_pinger_loss_ratio": 1.0,
            "udp_pinger_rtt_avg": 0.0,
            "min_route_mcs": 12.0,
        }
        bit_map, node_health = get_node_stats_health(node_stats_map, 30)
        self.assertEqual(bit_map, "0000000")
        self.assertDictEqual(
            node_health,
            {
                "overall_health": 1,
                "stats": {
                    "min_route_mcs": {
                        "description": Descriptions.min_route_mcs,
                        "health": "EXCELLENT",
                        "value": 12.0,
                    },
                    "pinger_no_loss_perecnt": {
                        "description": Descriptions.pinger_no_loss_perecnt,
                        "health": "EXCELLENT",
                        "value": 100.0,
                    },
                    "pinger_rtt_avg_ms": {
                        "description": Descriptions.pinger_rtt_avg_ms,
                        "health": "EXCELLENT",
                        "value": 0.0,
                    },
                },
            },
        )
