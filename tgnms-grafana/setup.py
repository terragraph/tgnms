#!/usr/bin/env python3
# Copyright (c) Facebook, Inc.

from sys import version_info

from setuptools import setup


PACKAGE = "grafana_cli"
VERSION = "0.0.1"

assert version_info >= (3, 5, 0), "grafana cli requires >= Python 3.5"

setup(
    name="grafana",
    version=VERSION,
    description=("grafana cli"),
    long_description=("cli used during Grafana initialization to load metadata"),
    packages=["utilities"],
    url="http://github.com/facebookexternal/terragraph-apps/",
    author="Cory Modlin",
    author_email="cmodlin@fb.com",
    classifiers=(
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3 :: Only",
        "Programming Language :: Python :: 3.5",
        "Development Status :: 3 - Alpha",
    ),
    entry_points={"console_scripts": ["grafana_cli = utilities.grafana_init:cli"]},
    python_requires=">=3.5",
    install_requires=["click", "requests>=2.19.1"],
)
