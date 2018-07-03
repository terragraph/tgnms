#!/usr/bin/env python3

""" Provide JobScheduler class, which can schedule jobs.
"""

import sched
import time
import numpy as np


class JobScheduler(object):
    """
    Scheduler class which is used to schedule jobs, including periodically
    jobs.
    """

    def schedule_periodic_jobs(
        self,
        job_to_send,
        period_in_s=60 * 5,
        stop_time_unixtime_in_s=None,
        offset_time_in_s=0,
        priority=2,
        job_input=None,
    ):
        """schedule a job to run periodically at the same time.

        Args:
        job_to_send: job function to be submit.
        period_in_s: the period of when to submit the job, default to be
                     5 minutes.
        stop_time_unixtime_in_s: The last time point to submit the job.
                                 If not provided, submit 10 jobs.
        offset_time_in_s: The offset to submit the first job, default to be 0s,
                          i.e., no wait.
        priority: level of priority, smaller number means higher priority.
        job_input: used to pass variable to the job_to_send function.

        Return:
        void
        """
        s = sched.scheduler(time.time, time.sleep)
        priority = priority

        current_time = int(time.time())
        if stop_time_unixtime_in_s is None:
            max_job_delay_in_s = offset_time_in_s + period_in_s * 9.1
        else:
            # No stop time given, submit 10 jobs by default
            max_job_delay_in_s = stop_time_unixtime_in_s - current_time

        print("Job Clock Start time", current_time + offset_time_in_s)
        print(offset_time_in_s, max_job_delay_in_s, period_in_s)

        job_delays = np.arange(offset_time_in_s, max_job_delay_in_s, period_in_s)
        for delay in job_delays:
            if job_input is None:
                s.enter(delay, priority, job_to_send)
            else:
                s.enter(delay, priority, job_to_send, tuple(job_input))
        print(
            "{} jobs entered queue with scheduled delay of : {}".format(
                len(job_delays), job_delays
            )
        )

        s.run()
