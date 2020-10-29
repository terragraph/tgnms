#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import logging
import unittest

import module.numpy_operations as npo
import numpy as np


class NumpyOperationsTest(unittest.TestCase):
    def test_get_link_availability_and_flaps_1d(self):
        slope = 30000 / 25.6
        ramp = np.floor(np.arange(1, 100, 1) * slope)

        mgmt_link_up = np.array(ramp)
        link_available = np.array(ramp)
        availability, flaps = npo.get_link_availability_and_flaps_1d(
            mgmt_link_up, link_available, 30
        )
        self.assertAlmostEqual(availability, 1, places=3)
        self.assertEqual(flaps, 0)
        uptime, resets = npo.get_uptime_and_resets_1d(mgmt_link_up, 30, 1000 / 25.6)
        self.assertAlmostEqual(uptime, 1, places=3)
        self.assertEqual(resets, 0)

        mgmt_link_up = np.array(ramp)
        link_available = np.array(ramp) / 2
        availability, flaps = npo.get_link_availability_and_flaps_1d(
            mgmt_link_up, link_available, 30
        )
        self.assertAlmostEqual(availability, 0.5, places=3)
        self.assertEqual(flaps, 0)

        mgmt_link_up = np.array(ramp)
        link_available = np.array(ramp)
        mgmt_link_up[50:60] = np.nan
        link_available[55:70] = np.nan
        availability, flaps = npo.get_link_availability_and_flaps_1d(
            mgmt_link_up, link_available, 30
        )
        self.assertAlmostEqual(availability, 1, places=3)
        self.assertEqual(flaps, 0)
        uptime, resets = npo.get_uptime_and_resets_1d(mgmt_link_up, 30, 1000 / 25.6)
        self.assertAlmostEqual(uptime, 1, places=3)
        self.assertEqual(resets, 0)

        mgmt_link_up = np.array(ramp)
        link_available = np.array(ramp)
        mgmt_link_up[50:99] = ramp[0:49]
        link_available[50:99] = ramp[0:49]
        mgmt_link_up[50:60] = np.nan
        link_available[50:70] = np.nan
        availability, flaps = npo.get_link_availability_and_flaps_1d(
            mgmt_link_up, link_available, 30
        )
        self.assertAlmostEqual(availability, 1, places=3)
        self.assertEqual(flaps, 1)
        uptime, resets = npo.get_uptime_and_resets_1d(mgmt_link_up, 30, 1000 / 25.6)
        self.assertAlmostEqual(uptime, 1, places=3)
        self.assertEqual(resets, 1)

        mgmt_link_up = np.array(ramp)
        link_available = np.array(ramp)
        mgmt_link_up[60:99] = ramp[0:39]
        link_available[60:99] = ramp[0:39]
        mgmt_link_up[50:60] = np.nan
        link_available[50:70] = np.nan
        availability, flaps = npo.get_link_availability_and_flaps_1d(
            mgmt_link_up, link_available, 30
        )
        self.assertAlmostEqual(availability, 0.9, places=1)
        self.assertEqual(flaps, 1)
        uptime, resets = npo.get_uptime_and_resets_1d(mgmt_link_up, 30, 1000 / 25.6)
        self.assertAlmostEqual(uptime, 0.9, places=1)
        self.assertEqual(resets, 1)

    def test_pathloss_asymmetry_nd(self):
        tx_power_index = np.array([28, 28])  # 43.5dBm
        srssi = np.array([43.5, 43.5])
        exp_pl = np.array([0, 0])
        exp_asm = np.array([0, 0])
        obs_pl, obs_asm = npo.pathloss_asymmetry_nd(tx_power_index, srssi, 0)
        np.testing.assert_array_equal(obs_pl, exp_pl)
        np.testing.assert_array_equal(obs_asm, exp_asm)

        tx_power_index = np.array([28, 28])  # 43.5dBm
        srssi = np.array([43.5, np.nan])
        exp_pl = np.array([np.nan, 0])
        exp_asm = np.array([np.nan, np.nan])
        obs_pl, obs_asm = npo.pathloss_asymmetry_nd(tx_power_index, srssi, 0)
        np.testing.assert_array_equal(obs_pl, exp_pl)
        np.testing.assert_array_equal(obs_asm, exp_asm)

        tx_power_index = np.array([28, 27])  # 43.5dBm, 43dBm
        srssi = np.array([43.5, 43.5])
        exp_pl = np.array([0, -0.5])
        exp_asm = np.array([0.5, 0.5])
        obs_pl, obs_asm = npo.pathloss_asymmetry_nd(tx_power_index, srssi, 0)
        np.testing.assert_array_equal(obs_pl, exp_pl)
        np.testing.assert_array_equal(obs_asm, exp_asm)

        tx_power_index = np.array([27, 20])  # 43dBm, 39dBm
        srssi = np.array([43.5, 42])
        exp_pl = np.array([1, -4.5])
        exp_asm = np.array([5.5, 5.5])
        obs_pl, obs_asm = npo.pathloss_asymmetry_nd(tx_power_index, srssi, 0)
        np.testing.assert_array_equal(obs_pl, exp_pl)
        np.testing.assert_array_equal(obs_asm, exp_asm)

        # use multi dimension
        # use 2 links x 2 dirs x 2 times - use above 4 inputs/outputs
        tx_power_index = np.array([[[28, 28], [28, 28]], [[28, 27], [27, 20]]])
        srssi = np.array([[[43.5, 43.5], [43.5, np.nan]], [[43.5, 43.5], [43.5, 42]]])
        exp_pl = np.array([[[0, np.nan], [0, 0]], [[0, 1], [-0.5, -4.5]]])
        exp_asm = np.array([[[0, np.nan], [0, np.nan]], [[0.5, 5.5], [0.5, 5.5]]])
        obs_pl, obs_asm = npo.pathloss_asymmetry_nd(tx_power_index, srssi, 1)
        np.testing.assert_array_equal(obs_pl, exp_pl)
        np.testing.assert_array_equal(obs_asm, exp_asm)

    def test_get_traffic_mask_1d(self):

        # acronyms:
        # mgmt_link_up: lu
        # no_traffic: nt
        # interval: i
        # observed traffic_interval: obs_ti
        # expected traffic_interval: exp_ti

        # no valid data
        lu = np.array([np.nan, np.nan, np.nan])
        nt = np.array([np.nan, np.nan, np.nan])
        i = 1
        exp_ti = np.array([False, False, False])
        obs_ti = npo.get_traffic_mask_1d(lu, nt, i)
        np.testing.assert_array_equal(obs_ti, exp_ti)

        # all valid data
        lu = np.array([1000, 1039, 1078, 1117])
        nt = np.array([100, 100, 100, 100])
        i = 1
        exp_ti = np.array([False, True, True, True])
        obs_ti = npo.get_traffic_mask_1d(lu, nt, i)
        np.testing.assert_array_equal(obs_ti, exp_ti)

        # no traffic scenario
        lu = np.array([1000, 1039, 1078, 1117])
        nt = np.array([100, 100, 100, 101])
        i = 1
        exp_ti = np.array([False, True, True, False])
        obs_ti = npo.get_traffic_mask_1d(lu, nt, i)
        np.testing.assert_array_equal(obs_ti, exp_ti)

        # link reset scenario
        lu = np.array([0, 39, 78, 117])
        nt = np.array([100, 100, 100, 100])
        i = 1
        exp_ti = np.array([False, False, True, True])
        obs_ti = npo.get_traffic_mask_1d(lu, nt, i)
        np.testing.assert_array_equal(obs_ti, exp_ti)

        # favor recent interval
        lu = np.array([1000, 1039, 39, 78, 117])
        nt = np.array([0, 0, 0, 0, 0])
        i = 1
        exp_ti = np.array([False, True, False, True, True])
        obs_ti = npo.get_traffic_mask_1d(lu, nt, i)
        np.testing.assert_array_equal(obs_ti, exp_ti)

        # largest interval
        lu = np.array([1000, 1039, 0, 39, 78, 117, 0, 39])
        nt = np.array([0, 0, 0, 0, 0, 0, 0, 0])
        i = 1
        exp_ti = np.array([False, True, False, False, True, True, False, False])
        obs_ti = npo.get_traffic_mask_1d(lu, nt, i)
        np.testing.assert_array_equal(obs_ti, exp_ti)

        # largest interval, with holes
        lu = np.array([1000, 1039, 0, 39, 78, 117, np.nan, 39])
        nt = np.array([0, np.nan, 0, 0, 0, 0, 0, 0])
        i = 1
        exp_ti = np.array([False, False, False, False, True, True, False, False])
        obs_ti = npo.get_traffic_mask_1d(lu, nt, i)
        np.testing.assert_array_equal(obs_ti, exp_ti)

        # misc
        lu = np.floor((np.arange(10) * 39.0625) + (3600.0 * 39.0625))
        nt = np.array([0, 10, np.nan, 30, 40, 40, 40, np.nan, np.nan, 40]) * 1.0
        i = 1
        exp_ti = np.array(
            [False, False, False, False, False, True, True, True, True, True]
        )
        obs_ti = npo.get_traffic_mask_1d(lu, nt, i)
        np.testing.assert_array_equal(obs_ti, exp_ti)

        # misc but different interval
        lu = np.floor((np.arange(10) * 39.0625 * 39) + (3600.0 * 39.0625))
        nt = np.array([0, 10, np.nan, 30, 40, 40, 40, np.nan, np.nan, 40]) * 1.0
        i = 39
        exp_ti = np.array(
            [False, False, False, False, False, True, True, True, True, True]
        )
        obs_ti = npo.get_traffic_mask_1d(lu, nt, i)
        np.testing.assert_array_equal(obs_ti, exp_ti)

    def test_get_per_1d(self):

        # acronyms:
        # lu: mgmt_link_up
        # to: tx_ok
        # tf: tx_fail
        # i: interval
        # obs: observed
        # exp: expected

        # no data
        lu = np.array([np.nan, np.nan])
        to = np.array([np.nan, np.nan])
        tf = np.array([np.nan, np.nan])
        i = 1
        exp_per = np.nan
        obs_per = npo.get_per_1d(lu, to, tf, i)
        np.testing.assert_equal(obs_per, exp_per)

        # base case 0 per
        lu = np.array([100, 139])
        to = np.array([100, 110])
        tf = np.array([10, 10])
        i = 1
        exp_per = 0
        obs_per = npo.get_per_1d(lu, to, tf, i)
        np.testing.assert_equal(obs_per, exp_per)

        # base case 1 per
        lu = np.array([100, 139])
        to = np.array([100, 100])
        tf = np.array([10, 20])
        i = 1
        exp_per = 1
        obs_per = npo.get_per_1d(lu, to, tf, i)
        np.testing.assert_equal(obs_per, exp_per)

        # base case 0.5 per
        lu = np.array([100, 139, 178])
        to = np.array([100, 110, 130])
        tf = np.array([10, 40, 40])
        i = 1
        exp_per = 0.5
        obs_per = npo.get_per_1d(lu, to, tf, i)
        np.testing.assert_equal(obs_per, exp_per)

        # with resets
        lu = np.array([100, 139, 10, 49])
        to = np.array([100, 110, 5, 10])
        tf = np.array([10, 70, 0, 0])
        i = 1
        exp_per = 0.75
        obs_per = npo.get_per_1d(lu, to, tf, i)
        np.testing.assert_equal(obs_per, exp_per)

        # add holes
        lu = np.array([100, 139, 10, np.nan, 88, 127])
        to = np.array([100, 110, 5, np.nan, 10, 10])
        tf = np.array([10, 70, 0, np.nan, np.nan, 0])
        i = 1
        exp_per = 0.75
        obs_per = npo.get_per_1d(lu, to, tf, i)
        np.testing.assert_equal(obs_per, exp_per)

        # different interval
        lu = np.array([100, 139, 10, np.nan, 88, 127]) * 39
        to = np.array([100, 110, 5, np.nan, 10, 10]) * 39
        tf = np.array([10, 70, 0, np.nan, np.nan, 0]) * 39
        i = 39
        exp_per = 0.75
        obs_per = npo.get_per_1d(lu, to, tf, i)
        np.testing.assert_equal(obs_per, exp_per)

    def test_link_stat_diff_1d(self):

        # acronyms:
        # lu: mgmt_link_up
        # ls: link_stat
        # i: interval
        # obs: observed
        # exp: expected

        # no data
        lu = np.array([np.nan, np.nan])
        ls = np.array([np.nan, np.nan])
        i = 1
        exp = np.nan
        obs = npo.link_stat_diff_1d(lu, ls, i)
        np.testing.assert_equal(obs, exp)

        # base case
        lu = np.array([100, 139])
        ls = np.array([100, 110])
        i = 1
        exp = 10
        obs = npo.link_stat_diff_1d(lu, ls, i)
        np.testing.assert_equal(obs, exp)

        # with resets
        lu = np.array([100, 139, 10, 49])
        ls = np.array([100, 110, 5, 10])
        i = 1
        exp = 20
        obs = npo.link_stat_diff_1d(lu, ls, i)
        np.testing.assert_equal(obs, exp)

        # add holes
        lu = np.array([100, 139, 10, np.nan, 88, 127, 166])
        ls = np.array([100, 110, 5, np.nan, 10, 10, 29])
        i = 1
        exp = 39
        obs = npo.link_stat_diff_1d(lu, ls, i)
        np.testing.assert_equal(obs, exp)

        # different interval
        lu = np.array([100, 139, 10, np.nan, 88, 127]) * 39
        ls = np.array([100, 110, 5, np.nan, 10, 10]) * 39
        i = 39
        exp = 20 * 39
        obs = npo.link_stat_diff_1d(lu, ls, i)
        np.testing.assert_equal(obs, exp)

    def test_mode_int_1d(self):

        # simple case
        ar = np.array([0, 1, 1, 2])
        exp = np.array([1])
        obs = npo.mode_int_1d(ar)
        np.testing.assert_equal(obs, exp)

        # negatives
        ar = np.array([0, -1, -1, -1, 1, 2, -4])
        exp = np.array([-1])
        obs = npo.mode_int_1d(ar)
        np.testing.assert_equal(obs, exp)

        # np.nan but not mode
        ar = np.array([-1, -1, np.nan, np.nan, np.nan, np.nan])
        exp = np.array([-1])
        obs = npo.mode_int_1d(ar)
        np.testing.assert_equal(obs, exp)

        # np.nan
        ar = np.array([np.nan, np.nan, np.nan, np.nan])
        exp = np.array([np.nan])
        obs = npo.mode_int_1d(ar)
        np.testing.assert_equal(obs, exp)


if __name__ == "__main__":
    logging.basicConfig(
        format="%(asctime)s %(levelname)-8s %(message)s",
        level=logging.INFO,
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    unittest.main()
