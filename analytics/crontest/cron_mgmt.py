#!/usr/bin/env python3

"""
   Provide functions that can submit, view, remove linux Cron jobs via crontab.
"""

import datetime
import logging
from crontab import CronTab


class CronMgmt(object):
    """
    Provide CrontabMgmt class which will be used to submit, view, and remove Linux
    cron jobs.
    """

    def __init__(self):
        self.comment = "NMS-Analytics"
        self.cron = CronTab(user="root")
        self.log = open("/root/crontest/append.txt", "a")
        self.log.write("\nAccessed on " + str(datetime.now()))

    def schedule_jobs_every_minutes(self, command, period_in_min=1):
        job = self.cron.new(command=command, comment=self.comment)
        # job.minute.on(0, 15, 30, 60)
        job.minute.every(period_in_min)
        job.enable()
        self.cron.write()
        self.log.write(str(datetime.now()), "Schedule Command")

    def show_all(self):
        logging.warning(self.cron.render())

    def remove_all(self):
        for job in self.cron:
            if job.comment == self.comment:
                self.cron.remove(job)
                self.cron.write()
