#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

from setuptools import find_packages, setup


ptr_params = {
    "entry_point_module": "default_routes_service/main",
    "test_suite": "tests.base",
    "test_suite_timeout": 300,
    "required_coverage": {
        "default_routes_service/utils/utilization.py": 100,
        "TOTAL": 7,
    },
    "run_flake8": True,
    "run_black": True,
    "run_mypy": True,
}

setup(
    name="default_routes_service",
    version="2020.09.18",
    packages=find_packages(exclude=["tests"]),
    install_requires=["aiohttp", "aiomysql", "alembic>=1.3.3,<2.0", "sqlalchemy"],
    extras_require={"ci": ["ptr"], "docs": ["aiohttp-swagger>=1.0.9,<2.0"]},
    test_suite=ptr_params["test_suite"],
    entry_points={
        "console_scripts": ["default_routes_service = default_routes_service.main:main"]
    },
)
