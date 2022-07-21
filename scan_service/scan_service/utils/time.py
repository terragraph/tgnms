#!/usr/bin/env python3

# Copyright (c) Meta Platforms, Inc. and affiliates.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.


def bwgd_to_epoch(bwgd: int) -> float:
    """Convert bwgd time to Unix epoch time in sec

    First convert bwgd time to gps time (in ms) by adjusting the 25.6 ms
    bwgd windows into ms, then calibrate gps time with unix epoch time.
    """
    real_gps_time = bwgd * 256 / 10
    gps_time = real_gps_time - 18000
    unix_time_ms = gps_time + 315964800000
    return unix_time_ms / 1000
