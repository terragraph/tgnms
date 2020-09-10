#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

from setuptools import find_packages, setup


ptr_params = {
    "entry_point_module": "network_health_service/main",
    "test_suite": "tests.base",
    "test_suite_timeout": 300,
    "required_coverage": {
        "network_health_service/stats/fetch_stats.py": 28,
        "TOTAL": 20,
    },
    "run_flake8": True,
    "run_black": True,
    "run_mypy": True,
}

setup(
    name="network_health_service",
    version="2020.09.10",
    packages=find_packages(exclude=["tests"]),
    python_requires=">=3.7",
    extras_require={"ci": ["ptr"], "docs": ["aiohttp-swagger>=1.0.9,<2.0"]},
    test_suite=ptr_params["test_suite"],
    entry_points={
        "console_scripts": ["network_health_service = network_health_service.main:main"]
    },
)
