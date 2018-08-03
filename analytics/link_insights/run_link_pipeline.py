#!/usr/bin/env python3

""" Use the JobScheduler class to run link insights pipelines in LinkPipeline class.
"""

import sys
import os
import logging
import json
import time

from link_pipeline import LinkPipeline

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from module.job_scheduler import JobScheduler
from module.path_store import PathStore
from module.mysql_db_access import MySqlDbAccess


def print_current_unix_time():
    logging.info("This job is exec-ed at unix_time of {}".format(time.time()))


def run_link_pipeline(topology_names, max_run_time_in_s, period_in_s):
    """ Run the link insights pipelines.

        Args:
        topology_names: list of topology's name, each like "tower G".
        max_run_time_in_s: total time of running, in unit of seconds.
        period_in_s: periodicity of pipeline jobs.

        Return:
        void.
    """

    logging.info("Begin schedule jobs for topologies of {}".format(topology_names))

    num_of_jobs_to_submit = max_run_time_in_s / period_in_s

    # Submit jobs via job_scheduler
    job_scheduler = JobScheduler()

    # Background job which logs the current unix time. It is used to hold the
    # python process when fail to initialize link pipeline.
    job_scheduler.schedule_periodic_jobs(
        print_current_unix_time,
        period_in_s=period_in_s,
        num_of_jobs_to_submit=num_of_jobs_to_submit,
    )

    for topology_name in topology_names:
        logging.info(
            "For {}, schedule jobs with periodicity of {} mins for {} hours".format(
                topology_name, period_in_s / 60, max_run_time_in_s / 3600
            )
        )

        try:
            link_pipeline = LinkPipeline(topology_name)
            # Schedule the jobs for link mean and variance
            job_scheduler.schedule_periodic_jobs(
                link_pipeline.link_mean_variance_pipeline,
                period_in_s=period_in_s,
                num_of_jobs_to_submit=num_of_jobs_to_submit,
                job_input=[["phystatus.ssnrest", "stapkt.txpowerindex", "stapkt.mcs"]],
            )
            # Schedule the jobs for traffic stats
            job_scheduler.schedule_periodic_jobs(
                link_pipeline.traffic_stats_pipeline,
                period_in_s=period_in_s,
                num_of_jobs_to_submit=num_of_jobs_to_submit,
            )
            # Schedule the jobs for link health stats
            job_scheduler.schedule_periodic_jobs(
                link_pipeline.link_health_pipeline,
                period_in_s=period_in_s,
                num_of_jobs_to_submit=num_of_jobs_to_submit,
            )
        except BaseException as err:
            logging.error("Cannot create LinkPipeline. Error {}".format(err.args))

    job_scheduler.run()


if __name__ == "__main__":
    logging.basicConfig(
        format="%(asctime)s %(levelname)-8s %(message)s",
        level=logging.INFO,
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    try:
        with open(PathStore.ANALYTICS_CONFIG_FILE) as config_file:
            analytics_config = json.load(config_file)

        mysql_db_access = MySqlDbAccess()
        if mysql_db_access is None:
            raise ValueError("Cannot create MySqlDbAccess object")
        api_service_config = mysql_db_access.read_api_service_setting()
        # Run through all the topologies
        topology_names = list(api_service_config.keys())

        max_run_time_in_s = analytics_config["periodic_jobs"]["max_run_time_in_s"]
        period_in_s = analytics_config["periodic_jobs"]["period_in_s"]

        run_link_pipeline(topology_names, max_run_time_in_s, period_in_s)
    except BaseException as err:
        logging.error("Fail to schedule periodic jobs. Error: {}".format(err.args))
