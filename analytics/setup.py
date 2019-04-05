#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

from setuptools import setup


setup(
    name="analytics",
    version="2019.3.29",
    packages=[
        "link_insights",
        "module",
        "tests",
        "network_test_api",
        "network_test_api/api",
        "network_test_api/api/migrations",
        "network_test_api/api/network_test",
        "network_test_api/nmsapi",
    ],
    package_data={"module": ["AnalyticsConfig.json"], "tests": ["auto_test.sh"]},
    include_package_data=True,
    install_requires=[
        "aiohttp==3.4.4",
        "click==7.0",
        "django==2.1.1",
        "jupyter==1.0.0",
        "matplotlib==2.2.2",
        "numpy==1.14.5",
        "PyMySQL==0.9.2",
        "requests==2.19.1",
        "mysqlclient==1.3.13",
        "tabulate==0.8.3",
    ],
    # TODO: Add unit tests
    # test_suite="analytics.tests.base",
)
