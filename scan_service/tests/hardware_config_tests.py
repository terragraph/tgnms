#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

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
