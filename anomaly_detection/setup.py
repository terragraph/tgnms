#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

from setuptools import find_packages, setup

ptr_params = {
    "disabled": True,
    "entry_point_module": "anomaly_detection/main",
    "test_suite": "tests.base",
    "test_suite_timeout": 300,
    "required_coverage": {},
    "run_flake8": True,
    "run_black": True,
    "run_mypy": True,
}

setup(
    name="anomaly_detection",
    version="2022.03.31",
    packages=find_packages(exclude=["tests"]),
    python_requires=">=3.7",
    install_requires=["numpy>=1.16.4,<2.0"],
    extras_require={"ci": ["ptr"], "docs": ["aiohttp-swagger>=1.0.9,<2.0"]},
    test_suite=ptr_params["test_suite"],
    entry_points={
        "console_scripts": ["anomaly_detection = anomaly_detection.main:main"]
    },
)
