#!/usr/bin/env python3

import click
import os
import sys
from datetime import timedelta
from operator import attrgetter

from scan_group import ScanGroup
from scan_db import ScanDb

from terragraph_thrift.Controller.ttypes import ScanType

USAGE_MSG = (
    "Usage: python scan_stats.py [ network name ] "
    "[ response window in weeks ] [ IBF | PBF | RTCAL | CBF | IM ]\n"
    "Example: python scan_stats.py \"TG RF test network\" 2 IM"
)

if len(sys.argv) != 4:
    print(USAGE_MSG)
    sys.exit(1)

network_name = sys.argv[1]

try:
    result_window = int(sys.argv[2])
except Exception:
    print("Error: response window must be a non-negative integer")
    print(USAGE_MSG)
    sys.exit(1)

if result_window < 0:
    print("Error: response window must be a non-negative integer")
    print(USAGE_MSG)
    sys.exit(1)

scan_type = getattr(ScanType, sys.argv[3], None)
if scan_type is None:
    print("Error: invalid scan type")
    print(USAGE_MSG)
    sys.exit(1)

# Get db credentials from env
MYSQL_ENV_VARS = ["MYSQL_HOST", "MYSQL_USER", "MYSQL_PASS"]
for var in MYSQL_ENV_VARS:
    if var not in os.environ:
        print("Error missing {} from environment".format(var))
        sys.exit(1)
DB_HOST = os.environ["MYSQL_HOST"]
DB_USER = os.environ["MYSQL_USER"]
DB_PASS = os.environ["MYSQL_PASS"]

SCAN_TIME_DELTA = timedelta(seconds=120)
DB_NAME = "cxl"

result_reader = ScanDb(DB_HOST, DB_USER, DB_PASS, DB_NAME)
scans = result_reader.get_scans(
    network_name, scan_type=scan_type, result_window=result_window)

scan_groups = []
cur_group_scans = []

for scan in sorted(scans, key=attrgetter('timestamp')):
    if not cur_group_scans:
        cur_group_scans.append(scan)
    elif scan.timestamp < cur_group_scans[-1].timestamp + SCAN_TIME_DELTA:
        cur_group_scans.append(scan)
    else:
        scan_groups.append(ScanGroup(cur_group_scans))
        cur_group_scans.clear()
        cur_group_scans.append(scan)

for group in scan_groups:
    print("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~")
    group.print_stats()
    print("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n")
