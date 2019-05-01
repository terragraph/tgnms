#!/usr/bin/env python3

"""
utilities for numpy operations
"""

import logging
from enum import IntEnum
from typing import List, Tuple

import numpy as np


class LinkHealth(IntEnum):
    EXCELLENT = 0
    HEALTHY = 1
    MARGINAL = 2
    WARNING = 3
    UNKNOWN = 4


def is_valid(arr: np.ndarray) -> np.ndarray:
    return np.logical_not(np.isnan(arr))


def nan_arr(shape: Tuple) -> np.ndarray:
    data = np.zeros(shape, dtype=float)
    data.fill(np.nan)
    return data


def diff_1d(array: np.ndarray) -> np.ndarray:
    return np.convolve(array, [1, -1], "valid")


def list_or(np_list: List[np.ndarray]) -> np.ndarray:
    result = np_list[0]
    for arr in np_list:
        result = np.logical_or(result, arr)
    return result


def list_and(np_list: List[np.ndarray]) -> np.ndarray:
    result = np_list[0]
    for arr in np_list:
        result = np.logical_and(result, arr)
    return result


BWGD_SEC = 0.0256


def mode_int_1d(ar: np.ndarray):
    unique, unique_counts = np.unique(ar, return_counts=True)
    index = np.nanargmax(unique_counts)
    return np.array([unique[index]])


def link_stat_diff_1d(
    mgmt_link_up: np.ndarray, link_stat: np.ndarray, interval: int
) -> np.float64:
    lu = mgmt_link_up
    ls = link_stat
    num_points = len(lu)
    assert len(ls) == num_points
    t = np.arange(num_points)
    v = np.logical_and(is_valid(lu), is_valid(ls))
    if v.sum() < 2:
        return np.nan
    lu = lu[v]
    ls = ls[v]
    t = t[v]
    dls = diff_1d(ls)
    dt = diff_1d(t)
    resets = lu[1:] <= np.ceil(dt * interval / BWGD_SEC)
    dls[resets] = ls[1:][resets]
    return dls.sum()


def get_link_availability_and_flaps_1d(
    mgmt_link_up: np.ndarray, link_available: np.ndarray, interval: int
) -> Tuple[float, int]:
    lu = mgmt_link_up
    la = link_available
    assert len(lu) == len(la)
    num_points = len(lu)
    t = np.arange(num_points)
    v = np.logical_and(is_valid(lu), is_valid(la))
    if v.sum() < 2:
        return np.nan, np.nan
    lu = lu[v]
    la = la[v]
    t = t[v]
    dt = diff_1d(t)
    # lu really low -> link flap
    link_flaps = lu[1:] <= np.ceil(interval * dt / BWGD_SEC)
    # if no link flap use the diff else use end value
    la_bwgd = diff_1d(la)
    la_bwgd[link_flaps] = la[1:][link_flaps]
    error = la_bwgd < 0
    if error.any():
        # timestamp errors can cause it
        logging.error("error while computing link flaps")
    la_bwgd[error] = 0
    la_bwgd = la_bwgd.sum()
    # correction for missing datapoints at the start
    la_bwgd += min(t[0] * interval / BWGD_SEC, la[0])
    return la_bwgd / ((num_points - 1) * interval / BWGD_SEC), link_flaps.sum()


def get_uptime_and_resets_1d(
    counter: np.ndarray, interval: int, slope_per_second: float
) -> Tuple[float, int]:
    # set slope to be increment per interval, instead of per second
    slope = slope_per_second * interval
    num_points = len(counter)
    t = np.arange(num_points)
    v = is_valid(counter)
    if v.sum() < 2:
        return np.nan, np.nan
    c = counter[v]
    t = t[v]
    dt = diff_1d(t)
    dc = diff_1d(c)
    e = 1 / interval
    resets = c[1:] < slope * (dt + e)
    dc[resets] = c[1:][resets]
    error = np.logical_or(dc > slope * (dt + e), dc < 0)
    if error.any():
        logging.error("possible timestamp error while computing uptime")
    dc[error] = 0
    dc = dc.sum()
    dc += min(t[0] * slope, c[0])
    return dc / (slope * (num_points - 1)), resets.sum()


def power_dbm_nd(power_idx: np.ndarray, enable_second_array: bool) -> np.ndarray:
    """
    numpy version of function in unit_converter.py
    """
    max_power_dbm = 43.5  # dBm
    max_power_index = 28
    power_cut_off = 21

    high_idx = power_idx >= power_cut_off
    low_idx = np.logical_not(high_idx)
    power_in_dbm = np.array(power_idx, dtype=float)
    power_in_dbm[high_idx] = max_power_dbm - 0.5 * (
        max_power_index - power_idx[high_idx]
    )
    power_in_dbm[low_idx] = max_power_dbm - 0.5 * (max_power_index - power_cut_off)
    power_in_dbm[low_idx] -= power_cut_off - power_idx[low_idx]

    # power benefit from using the second array
    if enable_second_array:
        power_in_dbm += 4.5

    return power_in_dbm


def pathloss_asymmetry_nd(
    tx_power_index: np.ndarray, srssi: np.ndarray, dir_axis: int
) -> Tuple[np.ndarray, np.ndarray]:
    tx_power = power_dbm_nd(tx_power_index, False)
    pl_az = tx_power.take(0, axis=dir_axis) - srssi.take(1, axis=dir_axis)
    pl_za = tx_power.take(1, axis=dir_axis) - srssi.take(0, axis=dir_axis)
    pathloss_asymmetry = np.absolute(pl_az - pl_za)
    return (
        np.stack([pl_az, pl_za], axis=dir_axis),
        np.stack([pathloss_asymmetry] * 2, axis=dir_axis),
    )


# mcs_A -- no traffic -- mcs_B -- traffic -- mcs_C -- traffic -- mcs_D
# mcs reading at point C and D would be guaranteed elevated by link adaptation
# where as mcs reading at point A and B doesn't have known traffic before it
# so return [False, False, False, True]
def get_traffic_mask_1d(
    mgmt_link_up: np.ndarray, no_traffic: np.ndarray, interval: int
) -> np.ndarray:
    lu = mgmt_link_up
    nt = no_traffic
    num_points = len(lu)
    assert len(nt) == num_points
    t = np.arange(num_points)
    v = np.logical_and(is_valid(lu), is_valid(nt))
    traffic_mask = np.zeros(no_traffic.shape, dtype=bool)
    if v.sum() < 2:
        return traffic_mask
    dnt = diff_1d(nt[v])
    dt = diff_1d(t[v])
    is_link_up = lu[v][1:] > np.ceil(dt * interval / BWGD_SEC)
    # assume traffic when the no_traffic counter doesn't increase entire interval
    is_traffic = np.logical_and(dnt == 0, is_link_up)
    idx = 1
    for traffic, duration in zip(is_traffic, dt):
        for _ in range(duration):
            traffic_mask[idx] = traffic
            idx += 1
    return traffic_mask


# calculates the average PER over the interval
def get_per_1d(
    mgmt_link_up: np.ndarray, tx_ok: np.ndarray, tx_fail: np.ndarray, interval: int
) -> np.float64:
    dto = link_stat_diff_1d(mgmt_link_up, tx_ok, interval)
    dtf = link_stat_diff_1d(mgmt_link_up, tx_fail, interval)
    return dtf / (dto + dtf)


# condition is 1 or more positive values and 60/interval or more
# non-positive (0 or nan) values at the end
# needed because when no sta is associated, there is no stat and
# if we sample at 30s, high probability of nan
def detect_up_then_down_1d(mgmt_link_up: np.ndarray, interval: int) -> int:
    mlu = mgmt_link_up
    v = is_valid(mlu)
    mlu = mlu[v]
    nz = 0
    zr = 0
    for mlu_val in mlu:
        if mlu_val > 0:
            nz += 1
        else:
            break

    for mlu_val in mgmt_link_up[::-1]:
        if mlu_val == 0 or np.isnan(mlu_val):
            zr += 1
        else:
            break
    return int(nz >= 1 and zr >= (60 / interval))


def get_link_health_and_traffic_1d(
    mgmt_link_up: np.ndarray,
    tx_ok: np.ndarray,
    tx_fail: np.ndarray,
    no_traffic: np.ndarray,
    link_available: np.ndarray,
    mcs: np.ndarray,
    link_length: np.float64,
    interval: int,
) -> Tuple[int, np.float64]:
    traffic_mask = get_traffic_mask_1d(mgmt_link_up, no_traffic, interval)
    is_traffic = traffic_mask.sum() >= (60 / interval)

    if is_traffic:
        mcs = mcs[traffic_mask]

    mcs_p90 = np.nanpercentile(mcs, 10, interpolation="lower")
    _, flaps = get_link_availability_and_flaps_1d(
        mgmt_link_up, link_available, interval
    )
    # We can take tx_per over traffic_mask,
    # but this should be really good approximation, with/without traffic
    tx_per = get_per_1d(mgmt_link_up, tx_ok, tx_fail, interval)

    if is_traffic:
        if (
            (
                (link_length < 100 and mcs_p90 >= 11)
                or (link_length >= 100 and mcs_p90 >= 9)
            )
            and tx_per < 0.005
        ):
            link_health = LinkHealth.EXCELLENT
        elif (
            (
                (link_length < 100 and mcs_p90 >= 9)
                or (link_length >= 100 and mcs_p90 >= 7)
            )
            and tx_per < 0.01
        ):
            link_health = LinkHealth.HEALTHY
        elif (
            (
                (link_length < 100 and mcs_p90 >= 7)
                or (link_length >= 100 and mcs_p90 >= 4)
            )
            and tx_per < 0.02
        ):
            link_health = LinkHealth.MARGINAL
        elif np.isnan(link_length + mcs_p90 + flaps + tx_per):
            link_health = LinkHealth.UNKNOWN
        elif flaps:
            link_health = LinkHealth.UNKNOWN
        else:
            link_health = LinkHealth.WARNING
    else:
        if tx_per < 0.05 and mcs_p90 >= 9:
            link_health = LinkHealth.EXCELLENT
        elif tx_per < 0.10 and mcs_p90 >= 8:
            link_health = LinkHealth.HEALTHY
        elif tx_per < 0.20 and mcs_p90 >= 4:
            link_health = LinkHealth.MARGINAL
        elif np.isnan(link_length + mcs_p90 + flaps + tx_per):
            link_health = LinkHealth.UNKNOWN
        elif flaps:
            link_health = LinkHealth.UNKNOWN
        else:
            link_health = LinkHealth.WARNING

    return link_health, traffic_mask.sum() / len(traffic_mask)
