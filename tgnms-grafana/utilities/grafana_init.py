#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

""" Top level for initializing Grafana
"""

import locale
import logging

import click

from . import add_users as au, import_dashboards as id, import_data_sources as ids


#
# Set encoding to UTF-8 for all modules as it is needed for click in python3
#
def getpreferredencoding(do_setlocale=True):
    return "utf-8"


locale.getpreferredencoding = getpreferredencoding


class AddUsers:
    @click.command()
    @click.pass_obj
    def add_users(cli_opts):
        au.add_users(cli_opts)


class ImportDashboards:
    @click.command()
    @click.pass_obj
    def import_dashboards(cli_opts):
        id.import_dashboards(cli_opts)


class ImportDataSources:
    @click.command()
    @click.option(
        "--ds_ip", default="::1", type=str, help="Data Source IP (default=::1)"
    )
    @click.option(
        "--ds_port", default=8086, type=int, help="Data Source Port (default=8086)"
    )
    @click.option(
        "--ds_file",
        default="beringei_data_source.json",
        type=str,
        help="Data Source JSON File Name (default='beringei_data_source.json')",
    )
    @click.option(
        "--deleteall", is_flag=True, default=False, help="Delete all data sources"
    )
    @click.option(
        "--ds_user",
        default="",
        type=str,
        help="Data Source User Name (MySQL only) (default='')",
    )
    @click.option("--ds_passwd", type=str, help="Data Source Password (MySQL only)")
    @click.pass_obj
    def import_data_sources(
        cli_opts, ds_ip, ds_port, ds_file, deleteall, ds_user, ds_passwd
    ):
        ids.import_data_sources(
            cli_opts, ds_ip, ds_port, ds_file, deleteall, ds_user, ds_passwd
        )


class CliOptions:
    """ Object for holding CLI state information """

    def __init__(self, debug, grafana_ip, grafana_port, auth_user, auth_passwd):
        self.debug = debug
        self.grafana_ip = grafana_ip
        self.grafana_port = grafana_port
        self.auth_user = auth_user
        self.auth_passwd = auth_passwd


# -- dashboard_cli Command Group -- #
@click.group()
@click.option("-d", "--debug", is_flag=True, help="Turn on debug logging")
@click.option(
    "--grafana_ip", "-c", default="[::1]", type=str, help="Grafana IP (default=[::1])"
)
@click.option(
    "--grafana_port", "-p", default=3000, type=int, help="Grafana port (default=3000)"
)
@click.option(
    "--auth_user",
    "-u",
    type=str,
    default="admin",
    help="Grafana user name (default admin)",
)
@click.option(
    "--auth_passwd", "-w", default="password", type=str, help="Grafana admin password"
)
@click.pass_context
def dashboard_cli(ctx, grafana_ip, grafana_port, auth_user, auth_passwd, debug):
    """ CLI to talk to Grafana API """
    log_level = logging.DEBUG if debug else logging.INFO
    logging.basicConfig(
        format="[%(asctime)s] %(levelname)s: %(message)s (%(filename)s:%(lineno)d)",
        level=log_level,
    )
    ctx.obj = CliOptions(debug, grafana_ip, grafana_port, auth_user, auth_passwd)


def cli():
    dashboard_cli.add_command(AddUsers().add_users)
    dashboard_cli.add_command(ImportDashboards().import_dashboards)
    dashboard_cli.add_command(ImportDataSources().import_data_sources)
    dashboard_cli()


if __name__ == "__main__":
    cli()
