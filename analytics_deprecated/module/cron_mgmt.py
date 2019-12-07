#!/usr/bin/env python3

"""
   Provide CronMgmt class that can submit, view, remove cron jobs via crontab.
"""

import logging

from crontab import CronTab


class CronMgmt(object):
    """
    Provide CronMgmt class which will be used to submit, view, and remove periodic
    cron jobs.
    """

    def __init__(self):
        self._comment = "NMS-Analytics"
        self._cron = CronTab(user="root")

    def schedule_jobs_every_minutes(self, command, period_in_min=1):
        """
        Submit periodic cron jobs.

        Args:
        command: string, command to be run.
        period_in_min: the period of the submitted job in minutes.

        Return:
        void.
        """
        job = self._cron.new(command=command, comment=self._comment)
        if period_in_min < 1:
            logging.error("Analytics should not submit sub-min jobs")
            return
        elif period_in_min > 60:
            logging.error(
                "schedule_jobs_every_minutes() should not submit jobs with"
                + "period larger than 1 hour"
            )
            return
        else:
            period_in_min = int(period_in_min)
            job.minute.every(period_in_min)

        job.enable()
        self._cron.write()
        logging.warning(
            "Submit command '{}' with period_in_min of {}".format(
                command, period_in_min
            )
        )

    def show_current(self):
        """
        Return the submitted Analytics cron jobs.

        Return:
        List of submitted Analytics jobs. Each job is represented by a string.
        """
        jobs = []
        for job in self._cron:
            if job.comment == self._comment:
                jobs.append(repr(job))

        return jobs

    def remove_all(self):
        """
        Remove all submitted Analytics cron jobs.
        """
        for job in self._cron:
            if job.comment == self._comment:
                self._cron.remove(job)
                self._cron.write()

        logging.warning("Cleared all Analytics jobs")
