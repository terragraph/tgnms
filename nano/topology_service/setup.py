#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

from setuptools import setup


ptr_params = {
    "entry_point_module": "topology_service/main",
    "test_suite": "tests.base",
    "test_suite_timeout": 600,
    "required_coverage": {
        "topology_service/util.py": 100,
        "tests/sanitize_topology_test.py": 100,
        "TOTAL": 33,
    },
    "run_flake8": True,
    "run_black": True,
    "run_mypy": True,
}

setup(
    name="topology_service",
    version="2019.12.03",
    packages=["topology_service"],
    install_requires=["aiohttp", "pymongo"],
    extras_require={"ci": ["ptr"]},
    test_suite=ptr_params["test_suite"],
    entry_points={"console_scripts": ["topology_service = topology_service.main:main"]},
)
