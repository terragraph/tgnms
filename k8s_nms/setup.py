#!/usr/bin/env python3
# Copyright (c) Facebook, Inc.

import pathlib

from setuptools import setup


# Grab all the files in the ansible folder so they can be added to the Python
# package
package_dir = pathlib.Path(__file__).parent / "k8s_nms"
ansible_files = [
    str(p.relative_to(package_dir)) for p in package_dir.rglob("ansible/**/*")
]

# Bundle the current version of the Kubernetes manifests into the installer so
# there is always a default set of manifests available (can still be configured
# when running the installer via the --template-source flag)
manifest_files = [
    str(p.relative_to(package_dir)) for p in package_dir.rglob("manifests/**/*")
]


setup(
    name="k8s_nms",
    version="2020.11.02",
    description=("k8s_nms cli"),
    packages=["k8s_nms"],
    package_data={"k8s_nms": ansible_files + manifest_files},
    url="http://github.com/facebookexternal/terragraph-apps/",
    author="Terragraph Team",
    author_email="email@example.com",
    classifiers=[
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3 :: Only",
        "Programming Language :: Python :: 3.7",
        "Development Status :: 3 - Alpha",
    ],
    entry_points={"console_scripts": ["k8s_nms = k8s_nms.nms:cli"]},
    python_requires=">=3.7",
    install_requires=[
        "ansible==2.9.*",
        "click==7.0",
        "setuptools",
        "jinja2==2.11.1",
        "pyyaml==5.3",
        "pygments==2.5.2",
        "netaddr==0.7.19",
    ],
)
