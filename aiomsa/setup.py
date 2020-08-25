#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import pathlib
import re
import subprocess
import sys

from setuptools import Command, distutils, find_packages, setup


assert sys.version_info >= (3, 8, 0), "aiomsa requires >= Python 3.8"


HERE = pathlib.Path(__file__).parent
txt = (HERE / "aiomsa" / "__init__.py").read_text("utf-8")
try:
    version = re.findall(r'^__version__ = "([^\']+)"\r?$', txt, re.M)[0]
except IndexError:
    raise RuntimeError("Unable to determine version.")


ptr_params = {
    "entry_point_module": "aiomsa/main",
    "test_suite": "tests.base",
    "test_suite_timeout": 300,
    "required_coverage": {
        "aiomsa/clients/prometheus_client.py": 82,
        "aiomsa/utils/dict.py": 100,
        "aiomsa/utils/ip.py": 100,
        "TOTAL": 48,
    },
    "run_flake8": True,
    "run_black": True,
    "run_mypy": True,
}


setup(
    name="aiomsa",
    version=version,
    packages=find_packages(exclude=["tests"]),
    python_requires=">=3.8",
    install_requires=[
        "aiohttp>=3.5.4,<4.0",
        "aiokafka>=0.5.2,<1.0",
        "aiomysql>=0.0.20,<1.0",
        "sqlalchemy>=1.3.5,<2.0",
        "uvloop>=0.14.0,<1.0",
    ],
    extras_require={
        "ci": ["asynctest>=0.13.0,<1.0", "ptr"],
        "docs": ["aiohttp-swagger>=1.0.9,<2.0", "pyyaml>=5.3.1,<6.0"],
    },
    test_suite=ptr_params["test_suite"],
)
