#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import unittest

from analytics.link_insight import (
    calculate_path_loss,
    compute_single_link_foliage_factor,
    get_link_foliage_num,
)


class LinkInsightTests(unittest.TestCase):
    def test_calculate_path_loss(self) -> None:
        tx_power = {
            "linkName": "link_puma14",
            "linkDirection": "A",
            "values": [20],
        }
        rssi = {
            "linkName": "link_puma14",
            "linkDirection": "Z",
            "values": [-62],
        }
        actual_output = calculate_path_loss(tx_power["values"], rssi["values"])
        expected_output = 101
        self.assertEqual(expected_output, actual_output[0])

    def test_compute_single_link_foliage_factor(self) -> None:
        forward_link_path_loss = [
            46,
            45,
            45,
            46,
            46,
            45,
            45,
            46,
            45,
            61,
            45,
            46,
            46,
            45,
            45,
            61,
            45,
            46,
            46,
            48,
            45,
        ]
        reverse_link_path_loss = [
            45,
            47,
            46,
            46,
            45,
            47,
            46,
            46,
            46,
            46,
            46,
            47,
            46,
            47,
            45,
            62,
            46,
            46,
            46,
            46,
            46,
        ]
        number_of_windows = 5
        min_window_size = 4
        minimum_var = 0.0
        actual_output = compute_single_link_foliage_factor(
            forward_link_path_loss,
            reverse_link_path_loss,
            number_of_windows,
            min_window_size,
            minimum_var,
        )
        expected_output = 0.7361
        self.assertEqual(round(actual_output, 4), expected_output)

    def test_get_link_foliage_num(self) -> None:
        num_links = 5
        foliage_factor_stats = {
            "link_1": 0.5,
            "link_2": 0.86,
            "link_3": 0.01,
            "link_4": 0.9,
            "link_5": 0.3,
        }
        foliage_factor_threshold = 0.85
        network_foliage_stats = get_link_foliage_num(
            num_links, foliage_factor_stats, foliage_factor_threshold
        )
        self.assertEqual(network_foliage_stats["num_foliage_links"], 2)
        self.assertEqual(network_foliage_stats["num_foliage_free_links"], 3)
