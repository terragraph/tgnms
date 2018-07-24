#!/usr/bin/env python3

from crontab import CronTab

cron = CronTab(user='root')
job = cron.new(command='python3 /root/crontest/example1.py', comment='nms-analytics')
job.minute.every(1)

cron.write()
print(cron.render())

