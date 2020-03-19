#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

from setuptools import setup


ptr_params = {
    "entry_point_module": "cut_edge_optimizer/main",
    "test_suite": "tests.base",
    "test_suite_timeout": 600,
    "required_coverage": {
        "cut_edge_optimizer/graph_analysis.py": 65,
        "cut_edge_optimizer/config_operations.py": 53,
        "TOTAL": 43,
    },
    "run_flake8": True,
    "run_black": True,
    "run_mypy": True,
}

setup(
    name="cut_edge_optimizer",
    version="2020.03.19",
    packages=["cut_edge_optimizer"],
    install_requires=["aiohttp", "networkx"],
    extras_require={"ci": ["ptr"]},
    test_suite=ptr_params["test_suite"],
    entry_points={
        "console_scripts": ["cut_edge_optimizer = cut_edge_optimizer.main:main"]
    },
)
