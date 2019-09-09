#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

from setuptools import setup


setup(
    name="topology_service",
    version="2019.9.9",
    packages=["topology_service"],
    install_requires=["aiohttp", "pymongo"],
)
