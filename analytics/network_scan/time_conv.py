#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

from calendar import timegm
from datetime import datetime

def bwgdToDatetime(bwgd):
    # convert bwgd time to gps time (in ms) by adjusting the 25.6 ms
    # bwgd windows into milliseconds then calibrate gps time with unix epoch
    real_gps_time = bwgd * 256 / 10
    gps_time = real_gps_time - 18000
    unix_time_ms = gps_time + 315964800000
    # Convert unix time to a python datetime object
    return datetime.utcfromtimestamp(unix_time_ms / 1000)

def datetimeToBwgd(dt):
    # Convert python datetime object to unix time (ms since unix epoch)
    unix_time_ms = timegm(dt.timetuple())
    # Calibrate unix time to sync with gps time then convert gps time
    # into 25.6 ms bwgd windows
    gps_time = unix_time_ms - 315964800
    real_gps_time = gps_time + 18
    return int((real_gps_time * 1000 * 10 + 255) / 256)
