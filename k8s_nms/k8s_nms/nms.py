#!/usr/bin/env python3
# Copyright (c) 2014-present, Facebook, Inc.

import os
import subprocess
import tempfile

import click
import pkg_resources
import yaml


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
        help="Control plane nodes for kubernetes",
    ),
    "workers": click.option(
        "-w",
        "--worker",
        "workers",
        default=None,
        multiple=True,
        help="Worker nodes for kubernetes",
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
        playbook = os.path.join(os.path.dirname(__file__), playbook)

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
    """Bootstrap a kubernetes cluster"""
    run_ansible(
        "ansible/install.yml",
        config_file,
        generate_inventory(masters, workers),
        verbose=verbose,
    )


@cli.command()
@add_common_options("config-file", "tags", "password", "masters", "workers", "verbose")
@click.pass_context
def uninstall(ctx, config_file, verbose, tags, password, masters, workers):
    """
    Remove a kubernetes cluster and associated packages
    """
    run_ansible(
        "ansible/uninstall.yml",
        config_file,
        generate_inventory(masters, workers),
        verbose=verbose,
    )


if __name__ == "__main__":
    cli()
