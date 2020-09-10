#!/usr/bin/env python3
# Copyright (c) Facebook, Inc.

import distutils
import os
import pathlib
import subprocess
from sys import version_info

from setuptools import Command, setup


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


SUBMODULES = {
    "ansible-role-docker": (
        "https://github.com/geerlingguy/ansible-role-docker.git",
        "2.5.2",
    ),
    "ansible-role-glusterfs": (
        "https://github.com/geerlingguy/ansible-role-glusterfs.git",
        "3.0.0",
    ),
}


class CloneSubmodulesCommand(Command):
    """A custom command to clone git submodules."""

    description = "Clone git submodules"
    user_options = [
        ("proxy", None, "pass proxy configuration parameter to github"),
        ("proxy-url=", None, "proxy URL"),
        ("path=", None, "submodule destination path"),
    ]

    def initialize_options(self) -> None:
        """Set default values for options."""
        self.proxy = False
        self.proxy_url = "fwdproxy:8080"
        self.path = str(pathlib.Path(__file__).parent / "nms_cli/nms_stack/roles")

    def finalize_options(self) -> None:
        """Post-process options."""
        self.path = pathlib.Path(self.path)

    def run(self) -> None:
        """Run command."""
        for name, (url, version) in SUBMODULES.items():
            dest = self.path / name
            if dest.exists():
                self.announce(f"Skipping checkout of {name} due to existing copy")
                continue

            command = ["git", "clone", url, "-b", version]
            if self.proxy:
                command += [
                    "-c",
                    f"http.proxy={self.proxy_url}",
                    "-c",
                    f"https.proxy={self.proxy_url}",
                ]

            # Clone the repo to 'self.path/name'
            command.append(dest)
            self.announce(f"Running: {str(command)}", level=distutils.log.INFO)
            subprocess.check_call(command)


def package_ansible(directory):
    directory = os.path.join(PACKAGE, directory)
    paths = []
    for (path, _directories, filenames) in os.walk(directory, followlinks=True):
        for filename in filenames:
            paths.append(os.path.join("..", path, filename))
    return paths


setup(
    name="nms",
    version="2020.09.10",
    description=("nms cli"),
    packages=[PACKAGE, "{}.tests".format(PACKAGE)],
    package_data={PACKAGE: package_ansible("nms_stack")},
    url="http://github.com/facebookexternal/terragraph-ansible/",
    author="Mike Nugent",
    author_email="mnugent@fb.com",
    classifiers=[
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3 :: Only",
        "Programming Language :: Python :: 3.7",
        "Development Status :: 3 - Alpha",
    ],
    entry_points={"console_scripts": ["nms = nms_cli.nms:cli"]},
    python_requires=">=3.7",
    install_requires=[
        "ansible==2.9.9",
        "click",
        "configparser",
        "oyaml",
        "pygments",
        "setuptools",
    ],
    cmdclass={"clone_submodules": CloneSubmodulesCommand},
    test_suite=ptr_params["test_suite"],
)
