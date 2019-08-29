#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

from setuptools import find_packages, setup


setup(
    name="analytics",
    version="2019.7.17",
    python_requires=">=3.7",
    packages=find_packages(),
    package_data={"module": ["AnalyticsConfig.json"], "tests": ["auto_test.sh"]},
    include_package_data=True,
    install_requires=[
        "aiohttp==3.5.4",
        "aiomysql==0.0.20",
        "click==7.0",
        "croniter==0.3.30",
        "django==2.1.1",
        "flask==1.0.2",
        "jupyter==1.0.0",
        "matplotlib==2.2.2",
        "mysqlclient==1.3.13",
        "numpy==1.14.5",
        "pandas==0.25.0",
        "pymysql==0.9.2",
        "python-snappy==0.5.4",
        "requests==2.19.1",
        "sqlalchemy==1.3.5",
        "tabulate==0.8.3",
    ],
    # TODO: Add unit tests
    # test_suite="analytics.tests.base",
)
