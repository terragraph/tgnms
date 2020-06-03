#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

from typing import Optional, Union

import numpy as np


def index2deg(my_idx: int, round_digit: int = 2) -> Optional[float]:
    """convert index to angle w.r.t. broadside"""
    return (
        round(-my_idx * 45.0 / 31, round_digit)
        if my_idx < 32
        else round((my_idx - 31) * 45.0 / 32, round_digit)
    )
