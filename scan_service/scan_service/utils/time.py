#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

from datetime import datetime


SCAN_TIME_DELTA_S = 120
SCAN_TIME_DELTA_BWGD = (SCAN_TIME_DELTA_S * 1000) / 25.6


def bwgd_to_datetime(bwgd: int) -> datetime:
    # Convert bwgd time to gps time (in ms) by adjusting the 25.6 ms
    # bwgd windows into milliseconds then calibrate gps time with unix epoch
    real_gps_time = bwgd * 256 / 10
    gps_time = real_gps_time - 18000
    unix_time_ms = gps_time + 315964800000
    # Convert unix time to a python datetime object
    return datetime.utcfromtimestamp(unix_time_ms / 1000)


def datetime_to_bwgd(dt: datetime) -> int:
    # Convert python datetime object to unix time (ms since unix epoch)
    unix_time_ms = (dt - datetime(1970, 1, 1)).total_seconds() * 1000
    # Calibrate unix time to sync with gps time then convert gps time
    # into 25.6 ms bwgd windows
    gps_time = unix_time_ms - 315964800000
    real_gps_time = gps_time + 18000
    return int((real_gps_time * 10) / 256)
