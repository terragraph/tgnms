#!/usr/bin/env python3

""" Test example for the JobScheduler class.
"""

import sys
import os
import logging

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from module.job_scheduler import JobScheduler
from link_insights.run_link_pipeline import print_current_unix_time


job_scheduler = JobScheduler()

logging.basicConfig(
    format="%(asctime)s %(levelname)-8s %(message)s",
    level=logging.INFO,
    datefmt="%Y-%m-%d %H:%M:%S",
)
logging.info("This is a simple example to schedule jobs with periodicity of 5s")
job_scheduler.schedule_periodic_jobs(print_current_unix_time, 900, period_in_s=5)
job_scheduler.run()
