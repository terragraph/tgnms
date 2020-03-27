#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import distutils
import pathlib
import re
import subprocess
import sys

from setuptools import Command, find_packages, setup


assert sys.version_info >= (3, 7, 0), "tglib requires >= Python 3.7"


HERE = pathlib.Path(__file__).parent
txt = (HERE / "tglib" / "__init__.py").read_text("utf-8")
try:
    version = re.findall(r'^__version__ = "([^\']+)"\r?$', txt, re.M)[0]
except IndexError:
    raise RuntimeError("Unable to determine version.")


ptr_params = {
    "entry_point_module": "tglib/main",
    "test_suite": "tests.base",
    "test_suite_timeout": 300,
    "required_coverage": {
        "tglib/clients/prometheus_client.py": 90,
        "tglib/utils/dict.py": 100,
        "tglib/utils/ip.py": 100,
        "TOTAL": 45,
    },
    "run_flake8": True,
    "run_black": True,
    "run_mypy": True,
}


class BuildThriftCommand(Command):
    """A custom command to build thrift type definitions from thrift files."""

    description = "Build thrift type definitions"
    user_options = [
        ("path=", None, "path to raw thrift files"),
        ("out-path=", None, "output path for compiled thrift files"),
    ]

    def initialize_options(self):
        """Set default values for options."""
        self.path = str(HERE / "if")
        self.out_path = str(HERE)

    def finalize_options(self):
        """Post-process options."""
        path = pathlib.Path(self.path)
        if path.exists() and path.is_dir():
            self.path = path
        else:
            raise RuntimeError(f"Thrift directory '{self.path}' does not exist.")

    def run(self):
        """Run command."""
        for file in self.path.iterdir():
            if file.suffix != ".thrift":
                continue

            # Remove 'namespace cpp2' line
            with file.open("r+") as f:
                lines = f.readlines()

                f.seek(0)
                for line in lines:
                    if not line.startswith("namespace cpp2"):
                        f.write(line)

                f.truncate()

            # Run the thrift command
            command = ["/usr/local/bin/thrift", "--gen", "py", "-out", self.out_path]
            command.append(file)
            self.announce(f"Running: {str(command)}", level=distutils.log.INFO)
            subprocess.check_call(command)


setup(
    name="tglib",
    version=version,
    packages=find_packages(exclude=["tests"]),
    python_requires=">=3.7",
    install_requires=[
        "aiohttp>=3.5.4,<4.0",
        "aiokafka>=0.5.2,<1.0",
        "aiomysql>=0.0.20,<1.0",
        "asynctest>=0.13.0,<1.0",
        "kafka-python==1.4.6",
        "pymysql==0.9.2",
        "sqlalchemy>=1.3.5,<2.0",
    ],
    extras_require={"ci": ["ptr"], "docs": ["aiohttp-swagger>=1.0.9,<2.0"]},
    cmdclass={"build_thrift": BuildThriftCommand},
    test_suite=ptr_params["test_suite"],
)
