#!/usr/bin/env sh
#crond -L /var/log/cron.log -c /etc/crontabs
/usr/sbin/crond

trap "echo \"killing crond\"; kill \$!; exit" SIGINT SIGTERM

while true; do
  cat /var/log/cron.log & wait $!
done
