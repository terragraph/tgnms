#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

"""
Test examples for numpy_time_series module
"""
import logging
import math
import time
import unittest

import numpy as np
from facebook.gorilla.Topology.ttypes import LinkType
from module.numpy_time_series import NumpyTimeSeries, StatType
from module.topology_handler import fetch_network_info


class NumpyTimeSeriesTest(unittest.TestCase):
    def __init__(self, *args, **kwargs):
        # the tests can fail due to
        # if keys does not exist, write won't work the first time
        # if data points already exist, the write won't work for that time bin
        logging.warning("Tests may fail the first time or when run back to back")
        super(NumpyTimeSeriesTest, self).__init__(*args, **kwargs)
        self._interval = 30
        self._end_time = math.floor(int(time.time()) / self._interval) * self._interval
        self._start_time = self._end_time - 90
        self._num_times = 4
        ni = fetch_network_info()
        self._topologies = [n["topology"] for _, n in ni.items()]
        self.assertGreater(len(self._topologies), 0)
        self._nts = NumpyTimeSeries(self._start_time, self._end_time, self._interval)

    def test_len_and_shape(self):
        nts_test_link = self._nts.read_stats("nts_test", StatType.LINK)
        nts_test_node = self._nts.read_stats("nts_test", StatType.NODE)
        nts_test_network = self._nts.read_stats("nts_test", StatType.NETWORK)
        self.assertEqual(len(nts_test_link), len(self._topologies))
        self.assertEqual(len(nts_test_node), len(self._topologies))
        self.assertEqual(len(nts_test_network), len(self._topologies))
        for i, t in enumerate(self._topologies):
            num_links = len(
                [0 for l in t["links"] if l["link_type"] == LinkType.WIRELESS]
            )
            self.assertEqual(nts_test_link[i].shape, (num_links, 2, self._num_times))
            self.assertEqual(
                nts_test_node[i].shape, (len(t["nodes"]), 1, self._num_times)
            )
            self.assertEqual(nts_test_network[i].shape, (1, 1, 4))

    def test_node_stat(self):
        nts_test_in = []
        for i, t in enumerate(self._topologies):
            ramp = np.arange(len(t["nodes"]) * self._num_times).reshape(
                (len(t["nodes"]), 1, self._num_times)
            )
            ramp = ramp * (i + 1)
            nts_test_in.append(ramp)
        self._nts.write_stats("unittest_node", nts_test_in, StatType.NODE, 30)
        # read and compare
        nts_test_out = self._nts.read_stats("unittest_node", StatType.NODE)
        for i in range(len(self._topologies)):
            compare = nts_test_out[i] == nts_test_in[i]
            self.assertEqual(compare.all(), True, [nts_test_in[i], nts_test_out[i]])

    def test_link_stat(self):
        nts_test_in = []
        for i, t in enumerate(self._topologies):
            num_links = len(
                [0 for l in t["links"] if l["link_type"] == LinkType.WIRELESS]
            )
            ramp = np.arange(num_links * self._nts.NUM_DIR * self._num_times).reshape(
                (num_links, self._nts.NUM_DIR, self._num_times)
            )
            ramp = ramp * (i + 1)
            nts_test_in.append(ramp)
        self._nts.write_stats("unittest_link", nts_test_in, StatType.LINK, 30)
        # read and compare
        nts_test_out = self._nts.read_stats("unittest_link", StatType.LINK)
        for i in range(len(self._topologies)):
            compare = nts_test_out[i] == nts_test_in[i]
            self.assertEqual(compare.all(), True, [nts_test_in[i], nts_test_out[i]])

    def test_network_stat(self):
        nts_test_in = []
        for i, _ in enumerate(self._topologies):
            ramp = np.arange(1 * 1 * self._num_times).reshape((1, 1, self._num_times))
            ramp = ramp * (i + 1)
            nts_test_in.append(ramp)
        self._nts.write_stats("unittest_network", nts_test_in, StatType.NETWORK, 30)
        # reading aggregated stats is not supported, check ui


if __name__ == "__main__":
    logging.basicConfig(
        format="%(asctime)s %(levelname)-8s %(message)s",
        level=logging.INFO,
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    unittest.main()
