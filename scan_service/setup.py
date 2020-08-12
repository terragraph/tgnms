#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

from setuptools import find_packages, setup


ptr_params = {
    "entry_point_module": "scan_service/main",
    "test_suite": "tests.base",
    "test_suite_timeout": 600,
    "required_coverage": {
        "scan_service/analysis/connectivity.py": 68,
        "scan_service/utils/data_loader.py": 63,
        "scan_service/utils/hardware_config.py": 100,
        "TOTAL": 21,
    },
    "run_flake8": True,
    "run_black": True,
    "run_mypy": True,
}

setup(
    name="scan_service",
    version="2020.08.12",
    python_requires=">=3.7",
    packages=find_packages(exclude=["tests"]),
    install_requires=[
        "aiohttp",
        "alembic>=1.3.3,<2.0",
        "bidict>=0.19.0,<1.0",
        "croniter>=0.3.30,<1.0",
        "numpy>=1.16.4,<2.0",
        "sqlalchemy",
    ],
    extras_require={"ci": ["ptr"], "docs": ["aiohttp-swagger>=1.0.9,<2.0"]},
    test_suite=ptr_params["test_suite"],
    entry_points={"console_scripts": ["scan_service = scan_service.main:main"]},
)
