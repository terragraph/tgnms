#!/usr/bin/env python3
# Copyright (c) 2014-present, Facebook, Inc.

import unittest

from click.testing import CliRunner
from nms_cli import nms


class TestNmsCli(unittest.TestCase):
    def test_click_(self) -> None:
        runner = CliRunner()
        result = runner.invoke(nms.cli, ["--help"])
        self.assertEqual(0, result.exit_code)


if __name__ == "__main__":
    unittest.main()
