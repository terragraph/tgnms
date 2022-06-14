#!/usr/bin/env python3
# Copyright (c) 2014-present, Facebook, Inc.

import glob
import io
import os
import subprocess
import sys
import tarfile
import tempfile
import urllib.request
from functools import wraps

import click
import pkg_resources
import yaml
from nms_cli.k8s_nms import rage
from nms_cli.k8s_nms.config import configure_templates
from pygments import highlight
from pygments.formatters import TerminalFormatter
from pygments.lexers import YamlLexer


RAGE_DIR = os.path.join(os.path.expanduser("~"), ".k8s_nms_logs")
DEFAULT_MANIFESTS_DIR = os.path.join(os.path.dirname(__file__), "manifests")
DEFAULT_CHARTS_YML = os.path.join(os.path.dirname(__file__), "charts.yml")

common_options = {
    "config-file": click.option(
        "-f", "--config-file", default=None, help="YAML file to load as variable set"
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
        default=DEFAULT_MANIFESTS_DIR,
        required=False,
        help="Source of templates (can be a URL, local .tar.gz, or uncompressed local directory",
    ),
    "charts": click.option(
        "-c",
        "--charts",
        default=DEFAULT_CHARTS_YML,
        required=False,
        help="YAML file of Helm charts to install",
    ),
    "skip_charts": click.option(
        "--skip-charts",
        is_flag=True,
        default=False,
        help="Skip installation of Helm charts",
    ),
}


def run_ansible(
    playbook,
    extra_vars_file,
    inventory,
    verbose,
    more_extra_vars=None,
    subprocess_kwargs=None,
    tags=None,
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

        if rage._context is not None and rage._context["is_atty"]:
            # Ansible is running with its stdout passed to Python, so turn on
            # colors manually if necessary
            env["ANSIBLE_FORCE_COLOR"] = "true"

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
        if tags:
            for tag in tags:
                command.append("-t")
                command.append(tag)

        if verbose > 0:
            command.append(f"-{'v' * verbose}")
        if not subprocess_kwargs:
            subprocess_kwargs = {}
        rage.run_subprocess_command(command, env=env, **subprocess_kwargs)


def generate_inventory(managers, workers):
    managers = sorted(managers)
    workers = sorted(workers)
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


def use_config_values_if_no_overrides(fn):
    """Use values found in the config file if overrides aren't set.

    Certain CLI fields have an analogous field in the config file. Users
    may set these fields in either place with priority for CLI over config.
    Ex.
        --manager overrides the `managers` field in config.
        --worker => `workers`
    """
    @wraps(fn)
    def wrapper(*args, **kwargs):
        if kwargs['config_file']:
            with open(kwargs['config_file'], "r") as user:
                config_values = yaml.safe_load(user)

            # If overrides aren't made, fallback to values in config file.
            if not kwargs.get('managers', True):  # If key doesn't exist, then field isn't an argument to fn.
                kwargs['managers'] = [manager['hostname'] for manager in (config_values['managers'] or [])]
            if not kwargs.get('workers', True):
                kwargs['workers'] = [worker['hostname'] for worker in (config_values['workers'] or [])]
            if not kwargs.get('ssl_key_file', True):
                kwargs['ssl_key_file'] = config_values['ssl_key_file']
            if not kwargs.get('ssl_cert_file', True):
                kwargs['ssl_cert_file'] = config_values['ssl_cert_file']

        # Validate input.
        if not any(kwargs.get('managers', [True])):
            raise RuntimeError(
                "Manager host is required. Please define in the `managers` section of your "
                "config.yml or via the --manager flag."
            )
        return fn(*args, **kwargs)

    return wrapper


CONTEXT_SETTINGS = {"help_option_names": ["-h", "--help"]}


@click.group(invoke_without_command=True, context_settings=CONTEXT_SETTINGS)
@click.option("--version", is_flag=True, default=False, help="Show version")
@click.pass_context
def cli(ctx, version):
    """
    CLI utility to install Terragraph NMS stack. See usage instructions at
    <insert URL here>.

    A typical usage will involve starting up a Kubernetes cluster via the
    'install' command, and then applying the manifests for NMS via the 'apply'
    command.
    """
    if version:
        try:
            version = pkg_resources.get_distribution("k8s_nms").version
        except Exception as e:
            click.echo("Cannot find package version, is this in a package?")
            click.echo(f"{e}")
            version = "[unknown]"

        click.echo(f"Terragraph NMS cli utility version: {version}")
        ctx.exit()

    if ctx.invoked_subcommand is None:
        click.echo(ctx.get_help())
        ctx.exit(1)


@cli.command()
@use_config_values_if_no_overrides
@add_common_options("config-file", "tags", "password", "verbose", "managers", "workers")
@click.pass_context
@rage.log_command(RAGE_DIR)
def install(ctx, config_file, tags, verbose, password, workers, managers):
    """
    Start up a bare Kubernetes cluster on the provided set of hosts.
    """
    variables = get_variables(config_file, managers, workers, verbose)

    with tempfile.NamedTemporaryFile() as temp_file:
        variables["config_file_path"] = temp_file.name
        temp_file.write(yaml.dump(variables).encode("utf-8"))
        temp_file.flush()
        run_ansible(
            "install.yml",
            temp_file.name,
            generate_inventory(managers, workers),
            verbose=verbose,
            tags=tags,
        )


@cli.command()
@use_config_values_if_no_overrides
@add_common_options("config-file", "tags", "password", "managers", "workers", "verbose")
@click.option(
    "--purge",
    is_flag=True,
    default=False,
    help="Remove all data related to the install",
)
@click.pass_context
@rage.log_command(RAGE_DIR)
def uninstall(ctx, config_file, verbose, tags, password, managers, workers, purge):
    """
    Remove a Kubernetes cluster and associated packages
    """
    variables = get_variables(config_file, managers, workers, verbose)

    variables["purge"] = purge

    with tempfile.NamedTemporaryFile() as temp_file:
        variables["config_file_path"] = temp_file.name
        temp_file.write(yaml.dump(variables).encode("utf-8"))
        temp_file.flush()
        run_ansible(
            "uninstall.yml",
            temp_file.name,
            generate_inventory(managers, workers),
            verbose=verbose,
            tags=tags,
        )


@cli.command()
@use_config_values_if_no_overrides
@add_common_options("config-file", "managers")
@click.pass_context
@rage.log_command(RAGE_DIR)
def dashboard_token(ctx, managers, **_):
    """
    Get a login token for the dashboard at <nms hostname or ip>/kubernetes/
    """
    cmd = "kubectl -n kube-system describe secret $(kubectl -n kube-system get secret | awk '/^deployment-controller-token-/{print $1}') | awk '$1==\"token:\"{print $2}'"
    subprocess.run(["ssh", managers[0], cmd])


def get_controllers_list(variables):
    """
    This takes in an existing 'controllers_list' variable from a config file
    and fills in any missing port numbers
    """
    controllers_list = variables.get("controllers_list", [])
    ports = {
        "ctrlr_port": 7007,
        "agg_port": 8007,
        "app_port": 17077,
        "bt_seeder_port": 6881,
    }
    used_ports = set()

    def use_or_generate(controller, key):
        """
        Use either the existing value for 'key' in 'controller' or generate and
        set a new value for 'key'
        """
        nonlocal ports
        if key in controller:
            # Port is already set, don't do anything other than mark that port
            # as used
            used_ports.add(controller[key])
            return

        # Grab the next generated port
        generated_port = ports[key]

        while generated_port in used_ports:
            # In case the generated port conflicts with a user defined port,
            # keep incrementing
            generated_port += 1

        controller[key] = generated_port
        ports[key] = generated_port + 1

    for controller in controllers_list:
        use_or_generate(controller, "ctrlr_port")
        use_or_generate(controller, "agg_port")
        use_or_generate(controller, "app_port")
        use_or_generate(controller, "bt_seeder_port")

    return controllers_list


def get_variables(user_config_file, managers, workers, verbose):
    """
    This takes a user's config yaml file and runs it through ansible for a set
    of hosts, which runs its templating (with information about the hosts
    available)
    """

    default_variables_file = os.path.join(
        os.path.dirname(__file__), "ansible", "group_vars", "all.yml"
    )

    restricted_variables_file = os.path.join(
        os.path.dirname(__file__), "ansible", "group_vars", "restricted.yml"
    )

    pw_variables_file = os.path.join(
        os.path.dirname(__file__), "ansible", "group_vars", "passwords.yml"
    )

    # These represent all the variables that we want to run through template_variables
    # and later saved into `all_variables`.
    with open(default_variables_file, "r") as defaults, open(restricted_variables_file, "r") as restricted:
        variables = yaml.safe_load(defaults)
        variables.update(yaml.safe_load(restricted))

    if user_config_file:
        with open(user_config_file, "r") as user:
            variables.update(yaml.safe_load(user))

    names = variables.keys()

    with tempfile.NamedTemporaryFile() as src, tempfile.NamedTemporaryFile() as dest, tempfile.NamedTemporaryFile() as pwdest:
        # Gather all the variables we need defined. These variables will be partly
        # filled in by:
        #   1) the user_config_file passed in
        #   2) the facts defined in the `template_variables.yml` ansible script
        #   3) the all.yml variables, this is used implicitely by ansible
        # See the `Generated templated variables` task inside script.
        templates = [f"{name}: {{{{ {name} }}}}" for name in names]
        templates = "\n".join(templates)
        src.write(templates.encode("utf-8"))
        src.flush()

        run_ansible(
            "template_variables.yml",
            user_config_file,
            generate_inventory(managers, workers),
            verbose=verbose,
            more_extra_vars=[
                f"temp_src={src.name}",
                f"temp_dest={dest.name}",
                f"pw_temp_src={pw_variables_file}",
                f"pw_temp_dest={pwdest.name}",
            ],
            subprocess_kwargs={"redirect_to_stderr": True},
        )
        dest.flush()

        rage.log("Full config\n" + open(dest.name, "r").read())

        # This will be None if passwords were specified in config.yml
        passwords = yaml.safe_load(open(pwdest.name, "r"))

        all_variables = yaml.safe_load(open(dest.name, "r"))

        if passwords is not None:
            all_variables.update(passwords)

    all_variables["controllers_list"] = get_controllers_list(all_variables)
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
        rage.run_subprocess_command(
            generate_certs_command.split(" "), redirect_to_stderr=True
        )
        return open(key.name, "r").read(), open(cert.name, "r").read()


@cli.command()
@use_config_values_if_no_overrides
@add_common_options(
    "config-file", "managers", "workers",
)
@click.pass_context
@rage.log_command(RAGE_DIR)
def verify(ctx, managers, workers, **_):
    """
    Run a series of checks on an existing NMS installation to ensure that it is
    up and running.
    """
    if len(workers) == 0:
        remote = managers[0]
    else:
        if len(workers) < 2:
            raise RuntimeError(
                "Expected either a single node or a cluster of 3 nodes (1 manager, 2 workers)"
            )
        remote = workers[1]

    remote = remote.split("@")[-1]

    import requests

    if ":" in remote:
        remote = f"[{remote}]"

    requests.get(remote)
    print(remote)


@cli.command()
@use_config_values_if_no_overrides
@add_common_options(
    "config-file",
    "verbose",
    "managers",
    "workers",
    "ssl-cert-file",
    "ssl-key-file",
    "templates",
)
@click.pass_context
@rage.log_command(RAGE_DIR)
def configure(ctx, **kwargs):
    """
    Generate Kubernetes manifests from a template source. This command is only
    useful to view the manifests with your configuration applied. To send the
    manifests to a cluster, see the 'apply' command.
    """
    manifests, _ = configure_impl(**kwargs)
    print(manifests)


def configure_impl(
    config_file,
    managers,
    workers,
    verbose,
    template_source,
    ssl_key_file,
    ssl_cert_file,
):
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

        # Skip the 'not_templated' folder entirely and grafana config files
        skips = ["grafana/provisioning", "grafana/dashboards", "chihaya/chihaya.yml"]
        for skip in skips:
            files = list(filter(lambda name: skip not in name, files))

        files_map = {filename: open(filename, "r").read() for filename in files}

    if len(files_map) == 0:
        raise RuntimeError(f"No .yml files found to configure in {template_source}")

    variables = get_variables(config_file, managers, workers, verbose)

    variables["ssl_cert_text"] = cert
    variables["ssl_key_text"] = key

    return configure_templates(variables, files_map), variables


def template_and_run(ctx, command, check, **configure_kwargs):
    manifests, variables = configure_impl(**configure_kwargs)

    # Pick a manager node 0 arbitrarily
    command = f"ssh {configure_kwargs['managers'][0]} {command}".split(" ")
    subprocess.run(command, input=manifests.encode("utf-8"), check=check)
    return variables


@cli.command()
@use_config_values_if_no_overrides
@add_common_options(
    "config-file",
    "verbose",
    "managers",
    "workers",
    "ssl-cert-file",
    "ssl-key-file",
    "templates",
    "charts",
    "skip_charts",
)
@click.pass_context
@rage.log_command(RAGE_DIR)
def apply(ctx, charts, skip_charts, **configure_kwargs):
    """
    Generate Kubernetes manifests from a template source and apply it on a
    cluster via the control plane node.
    """
    # Template out everything in manifests/ and 'kubectl apply -f' it
    variables = template_and_run(
        ctx, command="kubectl apply -f -", check=True, **configure_kwargs
    )

    if skip_charts:
        return

    # Install Helm charts
    with open(charts, "r") as f:
        chart_info = yaml.safe_load(f)

    variables["helm_charts"] = chart_info
    variables["helm_values_path"] = os.path.join(os.getcwd(), os.path.dirname(charts))

    with tempfile.NamedTemporaryFile() as temp_file:
        temp_file.write(yaml.dump(variables).encode("utf-8"))
        temp_file.flush()
        run_ansible(
            "install_charts.yml",
            temp_file.name,
            generate_inventory(
                configure_kwargs["managers"], configure_kwargs["workers"]
            ),
            verbose=configure_kwargs["verbose"],
        )


@cli.command()
@use_config_values_if_no_overrides
@add_common_options(
    "config-file",
    "verbose",
    "managers",
    "workers",
    "ssl-cert-file",
    "ssl-key-file",
    "templates",
    "charts",
    "skip_charts",
)
@click.pass_context
@rage.log_command(RAGE_DIR)
def clear(ctx, charts, skip_charts, **configure_kwargs):
    """
    Remove Kubernetes configuration without tearing down the cluster
    """
    # Template out everything in manifests/ and 'kubectl delete -f' it
    variables = template_and_run(
        ctx, command="kubectl delete --wait=false -f -", check=False, **configure_kwargs
    )

    # Install Helm charts from manifests/charts.yml
    if skip_charts:
        return

    # Install Helm charts
    with open(charts, "r") as f:
        chart_info = yaml.safe_load(f)

    variables["helm_charts"] = chart_info
    variables["helm_values_path"] = os.path.join(os.getcwd(), os.path.dirname(charts))

    with tempfile.NamedTemporaryFile() as temp_file:
        temp_file.write(yaml.dump(variables).encode("utf-8"))
        temp_file.flush()
        run_ansible(
            "uninstall_charts.yml",
            temp_file.name,
            generate_inventory(
                configure_kwargs["managers"], configure_kwargs["workers"]
            ),
            verbose=configure_kwargs["verbose"],
        )


def quoted_presenter(dumper, data):
    data = data.replace('"', "")
    data = data.replace("'", "")
    return dumper.represent_scalar("tag:yaml.org,2002:str", data, style='"')


@cli.command()
@click.pass_context
@click.option("--full", is_flag=True, help="Generate all configurable options")
def show_config(ctx, full):
    """
    Generate YAML description of configurable options; by default this will
    contain ONLY the most critical fields to get started. To save, redirect
    output to a file (`show-config > config.yml`).
    """
    all_file = os.path.join(
        os.path.dirname(__file__), "ansible", "group_vars", "all.yml"
    )

    with open(all_file, "r") as f:
        content = f.read()

    if not full:
        # Get only the critical stuff.
        content = content.partition((
            "# +--------------------------------------------------------+\n"
            "# |           NMS Other Configuration Options              |\n"
            "# +--------------------------------------------------------+\n"
        ))[0]

    yaml.add_representer(str, quoted_presenter)
    click.echo(highlight(content, YamlLexer(), TerminalFormatter()))

    if content is None:
        click.echo("error: cannot read defaults", err=True)
        ctx.exit(2)


@cli.command(name="rage")
@click.pass_context
@click.option("--clean", is_flag=True, help="Remove all rage files")
@click.option(
    "--number",
    required=False,
    help="Number of most recent log files to include",
    default=1,
    type=int,
)
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
        if len(files) == 0:
            click.echo(f"No log files found in {RAGE_DIR}")
            return

        for filename in files:
            click.echo(filename)
            with open(filename, "r") as f:
                click.echo(f.read())


if __name__ == "__main__":
    cli()
