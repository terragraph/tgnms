#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import math
import unittest

from analytics.math_utils import index2deg


class MathUtilsTests(unittest.TestCase):
    def test_index2deg(self) -> None:
        tx_beam_idx = 47
        actual_output = index2deg(tx_beam_idx)
        self.assertEqual(22.5, actual_output)
