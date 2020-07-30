#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import unittest
from unittest.mock import Mock

from scan_service.utils.data_loader import (
    aggregate_all_responses,
    aggregate_current_responses,
    average_rx_responses,
)
from terragraph_thrift.Controller.ttypes import ScanFwStatus


class DataLoaderTests(unittest.TestCase):
    def test_aggregate_current_responses_no_input(self) -> None:
        responses = {}
        curr_stats, to_db = aggregate_current_responses(responses, "node_A")
        self.assertDictEqual(curr_stats, {})
        self.assertListEqual(to_db, [])

    def test_aggregate_current_responses(self) -> None:
        responses = {
            "node_A": {
                "status": ScanFwStatus.COMPLETE,
                "txPwrIndex": 21,
                "routeInfoList": [
                    {"route": {"tx": 0, "rx": 0}, "rssi": -3, "snrEst": 30},
                    {"route": {"tx": 0, "rx": 2}, "rssi": -5, "snrEst": 20},
                ],
            },
            "node_B": {
                "status": ScanFwStatus.COMPLETE,
                "routeInfoList": [
                    {"route": {"tx": 0, "rx": 0}, "rssi": -5, "snrEst": 40},
                    {"route": {"tx": 0, "rx": 2}, "rssi": -2, "snrEst": 10},
                ],
            },
        }
        expected_curr_stats = {
            "node_A": {
                "0_0": {"count": 1, "rssi_sum": -3, "snr_sum": 30},
                "0_2": {"count": 1, "rssi_sum": -5, "snr_sum": 20},
            },
            "node_B": {
                "0_0": {"count": 1, "rssi_sum": -5, "snr_sum": 40},
                "0_2": {"count": 1, "rssi_sum": -2, "snr_sum": 10},
            },
        }
        expected_to_db = [
            {
                "rx_node": "node_A",
                "stats": {
                    "0_0": {"count": 1, "rssi_sum": -3, "snr_sum": 30},
                    "0_2": {"count": 1, "rssi_sum": -5, "snr_sum": 20},
                },
            },
            {
                "rx_node": "node_B",
                "stats": {
                    "0_0": {"count": 1, "rssi_sum": -5, "snr_sum": 40},
                    "0_2": {"count": 1, "rssi_sum": -2, "snr_sum": 10},
                },
            },
        ]
        curr_stats, to_db = aggregate_current_responses(responses, "node_A")
        self.assertDictEqual(curr_stats, expected_curr_stats)
        self.assertListEqual(to_db, expected_to_db)

    def test_aggregate_all_responses_no_previous_rx_responses(self) -> None:
        previous_rx_responses = []
        curr_stats = {
            "node_A": {
                "0_0": {"count": 1, "rssi_sum": -3, "snr_sum": 30},
                "0_2": {"count": 1, "rssi_sum": -5, "snr_sum": 20},
            },
            "node_B": {
                "0_0": {"count": 1, "rssi_sum": -5, "snr_sum": 40},
                "0_2": {"count": 1, "rssi_sum": -2, "snr_sum": 10},
            },
        }
        aggregated_stats = aggregate_all_responses(previous_rx_responses, curr_stats)
        self.assertDictEqual(aggregated_stats, curr_stats)

    def test_aggregate_all_responses(self) -> None:
        previous_rx_responses = [
            Mock(
                rx_node="node_A",
                stats={
                    "0_0": {"count": 1, "rssi_sum": -3, "snr_sum": 30},
                    "0_2": {"count": 1, "rssi_sum": -5, "snr_sum": 20},
                },
            ),
            Mock(
                rx_node="node_B",
                stats={
                    "0_0": {"count": 1, "rssi_sum": -5, "snr_sum": 40},
                    "0_2": {"count": 1, "rssi_sum": -2, "snr_sum": 10},
                },
            ),
        ]
        curr_stats = {
            "node_A": {
                "0_0": {"count": 1, "rssi_sum": -3, "snr_sum": 30},
                "0_2": {"count": 1, "rssi_sum": -5, "snr_sum": 20},
            },
            "node_B": {
                "0_0": {"count": 1, "rssi_sum": -5, "snr_sum": 40},
                "0_2": {"count": 1, "rssi_sum": -2, "snr_sum": 10},
            },
        }
        expected_aggregated_stats = {
            "node_A": {
                "0_0": {"count": 2, "rssi_sum": -6, "snr_sum": 60},
                "0_2": {"count": 2, "rssi_sum": -10, "snr_sum": 40},
            },
            "node_B": {
                "0_0": {"count": 2, "rssi_sum": -10, "snr_sum": 80},
                "0_2": {"count": 2, "rssi_sum": -4, "snr_sum": 20},
            },
        }
        aggregated_stats = aggregate_all_responses(previous_rx_responses, curr_stats)
        self.assertDictEqual(aggregated_stats, expected_aggregated_stats)

    def test_average_rx_responses_no_input(self) -> None:
        stats = {}
        averaged_stats = average_rx_responses(stats)
        self.assertDictEqual(averaged_stats, {})

    def test_average_rx_responses(self) -> None:
        stats = {
            "node_A": {
                "0_0": {"count": 2, "rssi_sum": -6, "snr_sum": 60},
                "0_2": {"count": 2, "rssi_sum": -10, "snr_sum": 40},
            },
            "node_B": {
                "0_0": {"count": 2, "rssi_sum": -10, "snr_sum": 80},
                "0_2": {"count": 2, "rssi_sum": -4, "snr_sum": 20},
            },
        }
        expected_averaged_stats = {
            "node_A": {
                "0_0": {"rssi_avg": -3, "snr_avg": 30},
                "0_2": {"rssi_avg": -5, "snr_avg": 20},
            },
            "node_B": {
                "0_0": {"rssi_avg": -5, "snr_avg": 40},
                "0_2": {"rssi_avg": -2, "snr_avg": 10},
            },
        }
        averaged_stats = average_rx_responses(stats)
        self.assertDictEqual(averaged_stats, expected_averaged_stats)
