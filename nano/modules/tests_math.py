#!/usr/bin/env python3
# Copyright 2004-present Facebook.  All rights reserved.

import unittest

from modules import util_math


class MathTests(unittest.TestCase):
    def test_pwr2db(self) -> None:
        self.assertEqual(3.9810717055349722, util_math.db2pwr(6))


if __name__ == "__main__":
    unittest.main()  # pragma: nocover
