#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

""" This utility script reads data sources from the data_sources directory and
    saves them
    to Grafana (these are just pointers to the plugins)
    Optionally, you can delete data sources that are not in the data_sources
    directory Grafana stores the data sources in the MySQL DB
"""

import json
import logging
import os

import requests
from .common import genUrl


def import_data_sources(
    cli_opts,
    datasource_ip,
    datasource_port,
    datasource_file,
    deleteall,
    datasource_user,
    datasource_passwd,
):
    ipaddr_grafana = cli_opts.grafana_ip
    port_grafana = cli_opts.grafana_port
    auth_user = cli_opts.auth_user
    auth_passwd = cli_opts.auth_passwd

    grafanaurl = genUrl(ipaddr_grafana, port_grafana)
    dsurl = grafanaurl + "/api/datasources"

    datasourceurl = genUrl(datasource_ip, datasource_port)
    logging.info("\nStarting import_data_sources")

    # check if datasource is up (just for information)
    if "beringei" in datasource_file:
        try:
            r = requests.get(datasourceurl + "/")
            if r.status_code != 200:
                logging.info("Status code returned {}".format(r.status_code))
                logging.info("Can not reach datasource")
            else:
                logging.info("Success reaching BQS!")
        except requests.exceptions.RequestException as e:
            logging.error("Error checking if BQS datasource is up: {}".format(e))

    # get existing data sources
    try:
        logging.info("Reading existing data sources from {}".format(dsurl))
        r = requests.get(dsurl, auth=(auth_user, auth_passwd))
    except requests.exceptions.RequestException as e:
        logging.error("Error reading existing data sources from Grafana: {}".format(e))
        return
    try:
        logging.debug("Grafana returned: {}".format(r.text))
        existing_ds = json.loads(r.text)
    except Exception:
        logging.error("Unable to parse existing data sources")
        return

    # make a dictionary of existing data sources for keeping track
    existing_ds_dict = {}
    for ds in existing_ds:
        existing_ds_dict[ds["name"]] = ds["id"]

    # delete data sources if --deleteall flag is set
    if deleteall:
        for key, value in existing_ds_dict.items():
            if value >= 0:
                try:
                    logging.info(
                        "Deleting datasource {} from Grafana at {}".format(key, dsurl)
                    )
                    r = requests.delete(
                        dsurl + "/" + value, auth=(auth_user, auth_passwd)
                    )
                except requests.exceptions.RequestException as e:
                    logging.error("Error in delete: {}".format(e))
        return

    # assume data_sources directory exists
    dirname = "utilities/data_sources"
    directory = os.fsencode(dirname)

    for file in os.listdir(directory):
        if file.decode() != datasource_file:
            continue
        with open(dirname + "/" + file.decode()) as f:
            data_source = f.read()
        try:
            new_ds = json.loads(data_source)
            logging.info("Replacing {} with {}".format(new_ds["url"], datasourceurl))
            if len(datasource_user):
                logging.info(
                    "Replacing user name {} with {}".format(
                        new_ds["user"], datasource_user
                    )
                )
                logging.info(
                    "Replacing password {} with {}".format(
                        new_ds["password"], datasource_passwd
                    )
                )
            new_ds["url"] = datasourceurl
            new_ds["user"] = datasource_user
            new_ds["password"] = datasource_passwd
        except Exception:
            logging.error("Unable to parse {}".format(data_source))
            return

        try:
            if new_ds["name"] in existing_ds_dict:  # overwrite
                logging.info(
                    "Overwriting datasource {} to Grafana at {}".format(
                        new_ds["name"], dsurl
                    )
                )
                # use existing ID
                new_ds["id"] = existing_ds_dict[new_ds["name"]]
                updateurl = dsurl + "/" + str(new_ds["id"])
                r = requests.put(updateurl, json=new_ds, auth=(auth_user, auth_passwd))
                logging.debug(r.json())
                # existing_ds_dict[new_ds["name"]] = -1
            else:  # new data source
                logging.info(
                    "Writing new datasource {} to Grafana at {}".format(
                        new_ds["name"], dsurl
                    )
                )
                r = requests.post(dsurl, json=new_ds, auth=(auth_user, auth_passwd))
        except requests.exceptions.RequestException as e:
            logging.error("Error in put: {}".format(e))
            return
        if r.status_code == 200:
            logging.info("success returned from Grafana")
        else:
            logging.error(
                "Problem writing datasource, status code {}".format(str(r.status_code))
            )
