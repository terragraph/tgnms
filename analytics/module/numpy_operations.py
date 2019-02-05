#!/usr/bin/env python3

"""
utilities for numpy operations
"""

import logging
from typing import List, Tuple

import numpy as np


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
    # 25.6ms counter frequency, 5s error
    slope = (interval * 1000) / 25.6
    e = 5 / interval
    # lu really low -> link flap, works well if dt > e for link flap event
    link_flaps = lu[1:] < slope * (dt + e)
    # if no link flap use the diff else use end value
    la_bwgd = diff_1d(la)
    la_bwgd[link_flaps] = la[1:][link_flaps]
    # detect false positive and false negative for link flap
    error = np.logical_or(la_bwgd > slope * (dt + e), la_bwgd < 0)
    if error.any():
        # this error has been observed with 1s stats,
        # e.g. when timestamp associated with value got modified
        logging.error("error while computing link flaps")
    la_bwgd[error] = 0
    la_bwgd = la_bwgd.sum()
    # correction for missing datapoints at the start
    la_bwgd += min(t[0] * slope, la[0])
    return la_bwgd / (slope * (num_points - 1)), link_flaps.sum()


def get_uptime_and_resets_1d(counter: np.ndarray, interval: int, slope_per_second: float) -> Tuple[float, int]:
    # set slope to be increment per interval, instead of per second
    slope = slope_per_second * interval
    num_points = len(counter)
    t = np.arange(num_points)
    v = is_valid(counter)
    if v.sum() < 2:
        return np.nan
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
