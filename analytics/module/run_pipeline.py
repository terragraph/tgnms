#!/usr/bin/env python3

"""
Use the JobScheduler class to run insights pipeline
"""

import sys
import os
import logging
import time

from module.job_scheduler import JobScheduler
from module.path_store import PathStore
from module.insights import generate_insights


if __name__ == "__main__":
    logging.basicConfig(
        format="%(asctime)s %(levelname)-8s %(message)s",
        level=logging.INFO,
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    interval = 30
    while True:
        current_time = time.time()
        next_boundary = (int(current_time / interval) * interval) + interval
        time.sleep(next_boundary - current_time)
        generate_insights()
