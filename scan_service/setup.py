#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

from setuptools import find_packages, setup

setup(
    name="scan_service",
    version="2019.9.23",
    python_requires=">=3.7",
    packages=find_packages(),
    install_requires=[
        "python-snappy>=0.5.4,<1.0",
    ],
)
