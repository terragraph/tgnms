#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

from setuptools import setup


ptr_params = {
    "entry_point_module": "default_routes_service/main",
    "test_suite": "tests.base",
    "test_suite_timeout": 600,
    "required_coverage": {"default_routes_service/routes.py": 28, "TOTAL": 19},
    "run_flake8": True,
    "run_black": True,
    "run_mypy": True,
}

setup(
    name="default_routes_service",
    version="2020.01.25",
    packages=["default_routes_service"],
    install_requires=["aiohttp", "aiomysql", "alembic>=1.3.3,<2.0", "sqlalchemy"],
    extras_require={"ci": ["ptr"]},
    test_suite=ptr_params["test_suite"],
    entry_points={
        "console_scripts": ["default_routes_service = default_routes_service.main:main"]
    },
)
