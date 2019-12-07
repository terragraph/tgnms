#!/usr/bin/env python3

import time
from datetime import datetime
from typing import Dict, List

import matplotlib.pyplot as plt
import module.numpy_operations as npo
import numpy as np
from module.numpy_time_series import NumpyTimeSeries, StatType
from module.topology_handler import fetch_network_info
from tabulate import tabulate


# Print table where row is specific to a node
# field_list and stat_list are columns
# show is bool array to filter rows
# field_list can contain node attribute from topology file
def tabulate_nodes(
    field_list: List[str], stat_list: List[np.ndarray], show: List[bool], t: Dict
):
    for s in stat_list:
        assert s.shape == stat_list[0].shape
    table = []
    for i, n in enumerate(t["nodes"]):
        row = []
        for f in field_list:
            row.append(n[f])
        for s in stat_list:
            row.append(s[i])
        if show is None or show[i]:
            table.append(row)
    print(tabulate(table))


# Print table where row is specific to a wireless link
# field_list and stat_list are columns
# show is bool array to filter rows
# field_list can contain link attribute from topology file
def tabulate_links(
    field_list: List[str], stat_list: List[np.ndarray], show: List[bool], t: Dict
):
    for s in stat_list:
        assert s.shape == stat_list[0].shape
    table = []
    for i, l in enumerate([l for l in t["links"] if l["link_type"] == 1]):
        row = []
        for f in field_list:
            row.append(l[f])
        for s in stat_list:
            row.append(s[i, 0])
            row.append(s[i, 1])
        if show is None or show[i]:
            table.append(row)
    print(tabulate(table))


# Print unique values and counts below it, in an array
def show_uniques(array: np.ndarray):
    values, counts = np.unique(array, return_counts=True)
    num_nans = np.isnan(values).sum()
    valids = npo.is_valid(values)
    values = np.concatenate(([np.nan], values[valids]))
    counts = np.concatenate(([num_nans], counts[valids]))
    print(tabulate(np.stack([values, counts], axis = 1)))
