#!/usr/bin/env python3

""" Use the JobScheduler class to run link insights pipelines in LinkPipeline class.
"""

import sys
import os
import logging
import json

from link_pipeline import LinkPipeline

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from module.job_scheduler import JobScheduler


def run_link_pipeline(topology_name, max_run_time_in_s, period_in_s):
    """ Run the link insights pipelines.
        Args:
        topology_name: topology's name, like "tower G".
        max_run_time_in_s: total time of running, in unit of seconds.
        period_in_s: periodicity of pipeline jobs.
        Return:
        void.
    """
    num_of_jobs_to_submit = max_run_time_in_s / period_in_s

    logging.info(
        "Schedule link pipeline jobs with periodicity of {} mins".format(
            period_in_s / 60
        )
        + " for the next {} hours".format(max_run_time_in_s / 3600)
    )

    # Submit jobs via job_scheduler
    job_scheduler = JobScheduler()
    link_pipeline = LinkPipeline(topology_name)

    # Schedule the jobs for naive link insights
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

    job_scheduler.run()


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

        topology_name = analytics_config["periodic_jobs"]["topology_name"]
        max_run_time_in_s = analytics_config["periodic_jobs"]["max_run_time_in_s"]
        period_in_s = analytics_config["periodic_jobs"]["period_in_s"]

        run_link_pipeline(topology_name, max_run_time_in_s, period_in_s)
    except BaseException as err:
        logging.error("Fail to schedule periodic jobs with error: ", err.args)
