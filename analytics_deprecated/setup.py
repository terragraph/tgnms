#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

from setuptools import find_packages, setup


setup(
    name="analytics",
    version="2019.9.04",
    python_requires=">=3.7",
    packages=find_packages(),
    package_data={"module": ["AnalyticsConfig.json"], "tests": ["auto_test.sh"]},
    include_package_data=True,
    install_requires=[
        "click==7.0",
        "croniter==0.3.30",
        "django==2.1.1",
        "jupyter==1.0.0",
        "matplotlib==2.2.2",
        "mysqlclient==1.3.13",
        "numpy==1.14.5",
        "pandas==0.25.0",
        "requests==2.19.1",
        "tabulate==0.8.3",
    ],
)
