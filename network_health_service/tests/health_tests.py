#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import json
import unittest

from network_health_service.models import StatHealth
from network_health_service.stats.health import (
    get_health,
    get_link_stats_health,
    get_node_stats_health,
)
from network_health_service.stats.metrics import Metrics


class HealthTests(unittest.TestCase):
    def setUp(self) -> None:
        self.maxDiff = None
        with open("tests/metrics.json") as f:
            metrics = json.load(f)
            Metrics.update_metrics(metrics, prometheus_hold_time=30)

    def test_get_health(self) -> None:
        poor_health = get_health(0, Metrics.analytics_alignment_status)
        self.assertEqual(poor_health, StatHealth.POOR.value)
        good_health = get_health(97, Metrics.analytics_alignment_status)
        self.assertEqual(good_health, StatHealth.GOOD.value)
        excellent_health = get_health(100, Metrics.analytics_alignment_status)
        self.assertEqual(excellent_health, StatHealth.EXCELLENT.value)

        poor_health = get_health(1.3, Metrics.tx_byte)
        self.assertEqual(poor_health, StatHealth.POOR.value)
        good_health = get_health(1.0, Metrics.tx_byte)
        self.assertEqual(good_health, StatHealth.GOOD.value)
        excellent_health = get_health(0.8, Metrics.tx_byte)
        self.assertEqual(excellent_health, StatHealth.EXCELLENT.value)

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
        self.assertEqual(bit_map, "11110100001111")
        self.assertDictEqual(
            link_health,
            {
                "overall_health": "poor",
                "stats": {
                    "analytics_alignment_status": {"health": "poor", "value": 0.0},
                    "analytics_foliage_factor": {"health": "poor", "value": 3.0},
                    "drs_cn_egress_routes_count": {"health": "good", "value": 4.0},
                    "interference": {"health": "poor", "value": 13.0},
                    "link_alive": {"health": "poor", "value": 10.0},
                    "link_avail": {"health": "excellent", "value": 6.0},
                    "link_avail_for_data": {"health": "poor", "value": 11.0},
                    "link_health": {"health": "poor", "value": 12.0},
                    "mcs": {"health": "good", "value": 7.0},
                    "mcs_diff": {"health": "poor", "value": 8.0},
                    "topology_link_is_online": {
                        "health": "poor",
                        "value": 0.8333333333333334,
                    },
                    "tx_byte": {"health": "excellent", "value": 5.333333333333334e-10},
                    "tx_ok": {"health": "excellent", "value": 5.0},
                    "tx_power_diff": {"health": "poor", "value": 9.0},
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
                "overall_health": "excellent",
                "stats": {
                    "link_avail": {"health": "excellent", "value": 0.0},
                    "link_avail_for_data": {"health": "excellent", "value": 100.0},
                    "link_health": {"health": "excellent", "value": 1.0},
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
                "overall_health": "good",
                "stats": {
                    "link_avail": {"health": "excellent", "value": 0.0},
                    "link_avail_for_data": {"health": "good", "value": 99.8},
                    "link_health": {"health": "excellent", "value": 1.0},
                },
            },
        )

    def test_get_node_stats_health(self) -> None:
        node_stats_map = {
            "analytics_cn_power_status": 10.0,
            "topology_node_is_online": 11.0,
            "udp_pinger_loss_ratio": 12.0,
            "node_online": 13.0,
            "udp_pinger_rtt_avg": 14.0,
            "node_health": 15.0,
        }
        bit_map, node_health = get_node_stats_health(node_stats_map, 3600)
        self.assertEqual(bit_map, "111101")
        self.assertDictEqual(
            node_health,
            {
                "overall_health": "poor",
                "stats": {
                    "analytics_cn_power_status": {
                        "health": "poor",
                        "value": 83.33333333333334,
                    },
                    "node_health": {"health": "poor", "value": 15.0},
                    "node_online": {"health": "poor", "value": 10.833333333333334},
                    "topology_node_is_online": {
                        "health": "poor",
                        "value": 9.166666666666666,
                    },
                    "udp_pinger_loss_ratio": {"health": "poor", "value": 10.0},
                    "udp_pinger_rtt_avg": {"health": "excellent", "value": 14.0},
                },
            },
        )

        node_stats_map = {
            "udp_pinger_loss_ratio": 1.0,
            "udp_pinger_rtt_avg": 0.0,
            "node_health": 1.0,
        }
        bit_map, node_health = get_node_stats_health(node_stats_map, 30)
        self.assertEqual(bit_map, "000000")
        self.assertDictEqual(
            node_health,
            {
                "overall_health": "excellent",
                "stats": {
                    "node_health": {"health": "excellent", "value": 1.0},
                    "udp_pinger_loss_ratio": {"health": "excellent", "value": 100.0},
                    "udp_pinger_rtt_avg": {"health": "excellent", "value": 0.0},
                },
            },
        )

        node_stats_map = {
            "udp_pinger_loss_ratio": 1.0,
            "udp_pinger_rtt_avg": 0.0,
            "node_health": 2.0,
        }
        bit_map, node_health = get_node_stats_health(node_stats_map, 30)
        self.assertEqual(bit_map, "000000")
        self.assertDictEqual(
            node_health,
            {
                "overall_health": "good",
                "stats": {
                    "node_health": {"health": "good", "value": 2.0},
                    "udp_pinger_loss_ratio": {"health": "excellent", "value": 100.0},
                    "udp_pinger_rtt_avg": {"health": "excellent", "value": 0.0},
                },
            },
        )