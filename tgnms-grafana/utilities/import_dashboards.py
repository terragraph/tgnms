#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

""" This utility script reads dashboards from the dashboards directory and
    imports them to Grafana with view-only permission
"""

import json
import logging
import os

import requests

from .common import genUrl


def import_dashboards(cli_opts):
    ipaddr_grafana = cli_opts.grafana_ip
    port_grafana = cli_opts.grafana_port
    auth_user = cli_opts.auth_user
    auth_passwd = cli_opts.auth_passwd

    grafanaurl = genUrl(ipaddr_grafana, port_grafana)

    logging.info("\nStarting import dashboards")

    # assume dashboards directory exists
    dirname = "utilities/dashboards"
    directory = os.fsencode(dirname)

    for file in os.listdir(directory):
        with open(dirname + "/" + file.decode()) as f:
            dashboard_file = f.read()

        try:
            parsed_db = json.loads(dashboard_file)
            # Grafana wants new dashboards to have uid=id=null
            parsed_db["uid"] = "null"
            parsed_db["id"] = "null"
            parsed_db["version"] = 0
        except Exception:
            logging.error("Unable to parse {}".format(dashboard_file))
            return

        dashboard_json = {}
        dashboard_json["dashboard"] = parsed_db
        dashboard_json["folderId"] = 0  # user general folder

        # if dashboard already exists, do not overwrite
        dashboard_json["overwrite"] = False

        # now write to Grafana
        ttl = dashboard_json["dashboard"].get("title", "no title found")
        logging.info("Importing dashboard '{}' to Grafana".format(ttl))

        dsurl = grafanaurl + "/api/dashboards/db"
        logging.info("Importing dashboard")
        try:
            r = requests.post(dsurl, json=dashboard_json, auth=(auth_user, auth_passwd))
            logging.debug(r.json())
        except requests.exceptions.RequestException as e:
            logging.error("Error in put: {}".format(e))
            return

        if r.status_code == 200:
            logging.info("success returned from Grafana")
        elif r.status_code == 412:
            logging.info("Grafana returned Precondition Failed (normally not an error)")
        else:
            logging.error(
                "Problem writing dashboard, status code {}".format(str(r.status_code))
            )
