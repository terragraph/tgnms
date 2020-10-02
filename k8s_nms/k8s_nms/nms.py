#!/usr/bin/env python3
# Copyright (c) 2014-present, Facebook, Inc.

import contextlib
import glob
import io
import os
import subprocess
import sys
import tarfile
import tempfile
import urllib.request
from typing import Any, Dict

import click
import pkg_resources
import yaml
from pygments import highlight
from pygments.formatters import TerminalFormatter
from pygments.lexers import YamlLexer

from .config import configure_templates, get_template


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
        help="Private key file for the Nginx Server (e.g. privkey.pem)",
    ),
    "ssl-cert-file": click.option(
        "-C",
        "--ssl-cert-file",
        default=None,
        help="SSL certificate file for the Nginx Server (e.g. fullchain.pem)",
    ),
    "tags": click.option("-t", "--tags", multiple=True, help="Ansible tags to run"),
    "password": click.option(
        "-p", "--password", help="SSH/sudo password for setup bootstrap", is_flag=True
    ),
    "verbose": click.option("-v", "--verbose", count=True, default=0),
    "managers": click.option(
        "-m",
        "--manager",
        "managers",
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
    "templates": click.option(
        "-t",
        "--template-source",
        default=None,
        required=True,
        help="Source of templates (can be a URL, local .tar.gz, or uncompressed local directory",
    ),
}


def run_ansible(
    playbook,
    extra_vars_file,
    inventory,
    verbose,
    more_extra_vars=None,
    subprocess_kwargs=None,
):
    """
    Call the ansible-playbook binary, passing in a generated inventory and
    extra variables to set
    """
    with tempfile.NamedTemporaryFile() as temp:
        temp.write(yaml.safe_dump(inventory).encode("utf-8"))
        temp.flush()
        playbook = os.path.join(os.path.dirname(__file__), "ansible", playbook)

        env = os.environ.copy()
        env["ANSIBLE_STDOUT_CALLBACK"] = env.get("ANSIBLE_STDOUT_CALLBACK", "debug")

        command = f"{os.path.dirname(sys.executable)}/ansible-playbook --inventory {temp.name} {playbook}"
        command = [
            f"{os.path.dirname(sys.executable)}/ansible-playbook",
            "--inventory",
            temp.name,
            playbook,
        ]

        if more_extra_vars:
            for string in more_extra_vars:
                command.append("--extra-vars")
                command.append(string)
        if extra_vars_file:
            command.append("--extra-vars")
            command.append(f"@{extra_vars_file}")

        if verbose > 0:
            command.append(f"-{'v' * verbose}")
        if not subprocess_kwargs:
            subprocess_kwargs = {}
        subprocess.check_call(command, env=env, **subprocess_kwargs)


def generate_inventory(managers, workers):
    managers = {
        manager: {"node_name": f"manager-{index}"}
        for index, manager in enumerate(managers)
    }
    workers = {
        worker: {"node_name": f"worker-{index}"} for index, worker in enumerate(workers)
    }
    inventory = {
        "all": {
            "children": {
                "kube_cluster": {
                    "children": {
                        "master": {"hosts": managers},
                        "node": {"hosts": workers},
                    }
                }
            }
        }
    }

    return inventory


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
@add_common_options("config-file", "tags", "password", "verbose", "managers", "workers")
@click.pass_context
def install(ctx, config_file, tags, verbose, password, workers, managers):
    """Bootstrap a Kubernetes cluster"""
    variables = get_variables(config_file, managers, verbose)

    with tempfile.NamedTemporaryFile(delete=False) as temp_file:
        temp_file.write(yaml.dump(variables).encode("utf-8"))
        temp_file.flush()
        run_ansible(
            "install.yml",
            temp_file.name,
            generate_inventory(managers, workers),
            verbose=verbose,
        )


@cli.command()
@add_common_options("config-file", "tags", "password", "managers", "workers", "verbose")
@click.pass_context
def uninstall(ctx, config_file, verbose, tags, password, managers, workers):
    """
    Remove a Kubernetes cluster and associated packages
    """
    run_ansible(
        "uninstall.yml",
        config_file,
        generate_inventory(managers, workers),
        verbose=verbose,
    )


def get_variables(user_config_file, managers, verbose):
    """
    This takes a user's config yaml file and runs it through ansible for a set
    of hosts, which runs its templating (with information about the hosts
    available)
    """
    default_variables_file = os.path.join(
        os.path.dirname(__file__), "ansible", "group_vars", "all"
    )

    with open(default_variables_file, "r") as defaults:
        variables = yaml.safe_load(defaults)

    if user_config_file:
        with open(user_config_file, "r") as user:
            variables.update(yaml.safe_load(user))
    names = variables.keys()

    with tempfile.NamedTemporaryFile() as src, tempfile.NamedTemporaryFile() as dest:
        templates = [f"{name}: {{{{ {name} }}}}" for name in names]
        templates = "\n".join(templates)
        src.write(templates.encode("utf-8"))
        src.flush()

        run_ansible(
            "template_variables.yml",
            user_config_file,
            generate_inventory(managers, workers=[]),
            verbose=verbose,
            more_extra_vars=[f"temp_src={src.name}", f"temp_dest={dest.name}"],
        )
        dest.flush()

        all_variables = yaml.safe_load(open(dest.name, "r"))

    if all_variables is None:
        raise RuntimeError("Could not get variables, check your config-file")

    return all_variables


def get_tar_files(source):
    tar = tarfile.open(fileobj=source, mode="r:gz")
    return {
        filename: tar.extractfile(filename).read().decode("utf-8")
        for filename in tar.getmembers()
    }


def read_or_make_certificates(ssl_key_file, ssl_cert_file):
    if (ssl_cert_file and not ssl_key_file) or (not ssl_cert_file and ssl_key_file):
        # Check that we have both a certificate and a key
        raise RuntimeError(
            "Either both 'ssl-cert-file' and 'ssl-key-file' "
            "should be provided, or neither. Instead got:\n\tssl-cert-file: "
            f"{ssl_cert_file}\n\tssl-key-file: {ssl_key_file}"
        )

    if ssl_key_file and ssl_cert_file:
        # Certs were provided, return them
        return open(ssl_key_file, "r").read(), open(ssl_cert_file, "r").read()

    # No certs provided, make them
    with tempfile.NamedTemporaryFile() as key, tempfile.NamedTemporaryFile() as cert:
        subject = " -subj /C=US/ST=Placeholder/L=Placeholder/O=Placeholder/OU=Placeholder/CN=Placeholder/emailAddress=Placeholder"
        generate_certs_command = f"openssl req -newkey rsa:2048 -nodes -keyout {key.name} -x509 -days 3650 -out {cert.name}"
        generate_certs_command += subject
        subprocess.run(generate_certs_command.split(" "), stdout=subprocess.PIPE)
        return open(key.name, "r").read(), open(cert.name, "r").read()


@cli.command()
@add_common_options(
    "config-file", "verbose", "managers", "ssl-cert-file", "ssl-key-file", "templates"
)
@click.pass_context
def configure(
    ctx, config_file, managers, verbose, template_source, ssl_key_file, ssl_cert_file
):
    """
    Generate Kubernetes manifests from a template source
    """
    key, cert = read_or_make_certificates(ssl_key_file, ssl_cert_file)

    if template_source.startswith("http"):
        with urllib.request.urlopen(template_source) as f:
            files_map = get_tar_files(io.BytesIO(f.read()))
    elif template_source.endswith(".tar.gz"):
        files_map = get_tar_files(open(template_source, "rb"))
    else:
        if not os.path.exists(template_source):
            raise RuntimeError(f"{template_source} directory not found")
        if template_source.startswith("/"):
            search_glob = f"{template_source}/**/*.yml"
        else:
            search_glob = f"**/{template_source}/**/*.yml"
        files = glob.glob(search_glob, recursive=True)
        files_map = {filename: open(filename, "r").read() for filename in files}

    if len(files_map) == 0:
        raise RuntimeError(f"No .yml files found to configure in {template_source}")

    variables = get_variables(config_file, managers, verbose)

    variables["ssl_cert_text"] = cert
    variables["ssl_key_text"] = key

    configure_templates(variables, files_map)


def template_and_run(ctx, command, **configure_kwargs):
    f = io.StringIO()
    with contextlib.redirect_stdout(f):
        ctx.invoke(configure, **configure_kwargs)
    k8s_manifest = f.getvalue().encode("utf-8")

    # Pick a manager node 0 arbitrarily
    command = f"ssh {configure_kwargs['managers'][0]} {command}".split(" ")
    subprocess.run(command, input=k8s_manifest, check=True)


@cli.command()
@add_common_options(
    "config-file", "verbose", "managers", "ssl-cert-file", "ssl-key-file", "templates"
)
@click.pass_context
def apply(ctx, **configure_kwargs):
    """
    Generate Kubernetes manifests from a template source and apply it on an SSH host
    """
    template_and_run(ctx, command="kubectl apply -f -", **configure_kwargs)


@cli.command()
@add_common_options(
    "config-file", "verbose", "managers", "ssl-cert-file", "ssl-key-file", "templates"
)
@click.pass_context
def clear(ctx, **configure_kwargs):
    """
    Remove Kubernetes configuration without tearing down the cluster
    """
    template_and_run(ctx, command="kubectl delete -f -", **configure_kwargs)


def quoted_presenter(dumper, data):
    data = data.replace('"', "")
    data = data.replace("'", "")
    return dumper.represent_scalar("tag:yaml.org,2002:str", data, style='"')


@cli.command()
@click.option(
    "--options",
    default="minimal",
    help="Level of detail for options: 'minimal' (default) or 'all'",
)
@click.pass_context
def show_defaults(ctx, options):
    """
    Generate full YAML description of configurable options
    """
    minimal_file = minimal_group_vars_file = os.path.join(
        os.path.dirname(__file__), "ansible", "group_vars", "minimal"
    )

    with open(minimal_file, "r") as f:
        content = f.read()

    if options == "all":
        all_file = os.path.join(
            os.path.dirname(__file__), "ansible", "group_vars", "all"
        )

        with open(all_file, "r") as f:
            content += "\n" + f.read()

    yaml.add_representer(str, quoted_presenter)
    click.echo(highlight(content, YamlLexer(), TerminalFormatter()))

    if content is None:
        click.echo("error: cannot read defaults", err=True)
        ctx.exit(2)


if __name__ == "__main__":
    cli()
