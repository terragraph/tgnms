#!/usr/bin/env python3
# Copyright (c) 2014-present, Facebook, Inc.

import os
import sys
from collections import namedtuple

import click
import pkg_resources
from ansible import context
from ansible.executor.playbook_executor import PlaybookExecutor
from ansible.inventory.host import Host
from ansible.inventory.manager import InventoryManager
from ansible.module_utils.common.collections import ImmutableDict
from ansible.parsing.dataloader import DataLoader
from ansible.release import __version__
from ansible.utils.display import Display
from ansible.vars.manager import VariableManager


display = Display()


class ansible_executor:
    def __init__(self, run_tags, verbose):
        display.verbosity = verbose
        self.loader = DataLoader()
        self.inventory_file = os.path.join("nms_stack", "inventory")
        self.group_vars_all = os.path.join("nms_stack", "group_vars", "all")
        self.load_inventory()
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

    def run(  # noqa: C901
        self, hosts, playbook, config_file=None, generated_config=None, password=None
    ):
        extra_vars = {}
        if config_file:
            # record the absolute path to the config file
            extra_vars["install_config_file"] = os.path.abspath(config_file)

        if generated_config:
            extra_vars.update(generated_config)

        options = self.options._asdict()

        variable_manager = VariableManager(
            loader=self.loader,
            inventory=self.inventory,
            version_info=self.version_info(),
        )
        variable_manager._extra_vars = extra_vars

        for hostname, hostgroups, hostport, variables in hosts:
            # Add hosts to all the groups they belong to
            for hostgroup in hostgroups:
                self.inventory.add_host(hostname, group=hostgroup, port=hostport)
                for name, value in variables.items():
                    self.inventory._inventory.set_variable(hostname, name, value)
            self.inventory.add_host(hostname, group="all")
            host = Host(name=hostname)

            # localhost can talk to itself ;-)
            if hostname == "localhost" or hostname == "::1":
                variable_manager.set_host_variable(host, "ansible_connection", "local")

        # initialize context args
        context.CLIARGS = ImmutableDict(options)

        playbook_path = pkg_resources.resource_filename(
            "nms_cli", os.path.join("nms_stack", playbook)
        )

        if not os.path.exists(playbook_path):
            click.echo(f"[INFO] The playbook {playbook_path} does not exist")
            sys.exit()

        passwords = {}
        if password:
            passwords = {"conn_pass": password, "become_pass": password}

        play = PlaybookExecutor(
            playbooks=[playbook_path],
            inventory=self.inventory,
            variable_manager=variable_manager,
            loader=self.loader,
            passwords=passwords,
        )
        return play.run()

    def version_info(self):
        """return full ansible version info"""
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
