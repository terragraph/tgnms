#!/usr/bin/env python3
# Copyright (c) Facebook, Inc.

import distutils
import pathlib
import subprocess

from setuptools import Command, setup


# Grab all the files in the ansible folder so they can be added to the Python
# package
package_dir = pathlib.Path(__file__).parent / "k8s_nms"
ansible_files = [
    str(p.relative_to(package_dir)) for p in package_dir.rglob("ansible/**/*")
]


SUBMODULES = {
    "kubeadm-ansible": ("https://github.com/kairen/kubeadm-ansible.git", "v1.9.x")
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
        self.path = str(pathlib.Path(__file__).parent / "k8s_nms/ansible/plays")

    def finalize_options(self) -> None:
        """Post-process options."""
        self.path = pathlib.Path(self.path)

    def run(self) -> None:
        """Run command."""
        for name, (url, version) in SUBMODULES.items():
            print(name, url, version)
            dest = self.path / name
            if dest.exists():
                print("exists")
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


setup(
    name="k8s_nms",
    version="2020.06.30",
    description=("k8s_nms cli"),
    packages=["k8s_nms"],
    package_data={"k8s_nms": ansible_files},
    url="http://github.com/facebookexternal/terragraph-ansible/",
    author="Terragraph Team",
    # TODO: What email to put here?
    author_email="email@example.com",
    classifiers=[
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3 :: Only",
        "Programming Language :: Python :: 3.7",
        "Development Status :: 3 - Alpha",
    ],
    cmdclass={"clone_submodules": CloneSubmodulesCommand},
    entry_points={"console_scripts": ["k8s_nms = k8s_nms.nms:cli"]},
    python_requires=">=3.7",
    install_requires=["ansible==2.9.9", "click", "setuptools"],
)
