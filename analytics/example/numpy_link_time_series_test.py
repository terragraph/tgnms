#!/usr/bin/env python3

"""
Test examples for numpy_time_series module
"""
import logging
import math
import numpy as np
import os
import sys
import time
import unittest

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from module.numpy_time_series import StatType, NumpyTimeSeries, NumpyLinkTimeSeries
from module.beringei_time_series import TimeSeries
from module.topology_handler import fetch_network_info

sys.path.append(
    os.path.abspath(
        os.path.join(os.path.dirname(__file__), "../..") + "/interface/gen-py"
    )
)
from facebook.gorilla.Topology.ttypes import LinkType


class NumpyLinkTimeSeriesTest(unittest.TestCase):
    def __init__(self, *args, **kwargs):
        super(NumpyLinkTimeSeriesTest, self).__init__(*args, **kwargs)

    # use NumpyTimeSeries to test NumpyLinkTimeSeries
    # Fetch specific stat using NumpyTimeSeries
    # Fetch same stat NumpyLinkTimeSeries,
    # configured to use fewer links with different time window
    # compare the output of two
    def test_read_stats_link(self):
        interval = 30
        num_links = 3
        samp_per_link = 10
        max_end_time = math.floor(int(time.time()) / interval) * interval
        min_start_time = max_end_time - (interval * num_links * samp_per_link) + 1
        ni = fetch_network_info()
        keys = list(ni.keys())
        self.assertGreater(len(keys), 0)
        # remove all but one topology
        for k in keys[1:]:
            ni.pop(k)
        t = ni[keys[0]]["topology"]
        node_name_to_mac = {n["name"]: n["mac_addr"] for n in t["nodes"]}
        wl = [l for l in t["links"] if l["link_type"] == LinkType.WIRELESS]
        num_all_links = len(wl)
        self.assertGreater(len(wl), num_links)
        bts_links = []
        for i, l in enumerate(wl[0:num_links]):
            src_mac = node_name_to_mac[l["a_node_name"]]
            peer_mac = node_name_to_mac[l["z_node_name"]]
            start_time = min_start_time + (interval * i * samp_per_link)
            end_time = start_time + (interval * samp_per_link) - 1
            bts_links.append(
                TimeSeries(
                    [0, 0], [start_time, end_time], "", t["name"], src_mac, peer_mac
                )
            )
        nlts = NumpyLinkTimeSeries(bts_links, interval, ni)
        nts = NumpyTimeSeries(min_start_time, max_end_time, interval, ni)
        # use staPkt.mgmtLinkUp to exercise read_stats()
        all_link_stats = nts.read_stats("staPkt.mgmtLinkUp", StatType.LINK)[0]
        some_link_stats = nlts.read_stats("staPkt.mgmtLinkUp", StatType.LINK)
        self.assertEqual(
            all_link_stats.shape, (num_all_links, 2, num_links * samp_per_link)
        )
        self.assertEqual(some_link_stats.shape, (num_links, 2, samp_per_link))
        for i in range(num_links):
            a = all_link_stats[i, :, i * samp_per_link : (i + 1) * samp_per_link]
            b = some_link_stats[i, :, :]
            # there is at-least one valid sample that got compared
            self.assertEqual(np.isnan(a).all(), False)
            a[np.isnan(a)] = 0
            b[np.isnan(b)] = 0
            # compare stats from nlts should be same as from nts
            self.assertEqual((a == b).all(), True, [a, b])

        # exercise write_stats() using *_link_stats,
        # zero out np.nan for easy comparison
        all_link_stats[np.isnan(all_link_stats)] = 0
        some_link_stats[np.isnan(some_link_stats)] = 0
        all_link_bts = nts.write_stats(
            "unittest.nlts", [all_link_stats], StatType.LINK, interval
        )
        some_link_bts = nlts.write_stats("unittest.nlts", some_link_stats, interval)
        self.assertEqual(len(all_link_bts), 2 * num_all_links)
        self.assertEqual(len(some_link_bts), 2 * num_links)
        for bts_idx in range(len(some_link_bts)):
            a = all_link_bts[bts_idx]
            li = int(bts_idx / 2)
            a.times = a.times[li * samp_per_link : (li + 1) * samp_per_link]
            a.values = a.values[li * samp_per_link : (li + 1) * samp_per_link]
            b = some_link_bts[bts_idx]
            self.assertEqual(a, b)

        # use miscSys.numFrameTimer to test read_stats on StatType.NODE
        all_node_stats = nts.read_stats("miscSys.numFrameTimer", StatType.NODE)
        all_link_stats = nts.reshape_node_to_link(all_node_stats)[0]
        some_link_stats = nlts.read_stats("miscSys.numFrameTimer", StatType.NODE)
        self.assertEqual(
            all_link_stats.shape, (num_all_links, 2, num_links * samp_per_link)
        )
        self.assertEqual(some_link_stats.shape, (num_links, 2, samp_per_link))
        for i in range(num_links):
            a = all_link_stats[i, :, i * samp_per_link : (i + 1) * samp_per_link]
            b = some_link_stats[i, :, :]
            # there is at-least one valid sample that got compared
            self.assertEqual(np.isnan(a).all(), False)
            a[np.isnan(a)] = 0
            b[np.isnan(b)] = 0
            self.assertEqual((a == b).all(), True, [a, b])

        # exercise get_link_length()
        all_link_lengths = nts.get_link_length()[0]
        some_link_lengths = nlts.get_link_length()
        self.assertEqual(all_link_lengths.shape, (num_all_links, 2, 1))
        self.assertEqual(some_link_lengths.shape, (num_links, 2, 1))
        for i in range(num_links):
            a = all_link_lengths[i, :, 0]
            b = some_link_lengths[i, :, 0]
            # there is al-teast one valid sample that got compared
            self.assertEqual(np.isnan(a).all(), False)
            a[np.isnan(a)] = 0
            b[np.isnan(b)] = 0
            # compare stats from nlts should be same as from nts
            self.assertEqual((a == b).all(), True, [a, b])


if __name__ == "__main__":
    logging.basicConfig(
        format="%(asctime)s %(levelname)-8s %(message)s",
        level=logging.INFO,
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    unittest.main()
