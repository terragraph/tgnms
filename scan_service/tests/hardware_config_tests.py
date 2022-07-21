#!/usr/bin/env python3

# Copyright (c) Meta Platforms, Inc. and affiliates.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

import json
import unittest
from typing import List

from bidict import bidict
from scan_service.utils.hardware_config import HardwareConfig


class HardwareConfigTests(unittest.TestCase):
    def setUp(self) -> None:
        with open("tests/hardware_config.json") as f:
            hardware_config = json.load(f)
            HardwareConfig.set_config(hardware_config)

    def test_class_variables(self) -> None:
        self.assertDictEqual(
            HardwareConfig.BEAM_ORDER,
            {
                "0": {
                    "-18": [0, 1, 2, 3, 4, 5, 6, 7],
                    "18": [8, 9, 10, 11, 12, 13, 14, 15],
                },
                "1": {
                    "0": [30, 29, 28, 27, 26, 25, 24, 16, 17, 18, 19, 20, 21, 22, 23]
                },
            },
        )
        self.assertDictEqual(
            HardwareConfig.TXPOWERIDX_TO_TXPOWER,
            {
                "2": {
                    "10": {0: 19, 1: 20, 2: 21, 3: 22, 4: 23, 5: 24, 6: 25, 7: 26},
                    "6": {0: 10, 1: 11, 2: 12, 3: 13, 4: 14, 5: 15, 6: 16, 7: 17},
                },
                "3": {"5": {0: 11, 1: 12, 2: 13, 3: 14, 4: 15, 5: 16, 6: 17, 7: 18}},
                "default_channel": {
                    "default_mcs": {
                        0: 16,
                        1: 17,
                        2: 18,
                        3: 19,
                        4: 20,
                        5: 21,
                        6: 22,
                        7: 23,
                    }
                },
            },
        )
        self.assertEqual(HardwareConfig.BORESIDE_BW_IDX, 10)
        self.assertEqual(HardwareConfig.MINIMUM_SNR_DB, -10)
        self.assertEqual(HardwareConfig.SNR_SATURATE_THRESH_DB, 25)
        self.assertEqual(HardwareConfig.BEAM_SEPERATE_IDX, 3)
        self.assertEqual(HardwareConfig.MAX_SIDELOBE_LEVEL_DB, 12)
        self.assertEqual(HardwareConfig.MAX_POWER, 23)

    def test_get_adjacent_beam_index(self) -> None:
        self.assertEqual(HardwareConfig.get_adjacent_beam_index(0, 1), 1)
        self.assertEqual(HardwareConfig.get_adjacent_beam_index(0, -1), 0)

        self.assertEqual(HardwareConfig.get_adjacent_beam_index(8, 1), 9)
        self.assertEqual(HardwareConfig.get_adjacent_beam_index(8, -1), 8)

        self.assertEqual(HardwareConfig.get_adjacent_beam_index(15, 1), 15)
        self.assertEqual(HardwareConfig.get_adjacent_beam_index(15, -1), 14)

        self.assertEqual(HardwareConfig.get_adjacent_beam_index(16, 1), 17)
        self.assertEqual(HardwareConfig.get_adjacent_beam_index(16, -1), 24)

        self.assertEqual(HardwareConfig.get_adjacent_beam_index(23, 1), 23)
        self.assertEqual(HardwareConfig.get_adjacent_beam_index(23, -1), 22)

        self.assertEqual(HardwareConfig.get_adjacent_beam_index(30, 1), 29)
        self.assertEqual(HardwareConfig.get_adjacent_beam_index(30, -1), 30)

        self.assertEqual(HardwareConfig.get_adjacent_beam_index(60, 1), 60)
        self.assertEqual(HardwareConfig.get_adjacent_beam_index(60, -1), 60)

    def test_get_pwr_offset(self) -> None:
        self.assertEqual(HardwareConfig.get_pwr_offset(channel="2", mcs="6"), 0)
        self.assertEqual(
            HardwareConfig.get_pwr_offset(target_pwr_idx=4, channel="2", mcs="6"), -9
        )
        self.assertEqual(
            HardwareConfig.get_pwr_offset(ref_pwr_idx=4, channel="2", mcs="6"), 9
        )
        self.assertEqual(
            HardwareConfig.get_pwr_offset(ref_pwr_idx=5, channel="3", mcs="5"), 7
        )
        self.assertEqual(
            HardwareConfig.get_pwr_offset(ref_pwr_idx=7, channel="2", mcs="10"), -3
        )
        self.assertEqual(HardwareConfig.get_pwr_offset(target_pwr_idx=5), -2)
