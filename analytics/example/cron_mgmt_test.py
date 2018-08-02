"""Provide tests for CronMgmt class.
"""

import logging
import os
import sys
import unittest

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from module.cron_mgmt import CronMgmt


class TestCronMgmt(unittest.TestCase):
    def __init__(self, *args, **kwargs):
        super(TestCronMgmt, self).__init__(*args, **kwargs)
        self.cron_mgmt = CronMgmt()

    def test_show_current(self):
        logging.info("Submit simple jobs and read from cron")
        self.cron_mgmt.remove_all()
        self.cron_mgmt.schedule_jobs_every_minutes("test_job_0")
        self.assertEqual(
            self.cron_mgmt.show_current(),
            ["<CronItem '* * * * * test_job_0 # NMS-Analytics'>"],
        )
        self.cron_mgmt.schedule_jobs_every_minutes("test_job_1", period_in_min=5)
        self.assertEqual(
            self.cron_mgmt.show_current(),
            [
                "<CronItem '* * * * * test_job_0 # NMS-Analytics'>",
                "<CronItem '*/5 * * * * test_job_1 # NMS-Analytics'>",
            ],
        )
        self.cron_mgmt.remove_all()

    def test_remove_all(self):
        logging.info("Submit a simple cron job and then remove it")
        self.cron_mgmt.remove_all()
        self.assertEqual(self.cron_mgmt.show_current(), [])

        self.cron_mgmt.schedule_jobs_every_minutes("test_job")
        self.assertEqual(
            self.cron_mgmt.show_current(),
            ["<CronItem '* * * * * test_job # NMS-Analytics'>"],
        )

        self.cron_mgmt.remove_all()
        self.assertEqual(self.cron_mgmt.show_current(), [])


if __name__ == "__main__":
    logging.basicConfig(
        format="%(asctime)s %(levelname)-8s %(message)s",
        level=logging.INFO,
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    unittest.main()
