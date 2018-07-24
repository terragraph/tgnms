#!/usr/bin/env python3

from crontab import CronTab

my_cron = CronTab(user='root')
for job in my_cron:
    if job.comment == 'nms-analytics':
        my_cron.remove(job)
        my_cron.write()
