#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import json
import unittest
from typing import List

from bidict import bidict
from scan_service.utils.hardware_config import HardwareConfig


class AdjacentBeamIndexTests(unittest.TestCase):
    def setUp(self) -> None:
        with open("tests/hardware_config.json") as f:
            hardware_config = json.load(f)
            HardwareConfig.set_config(hardware_config)

    def test_get_adjacent_beam_index(self) -> None:
        self.assertEqual(HardwareConfig.get_adjacent_beam_index(0, True), 1)
        self.assertEqual(HardwareConfig.get_adjacent_beam_index(0, False), 32)

        self.assertEqual(HardwareConfig.get_adjacent_beam_index(45, True), 44)
        self.assertEqual(HardwareConfig.get_adjacent_beam_index(45, False), 46)

        self.assertEqual(HardwareConfig.get_adjacent_beam_index(10, True), 11)
        self.assertEqual(HardwareConfig.get_adjacent_beam_index(10, False), 9)

        self.assertEqual(HardwareConfig.get_adjacent_beam_index(63, True), 62)
        self.assertEqual(HardwareConfig.get_adjacent_beam_index(63, False), 63)

        self.assertEqual(HardwareConfig.get_adjacent_beam_index(31, True), 31)
        self.assertEqual(HardwareConfig.get_adjacent_beam_index(31, False), 30)
