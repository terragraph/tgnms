#!/usr/bin/python
import sys
import json
# load intervals config
config_file = open('config.json', 'r')
config = json.loads(config_file.read())
base_period = config["base_seconds"]
service_config = """[Unit]
Description= Production Beringei Stats Writer ({name})
           
[Service]
Type=simple
User=root
EnvironmentFile=/home/nms/tgnms/service/beringei_stats_writer/config/{name}
ExecStart=/home/nms/tgnms/service/beringei_stats_writer/run
Restart=always
RestartSec=2s

[Install]
WantedBy=default.target
"""
env_config = """BERINGEI_CONFIG="/home/nms/beringei/config_{name}.json"
BERINGEI_BUCKET_SIZE={bucket_size}
BERINGEI_BUCKETS={buckets}
BERINGEI_FINALIZE_SECONDS={finalize_seconds}
BERINGEI_TIMESTAMP_BEHIND={timestamp_behind}
BERINGEI_PORT={port}
BERINGEI_PERSIST_PATH="/tmp/gorilla_data-{name}"
BERINGEI_EXEC_PATH="/home/nms/tgnms/setup/beringei/beringei/build"
BERINGEI_INTERVAL={interval}
"""
#BERINGEI_EXEC_PATH="/home/nms/tgnms/setup/beringei/beringei/build"
for interval in config["intervals"]:
  # supplied config
  name = interval["name"]
  num_days = interval["days"]
  interval_sec = interval["period"] # -mintimestampdelta
  service_port = interval["port"] # -port
  bucket_count = interval["buckets"]
  num_dps = num_days * 24 * 60 * 60 / interval_sec
  print "interval: " + str(interval_sec) + ", days: " + str(num_days) + \
        ", # datapoints: " + str(num_dps)
  # helpful hints for picking the right # of buckets
  for num in xrange(8, 31):
    if num_dps % num == 0:
      points_per_bucket = num_dps / num
      time_per_bucket = points_per_bucket * interval_sec
      time_per_bucket_str = str(time_per_bucket / 60.0) + ' min'
      if time_per_bucket > (60 * 60 * 24):
        time_per_bucket_str = str(time_per_bucket / 60.0 / 60.0 / 24.0) + ' days'
      elif time_per_bucket > (60 * 60):
        time_per_bucket_str = str(time_per_bucket / 60.0 / 60.0) + ' hrs'
      print ("\t*" if bucket_count == num else "\t") + \
            "buckets: " + str(num) + ", points/bucket: " + \
            str(points_per_bucket) + ", time/bucket: " + \
            time_per_bucket_str + \
            ("*" if bucket_count == num else "")
  # derived options
  allowed_timestamp_behind = 300
  bucket_size = num_dps / bucket_count * interval_sec # seconds
  buckets = bucket_count
  finalize_seconds = interval_sec * 2
  # write configs for each interval
  env_fh = open('config/' + name, 'w')
  env_fh.write(env_config.format(
    name=name,
    bucket_size=bucket_size,
    buckets=buckets,
    finalize_seconds=finalize_seconds,
    timestamp_behind=allowed_timestamp_behind,
    port=service_port,
    interval=interval_sec))
  service_fh = open('beringei_stats_writer_' + name + '.service', 'w')
  service_fh.write(service_config.format(
    name=name))
