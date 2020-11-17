#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

from setuptools import find_packages, setup


ptr_params = {
    "disabled": True,
    "entry_point_module": "optimizer_service/main",
    "test_suite": "tests.base",
    "test_suite_timeout": 600,
    "required_coverage": {
        "optimizer_service/optimizations/config_operations.py": 50,
        "optimizer_service/optimizations/graph.py": 98,
        "optimizer_service/flow_graph.py": 97,
        "optimizer_service/utils/dict.py": 100,
        "TOTAL": 2,
    },
    "run_flake8": True,
    "run_black": True,
    "run_mypy": True,
}

setup(
    name="optimizer_service",
    version="2020.11.17",
    packages=find_packages(exclude=["tests"]),
    install_requires=["aiohttp", "cvxpy>=1.0.<2", "networkx>=2.4,<3.0", "sqlalchemy"],
    extras_require={"ci": ["ptr"], "docs": ["aiohttp-swagger>=1.0.9,<2.0"]},
    test_suite=ptr_params["test_suite"],
    entry_points={
        "console_scripts": ["optimizer_service = optimizer_service.main:main"]
    },
)
