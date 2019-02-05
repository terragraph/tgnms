import numpy as np
import unittest
import logging
import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
import module.numpy_operations as npo


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


if __name__ == "__main__":
    logging.basicConfig(
        format="%(asctime)s %(levelname)-8s %(message)s",
        level=logging.INFO,
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    unittest.main()
