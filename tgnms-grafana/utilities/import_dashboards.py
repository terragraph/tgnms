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

    VIEW = 1
    EDIT = 2
    ADMIN = 4

    grafanaurl = genUrl(ipaddr_grafana, port_grafana)

    logging.info("\nStarting import dashboards")

    # don't let people modify imported dashboards
    rdonlypermissions = {
        "items": [
            {"role": "Viewer", "permission": VIEW},
            {"role": "Editor", "permission": VIEW},
        ]
    }
    rwpermissions = {
        "items": [
            {"role": "Viewer", "permission": VIEW},
            {"role": "Editor", "permission": EDIT},
        ]
    }
    import_uid = "ipPjWFU9lsYA"  # made up id
    template_uid = "tpPjWFU9lsYA"  # made up id

    # assume dashboards directory exists
    dirname = "utilities/dashboards"
    directory = os.fsencode(dirname)

    for file in os.listdir(directory):
        with open(dirname + "/" + file.decode()) as f:
            dashboard = f.read()
        # if the name of the file constains template, make it r/w
        if "template" in file.decode():
            folder_uid = template_uid
            folder_permissions = rwpermissions
            folder_title = "Template"
        else:
            folder_uid = import_uid
            folder_permissions = rdonlypermissions
            folder_title = "Imported"
        try:
            parsed_db = json.loads(dashboard)
            if "dashboard" not in parsed_db or "id" not in parsed_db["dashboard"]:
                logging.error(
                    "Mandatory fields dashboard, or dashboard:id missing from json"
                )
                return
            logging.info(
                "Replacing dashboard id {} with {}".format(
                    parsed_db["dashboard"]["id"], "null"
                )
            )
            parsed_db["dashboard"]["id"] = "null"
            parsed_db["overwrite"] = True
        except Exception:
            logging.error("Unable to parse {}".format(dashboard))
            return

        # now write to Grafana
        try:
            if "title" not in parsed_db["dashboard"]:
                logging.error("Mandatory field dashboard:title missing from json")
                return
            logging.info(
                "Importing dashboard {} to Grafana".format(
                    parsed_db["dashboard"]["title"]
                )
            )

            # check if folder already exists
            dsurl = grafanaurl + "/api/folders/" + folder_uid
            r = requests.get(dsurl, auth=(auth_user, auth_passwd))
            if r.status_code == 404:
                logging.info("Folder '{}' does not already exist".format(folder_title))
                # create folder
                dsurl = grafanaurl + "/api/folders"
                folder_description = {"title": folder_title, "uid": folder_uid}
                logging.info("Creating folder '{}'".format(folder_title))
                r = requests.post(
                    dsurl, json=folder_description, auth=(auth_user, auth_passwd)
                )
            elif r.status_code != 200:
                logging.error(
                    "Error getting folder status from Grafana {}".format(r.json())
                )

            parsed_response = r.json()
            logging.debug(parsed_response)
            if "id" in parsed_response:
                folder_id = parsed_response["id"]
            else:
                folder_id = 0
                logging.error("'id' is not in the Grafana response")
            parsed_db["folderId"] = folder_id

            # change the folder permissions
            dsurl = grafanaurl + "/api/folders/" + folder_uid + "/permissions"
            logging.info("Updating permissions for folder {}".format(dsurl))
            r = requests.post(
                dsurl, json=folder_permissions, auth=(auth_user, auth_passwd)
            )
            logging.debug(r.json())

            dsurl = grafanaurl + "/api/dashboards/db"
            logging.info("Importing dashboard")
            r = requests.post(dsurl, json=parsed_db, auth=(auth_user, auth_passwd))
            logging.debug(r.json())
        except requests.exceptions.RequestException as e:
            logging.error("Error in put: {}".format(e))
            return
        if r.status_code == 200:
            logging.info("success returned from Grafana")
        else:
            logging.error(
                "Problem writing dashboard, status code {}".format(str(r.status_code))
            )
