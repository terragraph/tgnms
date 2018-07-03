#!/usr/bin/env python3

""" Test example for the JobScheduler class.
"""

import sys
import os
import time

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from module.job_scheduler import JobScheduler


def print_current_time():
    """A simple job which just print the current time.

    Args:
    void

    Return:
    void
    """
    print("This job is exec-ed at ", time.time())


job_scheduler = JobScheduler()

print("This is a simple example to schedule jobs with periodicity of 5s")
job_scheduler.schedule_periodic_jobs(print_current_time, period_in_s=5)
