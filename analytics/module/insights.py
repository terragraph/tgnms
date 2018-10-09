#!/usr/bin/env python3

import time
import numpy as np

# import logging
import module.numpy_operations as npo
from module.numpy_time_series import StatType, NumpyTimeSeries


def generate_insights():
    interval = 30
    end_time = int(time.time())
    start_time = end_time - 3600
    nts = NumpyTimeSeries(start_time, end_time, interval)
    k = nts.get_consts()

    # link availability and flaps
    mgmt_link_up = nts.read_stats("staPkt.mgmtLinkUp", StatType.LINK)
    link_available = nts.read_stats("staPkt.linkAvailable", StatType.LINK)
    availability = []
    flaps = []
    for ti in range(k["num_topologies"]):
        num_links = k[ti]["num_links"]
        num_dir = nts.NUM_DIR
        availability.append(npo.nan_arr((num_links, num_dir, 1)))
        flaps.append(npo.nan_arr((num_links, num_dir, 1)))
        for li in range(num_links):
            for di in range(num_dir):
                a, f = npo.get_link_availability_and_flaps_1d(
                    mgmt_link_up[ti][li, di, :], link_available[ti][li, di, :], interval
                )
                availability[ti][li, di, 0], flaps[ti][li, di, 0] = a, f
        # write max along direction to each direction
        max_a = np.nanmax(availability[ti], axis=nts.DIR_AXIS)
        max_f = np.nanmax(flaps[ti], axis=nts.DIR_AXIS)
        for di in range(num_dir):
            availability[ti][:, di, :] = max_a
            flaps[ti][:, di, :] = max_f
    nts.write_stats("availability", availability, StatType.LINK, 900)
    nts.write_stats("flaps", flaps, StatType.LINK, 900)

    # P90 mcs
    mcs = nts.read_stats("staPkt.mcs", StatType.LINK)
    mcs_p90 = []
    for ti in range(k["num_topologies"]):
        mcs_p90.append(
            np.nanpercentile(
                mcs[ti], 10, axis=nts.TIME_AXIS, interpolation="lower", keepdims=True
            )
        )
    nts.write_stats("mcs.p90", mcs_p90, StatType.LINK, 900)

    # path-loss asymmetry
    tx_power_idx = nts.read_stats("staPkt.txPowerIndex", StatType.LINK)
    srssi = nts.read_stats("phystatus.srssi", StatType.LINK)
    pathloss = []
    pathloss_asymmetry = []
    for ti in range(k["num_topologies"]):
        pl, asm = npo.pathloss_asymmetry_nd(tx_power_idx[ti], srssi[ti], nts.DIR_AXIS)
        pl = np.nanmean(pl, axis=nts.TIME_AXIS, keepdims=True)
        asm = np.nanmean(asm, axis=nts.TIME_AXIS, keepdims=True)
        pathloss.append(pl)
        pathloss_asymmetry.append(asm)
    nts.write_stats("pathloss", pathloss, StatType.LINK, 900)
    nts.write_stats("pathloss_asymmetry", pathloss_asymmetry, StatType.LINK, 900)
