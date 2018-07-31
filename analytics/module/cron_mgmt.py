#!/usr/bin/env python3

"""
   Provide CronMgmt class that can submit, view, remove cron jobs via crontab.
"""

import datetime
import logging

from crontab import CronTab


class CronMgmt(object):
    """
    Provide CronMgmt class which will be used to submit, view, and remove periodic
    cron jobs.
    """

    def __init__(self):
        self.comment = "NMS-Analytics"
        self.cron = CronTab(user="root")
        self.log = "/usr/local/analytics/cron_mgmt_log.txt"

    def schedule_jobs_every_minutes(self, command, period_in_min=1):
        """
        Submit periodic cron jobs.

        Args:
        command: string, command to be run.
        period_in_min: the period of the submitted job in minutes.

        Return:
        void.
        """
        job = self.cron.new(command=command, comment=self.comment)
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
        self.cron.write()
        try:
            with open(self.log, "a") as file:
                file.writelines(
                    str(datetime.datetime.now())
                    + " Submit Command '{}' with period_in_min of {}\n".format(
                        command, period_in_min
                    )
                )
        except EnvironmentError as err:
            logging.error("Cannot open log output file {}".format(err.args))

    def show_current(self):
        """
        Return the submitted Analytics cron jobs.

        Return:
        List of submitted Analytics jobs. Each job is represented by a string.
        """
        jobs = []
        for job in self.cron:
            if job.comment == self.comment:
                jobs.append(repr(job))

        return jobs

    def remove_all(self):
        """
        Remove all submitted Analytics cron jobs.
        """
        for job in self.cron:
            if job.comment == self.comment:
                self.cron.remove(job)
                self.cron.write()
        try:
            with open(self.log, "a") as file:
                file.writelines(
                    str(datetime.datetime.now()) + " Cleared all Analytics jobs\n"
                )
        except EnvironmentError as err:
            logging.error("Cannot open log output file {}".format(err.args))
