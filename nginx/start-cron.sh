#!/usr/bin/env sh
# Copyright (c) 2014-present, Facebook, Inc.
#crond -L /var/log/cron.log -c /etc/crontabs
/usr/sbin/crond

trap "echo \"killing crond\"; kill \$!; exit" SIGINT SIGTERM

while true; do
  cat /var/log/cron.log & wait $!
done
