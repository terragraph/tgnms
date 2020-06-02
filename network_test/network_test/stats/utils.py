#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import logging
import math
from typing import List, Union


def apply_traffic_mask(
    traffic_data: List[float], metric: List[Union[int, float]]
) -> List[Union[int, float]]:
    """Return a new list of filtered metric data which coincided with traffic on the link."""
    metric_with_traffic: List[Union[int, float]] = []
    if len(traffic_data) != len(metric):
        logging.error("Traffic data and metric data are different lengths")
        return metric_with_traffic

    for index, (curr, next) in enumerate(zip(traffic_data, traffic_data[1:])):
        if curr == next:
            metric_with_traffic.append(metric[index])

    return metric_with_traffic


def percentile(lst: List[Union[int, float]], perc: float) -> float:
    """Compute the percentile of a sorted list where 0.0 < 'perc' < 1.0."""
    k = (len(lst) - 1) * perc
    floor = math.floor(k)
    ceil = math.ceil(k)
    if floor == ceil:
        return lst[int(k)]

    return (lst[int(floor)] * (ceil - k)) + (lst[int(ceil)] * (k - floor))
