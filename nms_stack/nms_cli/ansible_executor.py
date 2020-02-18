#!/usr/bin/env python3
# Copyright (c) 2014-present, Facebook, Inc.

import click
import os
import pkg_resources
import sys
from collections import namedtuple

from ansible.parsing.dataloader import DataLoader
from ansible.vars.hostvars import HostVars
from ansible.vars.manager import VariableManager
from ansible.inventory.host import Host
from ansible.inventory.manager import InventoryManager
from ansible.executor.playbook_executor import PlaybookExecutor
from ansible.release import __version__
from ansible.utils.display import Display
from ansible.utils.vars import load_options_vars

try:
    HAS_ANSIBLE28 = True
    from ansible import context
    from ansible.module_utils.common.collections import ImmutableDict
except ImportError:
    HAS_ANSIBLE28 = False

display = Display()


class ansible_executor:
    def __init__(self, run_tags, verbose):
        display.verbosity = verbose
        self.loader = DataLoader()
        self.inventory_file = os.path.join("nms_stack", "inventory")
        self.group_vars_all = os.path.join("nms_stack", "group_vars", "all")
        self.load_inventory()
        self.ssl_certs = None
        self.uninstall_opts = None
        Options = namedtuple(
            "Options",
            [
                "listtags",
                "listtasks",
                "listhosts",
                "syntax",
                "connection",
                "module_path",
                "forks",
                "remote_user",
                "private_key_file",
                "ssh_common_args",
                "ssh_extra_args",
                "sftp_extra_args",
                "scp_extra_args",
                "become",
                "become_method",
                "become_user",
                "verbosity",
                "check",
                "diff",
                "tags",
                "start_at_task",
            ],
        )
        self.options = Options(
            listtags=False,
            listtasks=False,
            listhosts=False,
            syntax=False,
            connection="ssh",
            module_path=None,
            forks=100,
            remote_user=None,
            private_key_file=None,
            ssh_common_args=None,
            ssh_extra_args=None,
            sftp_extra_args=None,
            scp_extra_args=None,
            become=False,
            become_method=None,
            become_user="root",
            verbosity=verbose,
            check=False,
            diff=False,
            tags=run_tags,
            start_at_task=None,
        )

    def get_defaults_file(self):
        return pkg_resources.resource_filename("nms_cli", self.group_vars_all)

    def load_inventory(self):
        self.inventory = InventoryManager(
            loader=self.loader,
            sources=pkg_resources.resource_filename("nms_cli", self.inventory_file),
        )

    def ssl_cert_files(self, key_file, cert_file):
        self.ssl_certs = {"ssl_key_file": key_file, "ssl_cert_file": cert_file}

    def uninstall_options(
        self,
        skip_backup,
        delete_data,
        backup_file,
        remove_docker,
        remove_gluster,
        force,
    ):
        self.uninstall_opts = {
            "skip_backup": skip_backup,
            "delete_data": delete_data,
            "backup_file": backup_file,
            "remove_docker": remove_docker,
            "remove_gluster": remove_gluster,
            "force": force,
        }

    # TODO: Split up to make less "complex"
    def run(  # noqa: C901
        self, hosts, playbook, config_file=None, generated_config=None, password=None
    ):
        if HAS_ANSIBLE28:
            variable_manager = VariableManager(
                loader=self.loader,
                inventory=self.inventory,
                version_info=self.version_info(),
            )
        else:
            variable_manager = VariableManager(
                loader=self.loader, inventory=self.inventory
            )

        for hostname, hostgroups, hostport in hosts:
            # Add hosts to all the groups they belong to
            for hostgroup in hostgroups:
                self.inventory.add_host(hostname, group=hostgroup, port=hostport)
            self.inventory.add_host(hostname, group="all")
            host = Host(name=hostname)

            # localhost can talk to itself ;-)
            if hostname == "localhost" or hostname == "::1":
                variable_manager.set_host_variable(host, "ansible_connection", "local")

            if self.ssl_certs is not None:
                for s in self.ssl_certs:
                    variable_manager.set_host_variable(host, s, self.ssl_certs[s])

            if self.uninstall_opts is not None:
                for s in self.uninstall_opts:
                    variable_manager.set_host_variable(host, s, self.uninstall_opts[s])

            if config_file:
                variable_manager.set_host_variable(
                    host, "install_config_file", os.path.abspath(config_file)
                )

            if not HAS_ANSIBLE28:
                variable_manager.options_vars = load_options_vars(
                    self.options, self.version_info()
                )

        # Necessary to link these variables together
        HostVars(self.inventory, variable_manager, self.loader)

        # Load Config Overrides
        extra_vars = {}
        if config_file:
            extra_vars = self.loader.load_from_file(config_file)

        # Override config_file extra_vars if needed
        if generated_config:
            # Shallow merge, keys from generated_config take precendence
            extra_vars = {**extra_vars, **generated_config}

        playbook_path = pkg_resources.resource_filename(
            "nms_cli", os.path.join("nms_stack", playbook)
        )

        if not os.path.exists(playbook_path):
            click.echo(f"[INFO] The playbook {playbook_path} does not exist")
            sys.exit()

        passwords = {}
        if password:
            passwords = {"conn_pass": password, "become_pass": password}

        playbook_executor_args = dict(
            playbooks=[playbook_path],
            inventory=self.inventory,
            variable_manager=variable_manager,
            loader=self.loader,
            passwords=passwords,
        )

        if HAS_ANSIBLE28:
            # Set extra_vars in ansible
            self.options = self.options._asdict()
            self.options.update({"extra_vars": extra_vars})
            context.CLIARGS = ImmutableDict(self.options)
        else:
            # Set extra_vars in ansible
            variable_manager.extra_vars = extra_vars
            playbook_executor_args.update(dict(options=self.options))

        pbex = PlaybookExecutor(**playbook_executor_args)

        # Assigned variable used for development
        results = pbex.run()
        if display.verbose:
            click.echo(results)

    def version_info(self):
        """ return full ansible version info """
        ansible_version_string = __version__
        ansible_version = ansible_version_string.split()[0]
        ansible_versions = ansible_version.split(".")
        for counter in range(len(ansible_versions)):
            if ansible_versions[counter] == "":
                ansible_versions[counter] = 0
            try:
                ansible_versions[counter] = int(ansible_versions[counter])
            except Exception:
                pass
        if len(ansible_versions) < 3:
            for _counter in range(len(ansible_versions), 3):
                ansible_versions.append(0)
        return {
            "string": ansible_version_string.strip(),
            "full": ansible_version,
            "major": ansible_versions[0],
            "minor": ansible_versions[1],
            "revision": ansible_versions[2],
        }
