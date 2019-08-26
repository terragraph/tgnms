#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import distutils.cmd
import distutils.log
import os
import subprocess

from setuptools import find_packages, setup

from tglib import __version__


class BuildThriftCommand(distutils.cmd.Command):
    """A custom command to build thrift type definitions from thrift files."""

    description = "Build thrift type definitions"
    user_options = [
        ("path=", None, "path to thrift files"),
    ]

    def initialize_options(self):
        """Set default values for options."""
        self.path = "./if"

    def finalize_options(self):
        """Post-process options."""
        assert os.path.exists(self.path), f"Thrift path {self.path} does not exist."

    def run(self):
        """Run command."""
        for file in os.listdir(self.path):
            if not file.endswith(".thrift"):
                continue

            command = ["/usr/local/bin/thrift", "--gen", "py"]
            command.append(f"{self.path}/{file}")
            self.announce(f"Running: {str(command)}", level=distutils.log.INFO)
            subprocess.check_call(command)

        # Rename folder to get rid of dash
        os.rename("gen-py", "gen_py")


ptr_params = {
    "entry_point_module": "tglib/tglib",
    "test_suite": "tests.base",
    "test_suite_timeout": 300,
    "required_coverage": {
        "tglib/clients/prometheus_client.py": 85,
        "TOTAL": 35,
    },
    "run_flake8": True,
    "run_black": True,
    "run_mypy": True,
}


setup(
    name="tglib",
    version=__version__,
    packages=find_packages(),
    python_requires=">=3.7",
    install_requires=[
        "aiohttp==3.5.4",
        "aiokafka==0.5.2",
        "aiomysql==0.0.20",
        "asynctest==0.13.0",
        "pymysql==0.9.2",
        "sqlalchemy==1.3.5",
        "thrift==0.11.0",
    ],
    extras_require={"ci": ["ptr"]},
    cmdclass={
        "build_thrift": BuildThriftCommand,
    },
    test_suite=ptr_params["test_suite"],
)
