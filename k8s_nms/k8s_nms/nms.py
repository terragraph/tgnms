#!/usr/bin/env python3
# Copyright (c) 2014-present, Facebook, Inc.

import glob
import os
import io
import subprocess
import tarfile
import tempfile
import urllib.request
from typing import Any, Dict

import click
import pkg_resources
import yaml

from .config import configure_templates


common_options = {
    "config-file": click.option(
        "-f",
        "--config-file",
        default=None,
        required=True,
        help="YAML file to load as variable set",
    ),
    "host": click.option(
        "-h",
        "--host",
        default=None,
        multiple=True,
        help="Hostnames to configure Terragraph Cloud Services",
    ),
    "ssl-key-file": click.option(
        "-k",
        "--ssl-key-file",
        default=None,
        help="Private key file for Apache Server (e.g. privkey.pem)",
    ),
    "ssl-cert-file": click.option(
        "-C",
        "--ssl-cert-file",
        default=None,
        help="SSL certificate file for Apache Server (e.g. fullchain.pem)",
    ),
    "tags": click.option("-t", "--tags", multiple=True, help="Ansible tags to run"),
    "password": click.option(
        "-p", "--password", help="SSH/sudo password for setup bootstrap", is_flag=True
    ),
    "verbose": click.option("-v", "--verbose", count=True, default=0),
    "masters": click.option(
        "-m",
        "--master",
        "masters",
        default=None,
        multiple=True,
        required=True,
        help="Control plane nodes for Kubernetes",
    ),
    "workers": click.option(
        "-w",
        "--worker",
        "workers",
        default=None,
        multiple=True,
        help="Worker nodes for Kubernetes",
    ),
}


def run_ansible(playbook, extra_vars_file, inventory, verbose):
    """
    Call the ansible-playbook binary, passing in a generated inventory and
    extra variables to set
    """
    with tempfile.NamedTemporaryFile() as temp:
        temp.write(yaml.safe_dump(inventory).encode("utf-8"))
        temp.flush()
        playbook = os.path.join(os.path.dirname(__file__), "ansible", playbook)

        command = f"ansible-playbook --extra-vars @{extra_vars_file} --inventory {temp.name} {playbook}"
        command = command.split(" ")
        if verbose > 0:
            command.append(f"-{'v' * verbose}")
        subprocess.check_call(command)


def generate_inventory(masters, workers):
    return {
        "all": {
            "children": {
                "kube-cluster": {
                    "children": {
                        "master": {"hosts": {m: "" for m in masters}},
                        "node": {"hosts": {w: "" for w in workers}},
                    }
                }
            }
        }
    }


def add_common_options(*args):
    def wrapper(fn):
        for arg_name in args:
            if arg_name not in common_options:
                raise RuntimeError(f"Unknown option {arg_name}")
            fn = common_options[arg_name](fn)
        return fn

    return wrapper


@click.group(invoke_without_command=True)
@click.option("--version", is_flag=True, default=False, help="Show version and exit")
@click.option("--short", is_flag=True, default=False, help="Short version")
@click.pass_context
def cli(ctx, version, short):
    if version or short:
        longver = "[work in progress] Terragraph NMS cli utility version: {}"
        try:
            verstr = pkg_resources.get_distribution("k8s_nms").version
        except Exception as e:
            click.echo("Cannot find package version, is this in a package?")
            click.echo(f"{e}")
            verstr = "[unknown]"

        if not short:
            verstr = longver.format(verstr)

        click.echo(verstr)
        ctx.exit()

    if ctx.invoked_subcommand is None:
        click.echo(ctx.get_help())
        ctx.exit(1)


@cli.command()
@add_common_options("config-file", "tags", "password", "verbose", "masters", "workers")
@click.pass_context
def install(ctx, config_file, tags, verbose, password, workers, masters):
    """Bootstrap a Kubernetes cluster"""
    run_ansible(
        "install.yml",
        config_file,
        generate_inventory(masters, workers),
        verbose=verbose,
    )


@cli.command()
@add_common_options("config-file", "tags", "password", "masters", "workers", "verbose")
@click.pass_context
def uninstall(ctx, config_file, verbose, tags, password, masters, workers):
    """
    Remove a Kubernetes cluster and associated packages
    """
    run_ansible(
        "uninstall.yml",
        config_file,
        generate_inventory(masters, workers),
        verbose=verbose,
    )


def get_tar_files(source):
    tar = tarfile.open(fileobj=source, mode="r:gz")
    return {
        filename: tar.extractfile(filename).read().decode("utf-8")
        for filename in tar.getmembers()
    }


@cli.command()
@add_common_options("config-file", "verbose")
@click.option(
    "-t", "--template-source", default=None, required=True, help="Source of templates (can be a URL, local .tar.gz, or uncompressed local directory"
)
@click.pass_context
def configure(ctx, config_file, verbose, template_source):
    """
    Generate Kubernetes manifest from a template source
    """
    if template_source.startswith("http"):
        with urllib.request.urlopen(template_source) as f:
            files_map = get_tar_files(io.BytesIO(f.read()))
    elif template_source.endswith(".tar.gz"):
        files_map = get_tar_files(open(template_source, "rb"))
    else:
        files = glob.glob(f"**/{template_source}/**/*.yml", recursive=True)
        files_map = {filename: open(filename, "r").read() for filename in files}

    with open(config_file, "r") as f:
        configure_templates(yaml.safe_load(f), files_map)


if __name__ == "__main__":
    cli()
