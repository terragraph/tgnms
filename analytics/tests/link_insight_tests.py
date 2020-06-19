#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import unittest

from analytics.link_insight import (
    calculate_path_loss,
    compute_single_link_foliage_factor,
)


class LinkInsightTests(unittest.TestCase):
    def test_calculate_path_loss(self) -> None:
        tx_power = {"linkName": "link_puma14", "linkDirection": "A", "values": [20]}
        rssi = {"linkName": "link_puma14", "linkDirection": "Z", "values": [-62]}
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
        expected_output = 0.736
        self.assertEqual(actual_output, expected_output)
