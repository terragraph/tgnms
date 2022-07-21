#!/usr/bin/env python3

# Copyright (c) Meta Platforms, Inc. and affiliates.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

import unittest

from scan_service.utils.time import bwgd_to_epoch


class TimeTests(unittest.TestCase):
    def test_bwgd_to_epoch(self) -> None:
        self.assertEqual(bwgd_to_epoch(0), 315964782.0)
        self.assertEqual(bwgd_to_epoch(49680022382), 1587773354.9792)
