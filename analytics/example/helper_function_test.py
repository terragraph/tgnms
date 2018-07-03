#!/usr/bin/env python3

""" Test example for the HelperFunction class.
"""

import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from module.helper_function import HelperFunction


helper_function = HelperFunction()

print("Example to compute vector correlation")
ts1, ts2 = [1, 2, 3], [3, 6, 9]
ts3 = [3, 1, 0]
print(
    "Correlation of {} and {} is {}".format(
        ts1, ts2, helper_function.compute_correlation(ts1, ts2)
    )
)
print(
    "Correlation of {} and {} is {}".format(
        ts1, ts3, helper_function.compute_correlation(ts1, ts3)
    )
)
