#!/usr/bin/env python3
# Copyright (c) 2014-present, Facebook, Inc.

import os
import click
import oyaml as yaml
import pkg_resources

from nms_cli import ansible_executor  # type: ignore
from pygments import highlight
from pygments.lexers import YamlLexer
from pygments.formatters import TerminalFormatter

INSTALL_PLAYBOOK = "install.yml"
UNINSTALL_PLAYBOOK = "uninstall.yml"


def generate_host_groups(host):
    """Generate hostgroup info given a list of hosts.
    """
    # TODO skb For now, all hosts are managers. Later, make this interface nicer.
    hosts = [(h, ["managers"], None) for h in host]

    # MySQL, Prometheus, and BQS do not write their data to glusterfs due to
    # performance issues. This means they can only be run on a specific Docker
    # host. The hosts that run each service are picked arbitrarily:
    # - Database runs on the first host
    # - Prometheus runs on the second host (if available)
    num_hosts = len(hosts)
    db_host = hosts[0]
    prometheus_host = hosts[min(num_hosts, 2) - 1]

    # Add specific groups to the appropriate hosts
    db_host[1].append("database")
    prometheus_host[1].append("prometheus")

    return hosts


@click.group(invoke_without_command=True)
@click.option("--version", is_flag=True, default=False, help="Show version and exit")
@click.option("--short", is_flag=True, default=False, help="Short version")
@click.pass_context
def cli(ctx, version, short):
    if version or short:
        longver = "Terragraph NMS cli utility version: {}"
        try:
            verstr = pkg_resources.get_distribution("nms").version
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
@click.option(
    "-f", "--config-file", default=None, help="YAML file to load as variable set"
)
@click.option(
    "-h",
    "--host",
    default=None,
    multiple=True,
    help="Hostnames to configure and install Terragraph Cloud Services",
)
@click.option("-c", "--controller", required=True, help="Controller to upgrade")
@click.option("-i", "--image", required=False, help="Image to upgrade controller to")
@click.option("-t", "--tags", multiple=True, help="Ansible tags to run")
@click.option("-v", "--verbose", count=True, default=0)
@click.option(
    "-p", "--password", help="SSH/sudo password for setup bootstrap", is_flag=True
)
@click.pass_context
def upgrade(ctx, config_file, host, controller, image, tags, verbose, password):
    if not host:
        click.echo("--host is required")
        ctx.exit(1)
    if not config_file:
        click.echo("--config-file is required")
        ctx.exit(1)

    loaded_config = None
    if config_file:
        with open(config_file) as f:
            loaded_config = yaml.safe_load(f.read())

    if password:
        password = click.prompt("SSH/sudo password", hide_input=True, default=None)

    tags += ("e2e_controller",)
    a = ansible_executor.ansible_executor(tags, verbose)

    generated_config = {}
    if loaded_config:
        controllers_list = loaded_config["controllers_list"]
        controllers_list = [
            ctrlr for ctrlr in controllers_list if ctrlr["name"] == controller
        ]
        if not controllers_list:
            click.echo("Controller to upgrade is not in controllers_list")
            ctx.exit(1)

        generated_config["controllers_list"] = controllers_list

    if image:
        generated_config["e2e_image"] = image

    hosts = generate_host_groups(host)

    a.run(
        hosts,
        INSTALL_PLAYBOOK,
        config_file=config_file,
        generated_config=generated_config,
        password=password,
    )


@cli.command()
@click.pass_context
def show_defaults(ctx):
    """Dump YAML config to use for option setting"""
    a = ansible_executor.ansible_executor(None, False)
    group_vars_file = a.get_defaults_file()

    with open(group_vars_file, "r") as fd:
        content = fd.read()
    yaml.add_representer(str, quoted_presenter)
    click.echo(highlight(content, YamlLexer(), TerminalFormatter()))

    if content is None:
        click.echo("error: cannot read defaults", err=True)
        ctx.exit(2)


def quoted_presenter(dumper, data):
    data = data.replace('"', "")
    data = data.replace("'", "")
    return dumper.represent_scalar("tag:yaml.org,2002:str", data, style='"')


@cli.command()
@click.option(
    "-f", "--config-file", default=None, help="YAML file to load as variable set"
)
@click.option(
    "-k",
    "--ssl-key-file",
    default=None,
    help="Private Key file for Apache Server e.g. privkey.pem",
)
@click.option(
    "-C",
    "--ssl-cert-file",
    default=None,
    help="SSL Certificate file for Apache Server e.g. fullchain.pem",
)
@click.option(
    "-h",
    "--host",
    default=None,
    multiple=True,
    help="Hostnames to configure and install Terragraph Cloud Services",
)
@click.option("-t", "--tags", multiple=True, help="Ansible tags to run")
@click.option(
    "-p", "--password", help="SSH/sudo password for setup bootstrap", is_flag=True
)
@click.option("-v", "--verbose", count=True, default=0)
@click.pass_context
def install(
    ctx, config_file, ssl_key_file, ssl_cert_file, host, tags, verbose, password
):
    """Install the NMS stack of docker images etc."""
    if not host:
        click.echo("--host is required")
        ctx.exit(1)

    cert_options = [ssl_key_file, ssl_cert_file]
    if any(cert_options) != all(cert_options):
        click.echo(
            "pebcak: ssl-key-file and ssl-cert-file are mutually "
            + "necessary. i.e. define both or none",
            err=True,
        )
        ctx.exit(3)

    if password:
        password = click.prompt("SSH/sudo password", hide_input=True, default=None)

    a = ansible_executor.ansible_executor(tags, verbose)

    if ssl_cert_file is not None:
        a.ssl_cert_files(os.path.abspath(ssl_key_file), os.path.abspath(ssl_cert_file))

    # TODO skb For now, all hosts are managers. Later, make this interace nicer.
    hosts = generate_host_groups(host)
    a.run(hosts, INSTALL_PLAYBOOK, config_file=config_file, password=password)


@cli.command()
@click.option(
    "-f", "--config-file", default=None, help="YAML file to load as variable set"
)
@click.option(
    "-h",
    "--host",
    default=None,
    multiple=True,
    help="Hostnames to uninstall Terragraph Cloud Services",
)
@click.option("-v", "--verbose", count=True, default=0)
@click.option("-t", "--tags", multiple=True, help="Ansible tags to run")
@click.option(
    "--remove-docker",
    is_flag=True,
    help="also uninstall docker from system, disabled by default",
)
@click.option(
    "--remove-gluster",
    is_flag=True,
    help="also uninstall gluster from system, disabled by default",
)
@click.option(
    "--delete-data",
    is_flag=True,
    help="also delete data from system, disabled by default",
)
@click.option(
    "--backup-file",
    default="backup.tar.gz",
    help="Backup file name, defaults to backup.tar.gz",
)
@click.option(
    "--skip-backup", is_flag=True, help="skip backing up data, enabled by default"
)
@click.option(
    "-p", "--password", help="SSH/sudo password for setup bootstrap", is_flag=True
)
@click.option(
    "--force",
    is_flag=True,
    help="[Dangerous] Ignore any errors and continue uninstalling",
)
@click.pass_context
def uninstall(
    ctx,
    config_file,
    host,
    verbose,
    tags,
    remove_docker,
    remove_gluster,
    delete_data,
    backup_file,
    skip_backup,
    password,
    force,
):
    """Uninstall the NMS stack of docker images etc."""
    if not host:
        click.echo("--host is required")
        ctx.exit(1)

    if password:
        password = click.prompt("SSH/sudo password", hide_input=True, default=None)

    a = ansible_executor.ansible_executor(tags, verbose)
    a.uninstall_options(
        skip_backup,
        delete_data,
        os.path.abspath(backup_file),
        remove_docker,
        remove_gluster,
        force,
    )

    hosts = generate_host_groups(host)
    a.run(hosts, UNINSTALL_PLAYBOOK, config_file=config_file, password=password)


if __name__ == "__main__":
    cli()
