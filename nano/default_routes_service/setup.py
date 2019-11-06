#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

from setuptools import setup


setup(
    name="default_routes_service",
    version="2019.9.25",
    packages=["default_routes_service"],
    install_requires=["aiohttp", "aiomysql", "sqlalchemy"],
)
