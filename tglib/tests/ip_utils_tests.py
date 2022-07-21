#!/usr/bin/env python3

# Copyright (c) Meta Platforms, Inc. and affiliates.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

import unittest

from tglib.utils.ip import format_address


class IPUtilsTests(unittest.TestCase):
    def setUp(self) -> None:
        self.port = 8080

    def test_ipv4(self) -> None:
        host = "127.0.0.1"
        addr = format_address(host, self.port)
        self.assertEqual(addr, "127.0.0.1:8080")

    def test_str_hostname(self) -> None:
        host = "foo"
        addr = format_address(host, self.port)
        self.assertEqual(addr, "foo:8080")

    def test_ipv6(self) -> None:
        host = "::1"
        addr = format_address(host, self.port)
        self.assertEqual(addr, "[::1]:8080")
