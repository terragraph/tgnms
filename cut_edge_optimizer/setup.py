#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

from setuptools import find_packages, setup


ptr_params = {
    "entry_point_module": "cut_edge_optimizer/main",
    "test_suite": "tests.base",
    "test_suite_timeout": 600,
    "required_coverage": {
        "cut_edge_optimizer/optimizations/config_operations.py": 50,
        "cut_edge_optimizer/optimizations/graph.py": 98,
        "cut_edge_optimizer/utils/dict.py": 100,
        "TOTAL": 43,
    },
    "run_flake8": True,
    "run_black": True,
    "run_mypy": True,
}

setup(
    name="cut_edge_optimizer",
    version="2020.07.02",
    packages=find_packages(exclude=["tests"]),
    install_requires=["aiohttp", "networkx>=2.4,<3.0", "sqlalchemy"],
    extras_require={"ci": ["ptr"], "docs": ["aiohttp-swagger>=1.0.9,<2.0"]},
    test_suite=ptr_params["test_suite"],
    entry_points={
        "console_scripts": ["cut_edge_optimizer = cut_edge_optimizer.main:main"]
    },
)
