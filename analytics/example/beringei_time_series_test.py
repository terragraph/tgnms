#!/usr/bin/env python3

"""
Test examples for beringei_time_series module
"""
import logging
import math
import os
import sys
import time
import unittest

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
import module.beringei_time_series as bts
from module.topology_handler import fetch_network_info


class BeringeiTimeSeriesTest(unittest.TestCase):
    def __init__(self, *args, **kwargs):
        super(BeringeiTimeSeriesTest, self).__init__(*args, **kwargs)
        # the tests can fail due to
        # if "unittest" does not exist, write won't work the first time
        # if data points already exist, the write won't work for that time bin
        logging.warning("Tests may fail the first time or when run back to back")
        t = fetch_network_info()
        t = t[list(t.keys())[0]]["topology"]
        node_name_to_mac = {n["name"]: n["mac_addr"] for n in t["nodes"]}
        self._src_mac = node_name_to_mac[t["links"][0]["a_node_name"]]
        self._peer_mac = node_name_to_mac[t["links"][0]["z_node_name"]]
        self._topology_name = t["name"]
        self._interval = 30
        self._end_time = math.floor(int(time.time()) / self._interval) * self._interval
        self._start_time = self._end_time - 90
        self._name = "unittest"
        self._times = list(range(self._start_time, self._end_time, self._interval))
        self._values = [float(i) for i in range(len(self._times))]

    def test_write_read_node_stat(self):
        # write ramp time series
        ramp_ts = bts.TimeSeries(
            self._values,
            self._times,
            self._name,
            self._topology_name,
            src_mac=self._src_mac,
        )
        bts.write_time_series_list([ramp_ts], [self._interval])
        # read time series
        tsl = bts.read_time_series_list(
            self._name,
            [self._src_mac],
            [],
            self._start_time,
            self._end_time,
            self._interval,
            self._topology_name,
        )
        # compare
        self.assertEqual(len(tsl), 1)
        self.assertEqual(tsl[0], ramp_ts)

    def test_write_read_link_stat(self):
        # write ramp time series
        ramp_ts = bts.TimeSeries(
            self._values,
            self._times,
            self._name,
            self._topology_name,
            src_mac=self._src_mac,
            peer_mac=self._peer_mac,
        )
        bts.write_time_series_list([ramp_ts], [self._interval])
        # read time series
        tsl = bts.read_time_series_list(
            self._name,
            [self._src_mac],
            [self._peer_mac],
            self._start_time,
            self._end_time,
            self._interval,
            self._topology_name,
        )
        # compare
        self.assertEqual(len(tsl), 1)
        self.assertEqual(tsl[0], ramp_ts)
        pass

    def test_write_read_network_stat(self):
        # write ramp time series
        ramp_ts = bts.TimeSeries(
            self._values, self._times, self._name, self._topology_name
        )
        bts.write_time_series_list([ramp_ts], [self._interval])
        # reading aggregated stats is not supported, check ui
        pass


if __name__ == "__main__":
    logging.basicConfig(
        format="%(asctime)s %(levelname)-8s %(message)s",
        level=logging.INFO,
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    unittest.main()
