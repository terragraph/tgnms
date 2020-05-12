#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

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
    version="2020.05.07",
    packages=find_packages(exclude=["tests"]),
    install_requires=["aiohttp"],
    extras_require={"ci": ["ptr"], "docs": ["aiohttp-swagger>=1.0.9,<2.0"]},
    test_suite=ptr_params["test_suite"],
    entry_points={"console_scripts": ["weather_service = weather_service.main:main"]},
)
