#!/usr/bin/env python3
# Copyright (c) Facebook, Inc.

import distutils
import glob
import os
import pathlib
import subprocess
import zipfile

import jinja2
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


class BuildZip(Command):
    """Build zip of all Kubernetes resources"""

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
        zip archive."""
        zip_name = "k8s_resources"
        with zipfile.ZipFile(f"{zip_name}.zip", "w") as zip_file:
            for file_name in glob.glob("**/templates/**/*.yml", recursive=True):

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

                archive_name = file_name.replace("k8s_nms/ansible/roles/", "")
                archive_name = archive_name.replace("templates/", "")
                self.announce(
                    f"Wrote {archive_name} to {zip_name}.zip", level=distutils.log.INFO
                )
                zip_file.writestr(f"{zip_name}/{archive_name}", templated)

        self.announce(
            f"Finished writing {zip_name}.zip, copy it to the master node and run:",
            level=distutils.log.INFO,
        )
        self.announce(
            f"unzip {zip_name}.zip && find {zip_name} -type f | sed 's/^/-f /g' | xargs kubectl apply",
            level=distutils.log.INFO,
        )


setup(
    name="k8s_nms",
    version="2020.07.16",
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
    cmdclass={"clone_submodules": CloneSubmodulesCommand, "build_zip": BuildZip},
    entry_points={"console_scripts": ["k8s_nms = k8s_nms.nms:cli"]},
    python_requires=">=3.7",
    install_requires=["ansible==2.9.9", "click", "setuptools"],
)
