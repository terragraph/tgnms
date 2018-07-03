#!/usr/bin/env python3

""" Provide helper functions for the analytics.
"""

import os
import requests
import json
import numpy as np
import sys


class HelperFunction(object):
    """
    Helper functions used for the analytics.
    """

    def compute_correlation(self, v1, v2):
        """Compute the correlation between two vectors. Notice this function is
        different to numpy.correlate() as:
        a). it subtracts the means;
        b). the coefficient is normalized by the vector norm.

        Args:
        v1: list of values
        v2: list of values, should be of same length as v1

        Return:
        key_id_to_azmac: on SUCCESS, return the computed vector correlation.
                         on ERROR, return None.
        """
        if len(v1) != len(v2):
            sys.warning("Length mismatch: cannot compute vector correlation")
            return None
        else:
            # compute and extract the sample mean
            mean1, mean2 = np.mean(v1), np.mean(v2)
            norm1 = np.sqrt(np.sum([(i - mean1) ** 2 for i in v1]))
            norm2 = np.sqrt(np.sum([(i - mean2) ** 2 for i in v2]))
            cross_term = np.sum(
                [(v1[i] - mean1) * (v2[i] - mean2) for i in range(len(v1))]
            )
            return cross_term / (norm1 * norm2)
