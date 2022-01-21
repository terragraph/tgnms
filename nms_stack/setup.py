#!/usr/bin/env python3
# Copyright (c) 2014-present, Facebook, Inc.
# Copyright (c) Facebook, Inc.

import os
from sys import version_info

from setuptools import setup


PACKAGE = "nms_cli"

assert version_info >= (3, 7, 0), "nms requires >= Python 3.7"


# ptr can't handle using PACKAGE variable
# https://github.com/facebookincubator/ptr/issues/49
ptr_params = {
    "test_suite": "nms_cli.tests.base",
    "test_suite_timeout": 300,
    "required_coverage": {"nms_cli/ansible_executor.py": 25, "nms_cli/nms.py": 34},
    "run_black": False,  # Need a way to ignore submodule .py's
    "run_flake8": True,
    "run_mypy": False,
}


def package_ansible(directory):
    directory = os.path.join(PACKAGE, directory)
    paths = []
    for (path, _directories, filenames) in os.walk(directory, followlinks=True):
        for filename in filenames:
            paths.append(os.path.join("..", path, filename))
    return paths


setup(
    name="nms",
    description=("nms cli"),
    packages=[PACKAGE, "{}.tests".format(PACKAGE)],
    package_data={
        PACKAGE: (
            package_ansible("nms_stack")
            + package_ansible("k8s_nms")
            + [os.path.join("..", PACKAGE, "__version__")]
        ),
    },
    url="http://github.com/facebookexternal/terragraph-ansible/",
    author="Mike Nugent",
    author_email="mnugent@fb.com",
    classifiers=[
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3 :: Only",
        "Programming Language :: Python :: 3.7",
        "Development Status :: 3 - Alpha",
    ],
    entry_points={"console_scripts": ["nms = nms_cli.main:main"]},
    python_requires=">=3.7",
    install_requires=[
        "ansible==2.9.*",
        "click==7.0",
        "configparser",
        "oyaml",
        "setuptools",
        "jinja2==2.11.1",
        "pyyaml==5.3",
        "pygments==2.5.2",
        "netaddr==0.7.19",
    ],
    test_suite=ptr_params["test_suite"],
)
