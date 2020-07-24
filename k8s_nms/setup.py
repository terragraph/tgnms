#!/usr/bin/env python3
# Copyright (c) Facebook, Inc.

import distutils
import glob
import io
import os
import pathlib
import subprocess
import tarfile

import jinja2
from setuptools import Command, setup


# Grab all the files in the ansible folder so they can be added to the Python
# package
package_dir = pathlib.Path(__file__).parent / "k8s_nms"
ansible_files = [
    str(p.relative_to(package_dir)) for p in package_dir.rglob("ansible/**/*")
]


def tarfile_writestr(tar_file, name, string):
    """
    Python's tarfile only supportes writes from files (unlike zipfile.writestr),
    so this utility adds that functionality to tarfile.
    """
    encoded = string.encode("utf-8")
    tarinfo = tarfile.TarInfo(name)
    tarinfo.size = len(encoded)
    tar_file.addfile(tarinfo, io.BytesIO(encoded))


class BuildTarball(Command):
    """Build tar.gz of all Kubernetes resources"""

    description = "Template Kubernetes resources"
    user_options = []

    def initialize_options(self) -> None:
        """Set default values for options."""
        # Distutils complains if this method isn't implemented
        pass

    def finalize_options(self) -> None:
        """Post-process options."""
        # Distutils complains if this method isn't implemented
        pass

    def run(self) -> None:
        """Find any ``.yml`` files in a ``templates`` folder and add them to a
        tarball."""
        tar_name = "k8s_resources"
        full_tar_name = f"{tar_name}.tar.gz"

        resources_dir = "resources"

        with tarfile.open(f"{full_tar_name}", "w:gz") as tar_file:
            for file_name in glob.glob(f"**/{resources_dir}/**/*.yml", recursive=True):

                def lookup(type, lookup_file):
                    path_parts = [os.path.dirname(file_name)]
                    if lookup_file.startswith(".."):
                        # The paths for ansible's `lookup` do this automatically
                        # for some reason, so mirror it here so the paths in the
                        # template file are the same
                        path_parts.append("..")
                    path_parts.append(lookup_file)

                    path = os.path.join(*path_parts)
                    return open(path, "r").read()

                template = jinja2.Template(open(file_name, "r").read())
                templated = template.render({"lookup": lookup})

                archive_name = file_name.replace(f"{resources_dir}/", "")
                self.announce(
                    f"Wrote {archive_name} to {full_tar_name}", level=distutils.log.INFO
                )

                tarfile_writestr(tar_file, f"{tar_name}/{archive_name}", templated)

        self.announce(
            f"Finished writing {full_tar_name}, copy it to the master node and run:",
            level=distutils.log.INFO,
        )
        self.announce(
            f"tar -xzvf {full_tar_name} && find {tar_name} -type f | sed 's/^/-f /g' | xargs kubectl apply",
            level=distutils.log.INFO,
        )


setup(
    name="k8s_nms",
    version="2020.07.23",
    description=("k8s_nms cli"),
    packages=["k8s_nms"],
    package_data={"k8s_nms": ansible_files},
    url="http://github.com/facebookexternal/terragraph-ansible/",
    author="Terragraph Team",
    author_email="email@example.com",
    classifiers=[
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3 :: Only",
        "Programming Language :: Python :: 3.7",
        "Development Status :: 3 - Alpha",
    ],
    cmdclass={"build_tar": BuildTarball},
    entry_points={"console_scripts": ["k8s_nms = k8s_nms.nms:cli"]},
    python_requires=">=3.7",
    install_requires=["ansible==2.9.9", "click", "setuptools"],
)
