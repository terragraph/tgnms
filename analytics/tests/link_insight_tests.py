#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import json
import unittest

from analytics.link_insight import (
    calculate_path_loss,
    compute_single_link_foliage_factor,
)
from analytics.utils.hardware_config import HardwareConfig


class LinkInsightTests(unittest.TestCase):
    def setUp(self) -> None:
        with open("tests/hardware_config.json") as f:
            hardware_config = json.load(f)
            HardwareConfig.set_config(hardware_config)

    def test_calculate_path_loss(self) -> None:
        self.assertEqual({}, calculate_path_loss([], []))
        self.assertEqual(
            {5: 101},
            calculate_path_loss(
                [(3, "7"), (5, "20"), (6, "21"), (7, "20")],
                [(2, "-62"), (5, "-62"), (6, "-62")],
            ),
        )

    def test_compute_single_link_foliage_factor(self) -> None:
        forward_link_path_loss = {
            0: 50,
            1: 46,
            2: 45,
            3: 45,
            4: 46,
            5: 46,
            6: 45,
            7: 45,
            8: 46,
            9: 45,
            10: 61,
            11: 45,
            12: 46,
            13: 46,
            14: 45,
            15: 45,
            16: 61,
            17: 45,
            18: 46,
            19: 46,
            20: 48,
            21: 45,
        }
        reverse_link_path_loss = {
            1: 45,
            2: 47,
            3: 46,
            4: 46,
            5: 45,
            6: 47,
            7: 46,
            8: 46,
            9: 46,
            10: 46,
            11: 46,
            12: 47,
            13: 46,
            14: 47,
            15: 45,
            16: 62,
            17: 46,
            18: 46,
            19: 46,
            20: 46,
            21: 46,
            22: 50,
        }
        number_of_windows = 5
        min_window_size = 4
        minimum_var = 0.0
        actual_output = compute_single_link_foliage_factor(
            "network_name",
            "link_name",
            forward_link_path_loss,
            reverse_link_path_loss,
            number_of_windows,
            min_window_size,
            minimum_var,
        )
        expected_output = 0.736
        self.assertEqual(actual_output, expected_output)
