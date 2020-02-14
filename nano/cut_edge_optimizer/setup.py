#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

from setuptools import setup


ptr_params = {
    "entry_point_module": "cut_edge_optimizer/main",
    "test_suite": "tests.base",
    "test_suite_timeout": 600,
    "required_coverage": {
        "cut_edge_optimizer/graph_analysis.py": 98,
        "cut_edge_optimizer/config_operations.py": 55,
        "TOTAL": 44,
    },
    "run_flake8": True,
    "run_black": True,
    "run_mypy": True,
}

setup(
    name="cut_edge_optimizer",
    version="2020.13.02",
    packages=["cut_edge_optimizer"],
    install_requires=["aiohttp", "networkx"],
    extras_require={"ci": ["ptr"]},
    test_suite=ptr_params["test_suite"],
    entry_points={
        "console_scripts": ["cut_edge_optimizer = cut_edge_optimizer.main:main"]
    },
)
