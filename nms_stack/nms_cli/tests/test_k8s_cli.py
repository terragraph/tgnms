#!/usr/bin/env python3
# Copyright (c) 2014-present, Facebook, Inc.

import io
import logging
import os
import subprocess
import unittest

import yaml
from click.testing import CliRunner
from nms_cli.k8s_nms import nms, rage


DEFAULT_VARIABLES_FILE = os.path.join(
    os.path.dirname(__file__), "..", "k8s_nms", "ansible", "group_vars", "all.yml"
)


RESTRICTED_VARIABLES_FILE = os.path.join(
    os.path.dirname(__file__), "..", "k8s_nms", "ansible", "group_vars", "restricted.yml"
)


def get_config_file(name):
    return os.path.join(os.path.dirname(__file__), "configs", name)


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
    with open(DEFAULT_VARIABLES_FILE, "r") as defaults, open(RESTRICTED_VARIABLES_FILE, "r") as restricted:
        variables = yaml.safe_load(defaults)
        variables.update(yaml.safe_load(restricted))
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
        self.check_command("install -m fake_host1 -w fake_host2")
        self.check_command(f"install -f {get_config_file('k8s_config.yml')}")
        self.check_command(f"install -f {get_config_file('k8s_config.yml')} -m fake_host1")
        self.check_command(f"install -f {get_config_file('k8s_config.yml')} -w fake_host1")

    def test_uninstall(self):
        self.check_command("uninstall -m fake_host1 -w fake_host2")
        self.check_command(f"uninstall -f {get_config_file('k8s_config.yml')}")

    def test_configure(self):
        self.check_command(f"configure -m fake_host1 -t {self.manifests_dir}")
        self.check_command(f"configure -f {get_config_file('k8s_config.yml')}")

    def test_apply(self):
        self.check_command(f"apply -m fake_host1 -t {self.manifests_dir}")
        self.check_command(f"apply -f {get_config_file('k8s_config.yml')}")

    def test_clear(self):
        self.check_command(f"clear -m fake_host1 -t {self.manifests_dir}")
        self.check_command(f"clear -f {get_config_file('k8s_config.yml')}")

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

    def test_show_config(self):
        self.check_command("show-config")
        self.check_command("show-config --full")

    def test_all_file(self):
        """
        Inside the show-config command, we perform string partitioning which relies
        on the all.yml sections being defined and in the correct order.

        This test ensures that the expected order is preserved.
        """
        with open(DEFAULT_VARIABLES_FILE, "r") as f:
            content = f.read()

        # Critical partition sections are there.
        self.assertTrue((
            "# +--------------------------------------------------------+\n"
            "# |           NMS Other Configuration Options              |\n"
            "# +--------------------------------------------------------+\n"
        ) in content)

        # Sections appear in the correct order
        ordering = [
            content.find("NMS Configuration Options"),
            content.find("NMS Other Configuration Options"),
            content.find("Bootstrapping the Kubernetes Cluster"),
            content.find("Core NMS  Options"),
        ]
        res = all(i < j for i, j in zip(ordering, ordering[1:]))
        self.assertTrue(res)

    def test_use_config_values_if_no_overrides(self):
        config_file = get_config_file('k8s_config.yml')

        # Overrides should take priority.
        def _expect(**kwargs):
            self.assertCountEqual(kwargs['managers'], ['override.manager'])
            self.assertCountEqual(kwargs['workers'], ['override.worker1', 'override.worker2'])
            self.assertEqual(kwargs['ssl_key_file'], 'override.key.pem')
            self.assertEqual(kwargs['ssl_cert_file'], 'override.cert.pem')

        nms.use_config_values_if_no_overrides(_expect)(
            config_file=config_file,
            managers=['override.manager'],
            workers=['override.worker1', 'override.worker2'],
            ssl_key_file='override.key.pem',
            ssl_cert_file='override.cert.pem',
        )

        # If no overrides, config values should be used.
        def _expect(**kwargs):
            self.assertCountEqual(kwargs['managers'], ['host.manager.example.com'])
            self.assertCountEqual(kwargs['workers'], ['host.worker1.example.com', 'host.worker2.example.com'])
            self.assertEqual(kwargs['ssl_key_file'], None)
            self.assertEqual(kwargs['ssl_cert_file'], None)

        nms.use_config_values_if_no_overrides(_expect)(
            config_file=config_file,
            managers=[],
            workers=[],
            ssl_key_file=None,
            ssl_cert_file=None,
        )


if __name__ == "__main__":
    unittest.main()
