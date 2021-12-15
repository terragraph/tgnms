#!/usr/bin/env python3
# Copyright (c) 2014-present, Facebook, Inc.

import io
import logging
import os
import sys
import tempfile
import unittest
from unittest.mock import Mock, ANY

from click.testing import CliRunner
from nms_cli import nms


def get_config_file(name):
    return os.path.join(os.path.dirname(__file__), "configs", name)


run_mock = Mock()


class FakeExecutor:
    def __init__(*args, **kwargs):
        pass

    def run(self, *args, **kwargs):
        print(f"stdout: Running fake Ansible {str(args)} and {str(kwargs)}")
        print(
            f"stderr: Running fake Ansible {str(args)} and {str(kwargs)}",
            file=sys.stderr,
        )
        run_mock(*args, **kwargs)

    def __getattr__(self, name):
        def empty_fn(*args, **kwargs):
            pass

        return empty_fn

    def get_defaults_file(self):
        return get_config_file("swarm_config.yml")


class NmsTestUtils:
    def check_result(self, result):
        if result.exception:
            print(f"Test failed with stdout:\n{result.stdout}")
            raise result.exception

        self.assertEqual(0, result.exit_code)

    def check_command(self, command, **kwargs):
        run_mock.reset_mock()
        runner = CliRunner()
        result = runner.invoke(
            nms.cli, command.split(" "), catch_exceptions=False, **kwargs
        )
        self.check_result(result)
        return result


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


class TestSwarmNmsCli(NmsTestUtils, unittest.TestCase):
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

        # Hostnames and ssl cert/key is passed in via config file.
        self.check_command(f"install -f {get_config_file('swarm_config.yml')}")
        self.check_command(
            f"install -f {get_config_file('swarm_config.yml')} -C my.cert.pem"
        )

    def test_image_version(self):
        self.check_command(
            f"install --image-version=v21.12.01 -f {get_config_file('swarm_config.yml')}"
        )
        _, kwargs = run_mock.call_args
        self.assertEqual(
            kwargs["generated_config"]["msa_scan_service_image"],
            "secure.cxl-terragraph.com:443/scan_service:v21.12.01",
        )
        # This is explicitly defined to be `latest` in our config file.
        self.assertEqual(
            kwargs["generated_config"]["msa_weather_service_image"],
            "secure.cxl-terragraph.com:443/weather_service:latest",
        )

    def test_uninstall(self):
        self.check_command("uninstall -h fake_host")

    def test_upgrade(self):
        self.check_command(
            f"upgrade -f {get_config_file('swarm_config.yml')} -c example_first -i example.com -h fake_host"
        )

    def test_rage(self):
        with FakeLogger() as f:
            command = self.check_command(
                "install -f config.yml -C cert.pem -k key.pem -h fake_host"
            )
            self.check_command("rage")

            # Check the command's stdout is expected
            self.assertEqual(command.output.count("stdout: Running fake Ansible"), 1)
            self.assertEqual(command.output.count("stderr: Running fake Ansible"), 1)

            rage_log = f.getvalue()

            # Check that the rage logger caught the stdout and added metadata
            self.assertEqual(rage_log.count("New command invocation"), 1)
            self.assertEqual(rage_log.count("Function called with args"), 1)
            self.assertEqual(rage_log.count("stdout: Running fake Ansible"), 1)
            self.assertEqual(rage_log.count("stderr: Running fake Ansible"), 1)

    def test_show_defaults(self):
        self.check_command("show-defaults")

    def test_generate_image_configs(self):
        result = nms.generate_image_configs(
            variables={
                "msa_network_test_image": "secure.cxl-terragraph.com:443/network_test",
                "msa_scan_service_image": "secure.cxl-terragraph.com:443/scan_service",
                "msa_topology_service_image": "secure.cxl-terragraph.com:443/topology_service:stable",
                "nms_image": "secure.cxl-terragraph.com:443/nmsv2:v20.01.01",
            },
            version="v21.12.12-1",
        )
        self.assertDictEqual(
            result,
            {
                "msa_network_test_image": "secure.cxl-terragraph.com:443/network_test:v21.12.12-1",
                "msa_scan_service_image": "secure.cxl-terragraph.com:443/scan_service:v21.12.12-1",
                "msa_topology_service_image": "secure.cxl-terragraph.com:443/topology_service:stable",
                "nms_image": "secure.cxl-terragraph.com:443/nmsv2:v20.01.01",
            },
        )


if __name__ == "__main__":
    unittest.main()
