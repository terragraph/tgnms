#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import unittest

from scan_service.utils.time import bwgd_to_epoch


class TimeTests(unittest.TestCase):
    def test_bwgd_to_epoch(self) -> None:
        self.assertEqual(bwgd_to_epoch(0), 315964782.0)
        self.assertEqual(bwgd_to_epoch(49680022382), 1587773354.9792)
