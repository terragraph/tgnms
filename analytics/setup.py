#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

from setuptools import find_packages, setup


ptr_params = {
    "entry_point_module": "analytics/main",
    "test_suite": "tests.base",
    "test_suite_timeout": 300,
    "required_coverage": {"analytics/link_insight.py": 33, "TOTAL": 31},
    "run_flake8": True,
    "run_black": True,
    "run_mypy": True,
}

setup(
    name="analytics",
    version="2020.11.17",
    packages=find_packages(exclude=["tests"]),
    python_requires=">=3.7",
    install_requires=["numpy>=1.16.4,<2.0"],
    extras_require={"ci": ["ptr"], "docs": ["aiohttp-swagger>=1.0.9,<2.0"]},
    test_suite=ptr_params["test_suite"],
    entry_points={"console_scripts": ["analytics = analytics.main:main"]},
)
