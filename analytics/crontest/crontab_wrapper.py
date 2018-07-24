#!/usr/bin/env python3

from crontab import CronTab
 
my_cron = CronTab(user='root')
for cron_job in my_cron:
    print(cron_job.command)
    print(type(cron_job))
    print (cron_job.frequency_per_hour())
