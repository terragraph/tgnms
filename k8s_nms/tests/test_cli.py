#!/usr/bin/env python3
# Copyright (c) 2014-present, Facebook, Inc.

import io
import logging
import yaml
import os
import subprocess
import unittest

from click.testing import CliRunner
from k8s_nms import nms, rage


class FakeLogger:
    """
    Context manager to overwrite nms.rage.get_logger with one that doesn't
    need a folder on the filesystem
    """

    def __enter__(self, *args, **kwargs):
        logger = logging.getLogger(__name__)
        logger.setLevel(logging.DEBUG)

        f = io.StringIO()
        f_handler = logging.StreamHandler(f)

        formatter = logging.Formatter("%(message)s")
        f_handler.setFormatter(formatter)

        logger.addHandler(f_handler)

        self.old_logger = nms.rage.get_logger

        def get_logger(*args):
            return logger

        nms.rage.get_logger = get_logger

        return f

    def __exit__(self, *args, **kwargs):
        pass
        nms.rage.get_logger = self.old_logger


def mock_subprocess(*args, **kwargs):
    print("Running fake subprocess", args)


def mock_get_variables(*args, **kwargs):
    default_variables_file = os.path.join(os.path.dirname(__file__), "..", "k8s_nms", "ansible", "group_vars", "all")

    with open(default_variables_file, "r") as defaults:
        variables = yaml.safe_load(defaults)

    return variables


class TestK8sNmsCli(unittest.TestCase):
    def setUp(self):
        super().setUp()
        rage.run_subprocess_command = mock_subprocess
        self.real_subprocess_run = subprocess.run
        subprocess.run = mock_subprocess
        nms.get_variables = mock_get_variables
        self.manifests_dir = os.path.join(
            os.path.dirname(__file__), "..", "k8s_nms", "manifests"
        )

    def tearDown(self):
        super().tearDown()
        subprocess.run = self.real_subprocess_run

    def check_result(self, result):
        if result.exception:
            print(f"Test failed with stdout:\n{result.stdout}")
            raise result.exception

        self.assertEqual(0, result.exit_code)

    def check_command(self, command, **kwargs):
        runner = CliRunner()
        result = runner.invoke(
            nms.cli, command.split(" "), catch_exceptions=False, **kwargs
        )
        self.check_result(result)
        return result

    def test_help(self) -> None:
        runner = CliRunner()
        result = runner.invoke(nms.cli, ["--help"])
        self.assertEqual(0, result.exit_code)

        result = runner.invoke(nms.cli, ["-h"])
        self.assertEqual(0, result.exit_code)

    def test_install(self):
        self.check_command("install -m fakelabvm")
        self.check_command("install -f config.yml -m fake_host1 -w fake_host2")

    def test_uninstall(self):
        self.check_command("uninstall -m fake_host1 -w fake_host2")

    def test_configure(self):
        self.check_command(f"configure -m fake_host1 -t {self.manifests_dir}")

    def test_apply(self):
        self.check_command(f"apply -m fake_host1 -t {self.manifests_dir}")

    def test_clear(self):
        self.check_command(f"clear -m fake_host1 -t {self.manifests_dir}")

    def test_rage(self):
        with FakeLogger() as f:
            command = self.check_command("install -m fake_host1")
            self.check_command("rage")

            # Check the command's stdout is expected
            self.assertEqual(command.output.count("ansible-playbook"), 1)
            self.assertEqual(command.output.count("install.yml"), 1)

            rage_log = f.getvalue()

            # Check that the rage logger caught the stdout and added metadata
            self.assertEqual(rage_log.count("New command invocation"), 1)
            self.assertEqual(rage_log.count("Function called with args"), 1)
            self.assertEqual(command.output.count("ansible-playbook"), 1)
            self.assertEqual(command.output.count("install.yml"), 1)

    def test_show_defaults(self):
        self.check_command("show-defaults")


if __name__ == "__main__":
    unittest.main()
