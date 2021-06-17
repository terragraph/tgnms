#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import json
import unittest

from network_health_service.stats.fetch_stats import get_link_queries, get_node_queries
from network_health_service.stats.metrics import Metrics


class CreateQueryTests(unittest.TestCase):
    def setUp(self) -> None:
        self.maxDiff = None
        with open("tests/metrics.json") as f:
            metrics = json.load(f)
            Metrics.update_metrics(
                metrics, prometheus_hold_time=30, use_real_throughput=True
            )

    def test_get_link_queries(self) -> None:
        expected_link_queries = {
            "analytics_alignment_status": (
                "sum_over_time(min by (linkName) "
                '(analytics_alignment_status{network="network_A"} == bool 1) '
                "[3599s:30s])"
            ),
            "topology_link_is_online": (
                "sum_over_time(min by (linkName) "
                '(topology_link_is_online{network="network_A"}) [3599s:30s])'
            ),
            "tx_byte": (
                "quantile_over_time(0.75, sum by (linkName) "
                '(tx_byte{network="network_A"}) [3599s:30s])'
            ),
            "analytics_foliage_factor": (
                "quantile_over_time(0.75, "
                'abs(analytics_foliage_factor{network="network_A"}) [3599s:30s])'
            ),
            "drs_cn_egress_routes_count": (
                "quantile_over_time(0.75, max by (linkName) "
                '(drs_cn_egress_routes_count{network="network_A"}) [3599s:30s])'
            ),
            "tx_ok": (
                "quantile_over_time(0.75, sum by (linkName) "
                '(tx_ok{network="network_A",intervalSec="1"}) [3599s:1s])'
            ),
            "link_avail": (
                "max by (linkName) "
                '(resets(link_avail{network="network_A",intervalSec="1"} [3600s]))'
            ),
            "mcs": (
                "quantile_over_time(0.25, min by (linkName) "
                '(mcs{network="network_A",intervalSec="1"}) [3599s:1s])'
            ),
            "mcs_diff": (
                "quantile_over_time(0.75, "
                'abs(mcs{network="network_A",intervalSec="1",linkDirection="A"} '
                "- on (linkName) "
                'mcs{network="network_A",intervalSec="1",linkDirection="Z"}) '
                "[3599s:1s])"
            ),
            "tx_power_diff": (
                "quantile_over_time(0.75, "
                'abs(tx_power{network="network_A",intervalSec="1",linkDirection="A"} '
                "- on (linkName) "
                'tx_power{network="network_A",intervalSec="1",linkDirection="Z"}) '
                "[3599s:1s])"
            ),
        }
        link_queries = get_link_queries("network_A", 3600)
        self.assertDictEqual(link_queries, expected_link_queries)

        expected_node_queries = {
            "analytics_cn_power_status": (
                "sum_over_time("
                '(analytics_cn_power_status{network="network_A"} == bool 3) '
                "[3599s:30s])"
            ),
            "topology_node_is_online": (
                'sum_over_time(topology_node_is_online{network="network_A"} [3600s])'
            ),
            "drs_default_routes_changed": (
                "sum_over_time(drs_default_routes_changed"
                '{network="network_A"} [3600s])'
            ),
            "udp_pinger_loss_ratio": (
                "sum_over_time("
                '(udp_pinger_loss_ratio{network="network_A",intervalSec="30"} '
                "< bool 0.9) [3599s:30s])"
            ),
            "udp_pinger_rtt_avg": (
                "quantile_over_time(0.75, "
                'udp_pinger_rtt_avg{network="network_A",intervalSec="30"} [3600s])'
            ),
            "min_route_mcs": (
                "quantile_over_time(0.25, "
                'drs_min_route_mcs{network="network_A"} [3599s:60s])'
            ),
        }
        node_queries = get_node_queries("network_A", 3600)
        self.assertDictEqual(node_queries, expected_node_queries)
