#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.


def bwgd_to_epoch(bwgd: int) -> float:
    """Convert bwgd time to Unix epoch time in sec

    First convert bwgd time to gps time (in ms) by adjusting the 25.6 ms
    bwgd windows into ms, then calibrate gps time with unix epoch time.
    """
    real_gps_time = bwgd * 256 / 10
    gps_time = real_gps_time - 18000
    unix_time_ms = gps_time + 315964800000
    return unix_time_ms / 1000
