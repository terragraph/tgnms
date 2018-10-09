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


if __name__ == "__main__":
    logging.basicConfig(
        format="%(asctime)s %(levelname)-8s %(message)s",
        level=logging.INFO,
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    unittest.main()
