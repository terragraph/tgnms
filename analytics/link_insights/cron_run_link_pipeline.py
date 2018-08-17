#!/usr/bin/env python3

""" Use the CronMgmt class to run link insights pipelines in LinkPipeline class.
"""

import sys
import os
import logging
import json

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from module.cron_mgmt import CronMgmt
from module.path_store import PathStore
from module.mysql_db_access import MySqlDbAccess


def cron_run_link_pipeline():
    """ Run the link insights pipelines.
    """

    mysql_db_access = MySqlDbAccess()
    if mysql_db_access is None:
        raise ValueError("Cannot create MySqlDbAccess object")

    with open(PathStore.ANALYTICS_CONFIG_FILE) as config_file:
        analytics_config = json.load(config_file)
    pipeline_jobs = analytics_config["pipelines"]

    # Get the topology_names
    api_service_config = mysql_db_access.read_api_service_setting()
    topology_names = list(api_service_config.keys())

    # Submit jobs via cron_mgmt
    cron_mgmt = CronMgmt()
    for job in pipeline_jobs:
        # Submit a cron job of each pipeline with each topology
        for topology_name in topology_names:
            command = pipeline_jobs[job]["command"].format(PathStore.ANALYTICS_DIR)
            command += ' "{}"'.format(topology_name)
            logging.info("Submitting job with command '{}'".format(command))
            cron_mgmt.schedule_jobs_every_minutes(
                command, period_in_min=pipeline_jobs[job]["period_in_mins"]
            )

    logging.info("All pipeline jobs submitted")


if __name__ == "__main__":
    logging.basicConfig(
        format="%(asctime)s %(levelname)-8s %(message)s",
        level=logging.INFO,
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    try:
        cron_run_link_pipeline()
    except BaseException as err:
        logging.error("Fail to submit periodic jobs with error '{}' ".format(err.args))
