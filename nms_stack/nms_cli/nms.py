#!/usr/bin/env python3
# Copyright (c) 2014-present, Facebook, Inc.

import logging
import os

import click
import oyaml as yaml
import pkg_resources
from nms_cli import ansible_executor, rage  # type: ignore
from pygments import highlight
from pygments.formatters import TerminalFormatter
from pygments.lexers import YamlLexer


INSTALL_PLAYBOOK = "install.yml"
UNINSTALL_PLAYBOOK = "uninstall.yml"

RAGE_DIR = os.path.join(os.path.expanduser("~"), ".nms_logs")

executor = ansible_executor.ansible_executor


def record_version(logger):
    try:
        version = pkg_resources.get_distribution("nms").version
    except Exception as e:
        version = f"[nms not packged, version unknown]\n{e}"
    logger.log(logging.DEBUG, f"nms version: {version}")


def generate_host_groups(host):
    """Generate hostgroup info given a list of hosts.
    """
    # TODO skb For now, all hosts are managers. Later, make this interface nicer.
    hosts = [(h, ["managers"], None, {}) for h in host]

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


common_options = {
    "config-file": click.option(
        "-f", "--config-file", default=None, help="YAML file to load as variable set"
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
    rage.register_invocation_hook(record_version)
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
@add_common_options("config-file", "host", "password", "tags", "verbose")
@click.option("-c", "--controller", required=True, help="Controller to upgrade")
@click.option("-i", "--image", required=False, help="Image to upgrade controller to")
@click.pass_context
@rage.log_command(RAGE_DIR)
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
    a = executor(tags, verbose)

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
@rage.log_command(RAGE_DIR)
def show_defaults(ctx):
    """Dump YAML config to use for option setting"""
    a = executor(None, False)
    group_vars_file = a.get_defaults_file()

    with open(group_vars_file, "r") as fd:
        content = fd.read()
    yaml.add_representer(str, quoted_presenter)
    click.echo(highlight(content, YamlLexer(), TerminalFormatter()), color=True)

    if content is None:
        click.echo("error: cannot read defaults", err=True)
        ctx.exit(2)


def quoted_presenter(dumper, data):
    data = data.replace('"', "")
    data = data.replace("'", "")
    return dumper.represent_scalar("tag:yaml.org,2002:str", data, style='"')


@cli.command()
@add_common_options(
    "config-file",
    "ssl-key-file",
    "ssl-cert-file",
    "host",
    "tags",
    "password",
    "verbose",
)
@click.pass_context
@rage.log_command(RAGE_DIR)
def install(
    ctx, config_file, ssl_key_file, ssl_cert_file, host, tags, verbose, password
):
    """Install the NMS stack of docker images etc."""
    if len(host) > 0:
        # TODO For now, all hosts are managers. Later, make this interace nicer.
        hosts = generate_host_groups(host)
    else:
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

    a = executor(tags, verbose)

    if ssl_cert_file is not None:
        a.ssl_cert_files(os.path.abspath(ssl_key_file), os.path.abspath(ssl_cert_file))

    a.run(hosts, INSTALL_PLAYBOOK, config_file=config_file, password=password)


@cli.command()
@add_common_options("config-file", "host", "tags", "password", "verbose")
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
    "--force",
    is_flag=True,
    help="[Dangerous] Ignore any errors and continue uninstalling",
)
@click.pass_context
@rage.log_command(RAGE_DIR)
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

    a = executor(tags, verbose)
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


@cli.command(name="rage")
@click.pass_context
@click.option("--clean", is_flag=True, help="Remove all rage files")
@click.option('--number', required=False, help="Number of most recent log files to include", default=10, type=int)
def _rage(ctx, clean, number):
    """
    Print the logs of recent nms installer runs for debugging purposes
    """
    if number <= 0:
        raise RuntimeError("--number must be a positive integer")
    if clean:
        rage.clean(RAGE_DIR)
    else:
        files = rage.gather_files(RAGE_DIR, limit=number)
        for filename in files:
            with open(filename, "r") as f:
                print(filename)
                print(rage.remove_ansi(f.read()))


if __name__ == "__main__":
    cli()
