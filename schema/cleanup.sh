#!/bin/bash
if [ -z "$1" ]; then
  echo You must specify \# of days
  exit 1
fi
if [ $1 -gt 0 ] && [ $1 -le 100 ]; then
  echo SQL stats clean-up for $1 days
  mysql cxl -e"SET @TIME_ID = (select max(id) from ts_time where time < DATE_SUB(NOW(), INTERVAL $1 DAY) limit 1); SELECT @TIME_ID; DELETE FROM ts_value WHERE time_id < @TIME_ID; DELETE FROM ts_time WHERE id < @TIME_ID;"
fi
