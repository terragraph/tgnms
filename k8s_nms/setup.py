#!/usr/bin/env python3
# Copyright (c) Facebook, Inc.

from pathlib import Path

from setuptools import setup


# Grab all the files in the ansible folder so they can be added to the Python
# package
package_dir = Path(__file__).parent / "k8s_nms"
ansible_files = [
    str(p.relative_to(package_dir)) for p in package_dir.rglob("ansible/**/*")
]


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
    entry_points={"console_scripts": ["k8s_nms = k8s_nms.nms:cli"]},
    python_requires=">=3.7",
    install_requires=["ansible==2.9.9", "click", "setuptools"],
)
