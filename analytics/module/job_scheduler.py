#!/usr/bin/env python3

""" Provide JobScheduler class, which can schedule jobs.
"""

import sched
import time
import logging


class JobScheduler(object):
    """
    Scheduler class which is used to schedule jobs, including periodically
    jobs.
    """

    def __init__(self):
        self.s = sched.scheduler(time.time, time.sleep)

    def schedule_periodic_jobs(
        self,
        job_to_send,
        period_in_s=60 * 5,
        num_of_jobs_to_submit=10,
        offset_time_in_s=0,
        priority=2,
        job_input=None,
    ):
        """schedule a job to run periodically at the same time.

        Args:
        job_to_send: job function to be submit.
        period_in_s: the period of when to submit the job, default to be
                     5 minutes. If input period is float, will be floored to int.
        num_of_jobs_to_submit: The number of jobs to submit. Default to 10 jobs.
                               If float, will be floored to int.
        offset_time_in_s: The offset to submit the first job, default to be 0s,
                          i.e., no wait. If float, will be floored to int.
        priority: level of priority, smaller number means higher priority.
        job_input: used to pass variable to the job_to_send function.

        Return:
        void
        """

        current_time = int(time.time())

        offset_time_in_s = int(offset_time_in_s)
        logging.info("Job clock start time {}".format(current_time + offset_time_in_s))

        period_in_s = int(period_in_s)
        num_of_jobs_to_submit = int(num_of_jobs_to_submit)

        job_delays = list(
            range(
                offset_time_in_s,
                offset_time_in_s + num_of_jobs_to_submit * period_in_s,
                period_in_s,
            )
        )
        for delay in job_delays:
            if job_input is None:
                self.s.enter(delay, priority, job_to_send)
            else:
                self.s.enter(delay, priority, job_to_send, tuple(job_input))
        logging.info(
            "{} jobs entered queue with scheduled delay of : {}".format(
                len(job_delays), job_delays
            )
        )

    def run(self):
        """Begin executing the scheduled jobs in the queue.
        """
        self.s.run()
