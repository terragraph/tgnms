#!/usr/bin/env python3
# Copyright (c) 2014-present, Facebook, Inc.

import os
import unittest

from click.testing import CliRunner
from nms_cli import nms


def get_config_file(name):
    return os.path.join(os.path.dirname(__file__), "configs", name)


class FakeExecutor:
    def __init__(*args, **kwargs):
        pass

    def __getattr__(self, name):
        def empty_fn(*args, **kwargs):
            pass

        return empty_fn

    def get_defaults_file(self):
        return get_config_file("test_group_vars")


class NmsTestUtils:
    def check_result(self, result):
        if result.exception:
            print(f"Test failed with stdout:\n{result.stdout}")
            raise result.exception

        self.assertEqual(0, result.exit_code)

    def check_command(self, command):
        runner = CliRunner()
        result = runner.invoke(nms.cli, command.split(" "), catch_exceptions=False)
        self.check_result(result)


class TestNmsCli(NmsTestUtils, unittest.TestCase):
    def setUp(self):
        super().setUp()
        # Change the executor so Ansible never actually runs
        nms.executor = FakeExecutor

    def test_help(self) -> None:
        runner = CliRunner()
        result = runner.invoke(nms.cli, ["--help"])
        self.assertEqual(0, result.exit_code)

    def test_install(self):
        self.check_command("install -f config.yml -C cert.pem -k key.pem -h fake_host")
        self.check_command(
            "install -f config.yml -C cert.pem -k key.pem -h fake_host1 -h fake_host2"
        )

    def test_uninstall(self):
        self.check_command("uninstall -h fake_host")

    def test_upgrade(self):
        self.check_command(
            f"upgrade -f {get_config_file('test_group_vars')} -c example_first -i example.com -h fake_host"
        )

    def test_show_defaults(self):
        self.check_command("show-defaults")


if __name__ == "__main__":
    unittest.main()
