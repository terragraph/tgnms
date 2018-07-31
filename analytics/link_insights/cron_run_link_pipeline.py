#!/usr/bin/env python3

""" Use the CronMgmt class to run link insights pipelines in LinkPipeline class.
"""

import sys
import os
import logging
import json

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from module.cron_mgmt import CronMgmt


def cron_run_link_pipeline(pipeline_jobs):
    """ Run the link insights pipelines.

        Args:
        pipeline_jobs: a dictionary of cron jobs to submit, from the AnalyticsConfig.

        Return:
        void.
    """

    # Submit jobs via cron_mgmt
    cron_mgmt = CronMgmt()
    for job in pipeline_jobs:
        logging.info(
            "Submitting job with command '{}'".format(pipeline_jobs[job]["command"])
        )
        cron_mgmt.schedule_jobs_every_minutes(
            pipeline_jobs[job]["command"],
            period_in_min=pipeline_jobs[job]["period_in_mins"],
        )

    logging.info("All pipeline jobs submitted")


if __name__ == "__main__":
    logging.basicConfig(
        format="%(asctime)s %(levelname)-8s %(message)s",
        level=logging.INFO,
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    analytics_config_file = "../AnalyticsConfig.json"
    try:
        with open(analytics_config_file) as config_file:
            analytics_config = json.load(config_file)

        pipeline_jobs = analytics_config["pipelines"]

        cron_run_link_pipeline(pipeline_jobs)
    except BaseException as err:
        logging.error("Fail to submit periodic jobs with error '{}' ".format(err.args))
