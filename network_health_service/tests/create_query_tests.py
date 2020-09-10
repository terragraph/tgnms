#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import unittest

from network_health_service.stats.fetch_stats import get_link_queries, get_node_queries
from tglib.clients.prometheus_client import ops


class CreateQueryTests(unittest.TestCase):
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
            "drs_cn_egress_routes_total": (
                "quantile_over_time(0.75, max by (linkName) "
                '(drs_cn_egress_routes_total{network="network_A"}) [3599s:30s])'
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
        link_queries = get_link_queries("network_A")
        self.assertDictEqual(link_queries, expected_link_queries)

        expected_node_queries = {
            "analytics_cn_power_status": (
                "sum_over_time("
                '(analytics_cn_power_status{network="network_A"} == bool 3) '
                "[3599s:30s])"
            ),
            "udp_pinger_loss_ratio": (
                "sum_over_time("
                '(udp_pinger_loss_ratio{network="network_A",intervalSec="30"} '
                ">= bool 0.9) [3599s:30s])"
            ),
            "node_online": (
                "sum_over_time("
                'node_online{network="network_A",intervalSec="30"} [3600s])'
            ),
            "udp_pinger_rtt_avg": (
                "quantile_over_time(0.75, "
                'udp_pinger_rtt_avg{network="network_A",intervalSec="30"} [3600s])'
            ),
        }
        node_queries = get_node_queries("network_A")
        self.assertDictEqual(node_queries, expected_node_queries)
