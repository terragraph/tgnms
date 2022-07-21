#!/usr/bin/env python3

# Copyright (c) Meta Platforms, Inc. and affiliates.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

from setuptools import find_packages, setup


# Specific Python Test Runner (ptr) params for Unit Testing Enforcement
ptr_params = {
    "entry_point_module": "weather_service/main",
    "test_suite": "tests.test_weather_service",
    "test_suite_timeout": 600,
    "run_flake8": True,
    "run_black": True,
    "run_mypy": True,
}


setup(
    name="weather_service",
    version="2021.03.30",
    packages=find_packages(exclude=["tests"]),
    install_requires=["aiohttp"],
    extras_require={"ci": ["ptr"], "docs": ["aiohttp-swagger>=1.0.9,<2.0"]},
    test_suite=ptr_params["test_suite"],
    entry_points={"console_scripts": ["weather_service = weather_service.main:main"]},
)
