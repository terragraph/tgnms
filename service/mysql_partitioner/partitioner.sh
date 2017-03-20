#!/bin/bash
MAX_PARTITIONS=24 # approximate # of hours to keep
while [ true ]
do
  INCR=$(mysql cxl -e"SHOW CREATE TABLE ts_time\G"|grep AUTO_INCREMENT=|cut -d= -f3|awk '{print $1}')
  ROW_COUNT=$(mysql cxl -e"SELECT MAX(id)-MIN(id) FROM ts_time WHERE time > DATE_SUB(NOW(), INTERVAL 1 HOUR)" -BsN)
  # Create partitions for future writes
  for i in {1..2}
  do
    PNAME=$(mysql cxl -e"SELECT DATE_FORMAT(NOW() + INTERVAL ${i} HOUR, 'hourly_%Y_%m_%d_%k')" -BsN)
    # ensure partition doesn't yet exist
    mysql cxl -e"SELECT PARTITION_NAME FROM information_schema.PARTITIONS WHERE TABLE_SCHEMA = 'cxl' AND TABLE_NAME = 'ts_value'"|grep -q $PNAME
    if [ "$?" -eq "1" ]; then
      LESS_THAN=$(($ROW_COUNT * i + $INCR))
      echo "Creating partition ${PNAME} with time values less than ${LESS_THAN}"
      mysql cxl -e"ALTER TABLE ts_value ADD PARTITION (partition ${PNAME} VALUES LESS THAN (${LESS_THAN}))" -BsN
    fi
  done
  # Clean-up old partitions
  PART_COUNT=$(mysql cxl -e"SELECT PARTITION_NAME FROM information_schema.PARTITIONS WHERE TABLE_SCHEMA = 'cxl' AND TABLE_NAME = 'ts_value'" -BsN|wc -l)
  if [ "$PART_COUNT" -gt "$MAX_PARTITIONS" ]
  then
    CLEANUP_COUNT=$((PART_COUNT - $MAX_PARTITIONS))
    echo "Partition clean-up needed, dropping oldest ${CLEANUP_COUNT} partitions"
    PART_NAMES=$(mysql cxl -e"SELECT PARTITION_NAME FROM information_schema.PARTITIONS WHERE TABLE_SCHEMA = 'cxl' AND TABLE_NAME = 'ts_value'" -BsN|head -n ${CLEANUP_COUNT})
    for partition in $PART_NAMES
    do
      echo "Dropping partition ${partition}"
      mysql cxl -e"ALTER TABLE ts_value DROP PARTITION ${partition}"
    done
  fi
  # TODO - ts_time


  # Check every minute
  sleep 60
done
