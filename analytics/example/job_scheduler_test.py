#!/usr/bin/env python3

""" Test example for the JobScheduler class.
"""

import sys
import os
import time
import logging

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from module.job_scheduler import JobScheduler


def print_current_time():
    """A simple job which just print the current time.

    Args:
    void

    Return:
    void
    """
    logging.info("This job is exec-ed at unix_time of {}".format(time.time()))


job_scheduler = JobScheduler()

logging.basicConfig(
    format="%(asctime)s %(levelname)-8s %(message)s",
    level=logging.INFO,
    datefmt="%Y-%m-%d %H:%M:%S",
)
logging.info("This is a simple example to schedule jobs with periodicity of 5s")
job_scheduler.schedule_periodic_jobs(print_current_time, period_in_s=5)
job_scheduler.run()
