#!/usr/bin/env python3

"""
Use the JobScheduler class to run insights pipeline
"""

import sys
import os
import logging
import json

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from module.job_scheduler import JobScheduler
from module.path_store import PathStore
from module.insights import generate_insights


if __name__ == "__main__":
    logging.basicConfig(
        format="%(asctime)s %(levelname)-8s %(message)s",
        level=logging.INFO,
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    # get configurations
    with open(PathStore.ANALYTICS_CONFIG_FILE) as config_file:
        analytics_config = json.load(config_file)
    max_run_time_in_s = analytics_config["periodic_jobs"]["max_run_time_in_s"]
    period_in_s = analytics_config["periodic_jobs"]["period_in_s"]
    low_freq_db_period = analytics_config["periodic_jobs"]["low_freq_db_period"]
    num_of_jobs_to_submit = max_run_time_in_s / period_in_s
    # run periodically
    job_scheduler = JobScheduler()
    job_scheduler.schedule_periodic_jobs(
        generate_insights,
        low_freq_db_period=low_freq_db_period,
        period_in_s=period_in_s,
        num_of_jobs_to_submit=num_of_jobs_to_submit,
    )
    job_scheduler.run()
