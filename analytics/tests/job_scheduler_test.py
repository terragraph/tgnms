#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

""" Test example for the JobScheduler class.
"""

import logging

from link_insights.run_link_pipeline import print_current_unix_time
from module.job_scheduler import JobScheduler


job_scheduler = JobScheduler()

logging.basicConfig(
    format="%(asctime)s %(levelname)-8s %(message)s",
    level=logging.INFO,
    datefmt="%Y-%m-%d %H:%M:%S",
)
logging.info("This is a simple example to schedule jobs with periodicity of 5s")
job_scheduler.schedule_periodic_jobs(print_current_unix_time, 900, period_in_s=5)
job_scheduler.run()
