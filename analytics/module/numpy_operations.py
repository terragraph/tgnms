#!/usr/bin/env python3

"""
utilities for numpy operations
"""

import numpy as np
from typing import Tuple


def is_valid(arr: np.ndarray) -> np.ndarray:
    return np.logical_not(np.isnan(arr))


def nan_arr(shape: Tuple) -> np.ndarray:
    data = np.zeros(shape, dtype=float)
    data.fill(np.nan)
    return data
