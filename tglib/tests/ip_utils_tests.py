#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

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
