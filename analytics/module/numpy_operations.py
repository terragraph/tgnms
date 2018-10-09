#!/usr/bin/env python3

"""
utilities for numpy operations
"""

import logging
import numpy as np
from typing import Tuple


def is_valid(arr: np.ndarray) -> np.ndarray:
    return np.logical_not(np.isnan(arr))


def nan_arr(shape: Tuple) -> np.ndarray:
    data = np.zeros(shape, dtype=float)
    data.fill(np.nan)
    return data


def diff_1d(array: np.ndarray) -> np.ndarray:
    return np.convolve(array, [1, -1], "valid")


def get_link_availability_and_flaps_1d(
    mgmt_link_up: np.ndarray, link_available: np.ndarray, interval: int
) -> Tuple[int, int]:
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
