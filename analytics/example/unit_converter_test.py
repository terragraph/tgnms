#!/usr/bin/env python3

""" Test examples of the UnitConverter class.
"""

import os
import sys
import unittest
import logging

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from module.unit_converter import UnitConverter


class TestUnitConverter(unittest.TestCase):
    def __init__(self, *args, **kwargs):
        super(TestUnitConverter, self).__init__(*args, **kwargs)
        self.unit_converter = UnitConverter()

    def test_tx_power_idx_converter(self):
        logging.info("Testing tx_power, idx and dBm converting")
        enable_second_array = False
        power_idx0, power_idx1, power_idx2 = 21, 10, 25
        self.assertEqual(
            self.unit_converter.tx_power_idx_to_power_dbm(
                power_idx0, enable_second_array
            ),
            40,
        )
        self.assertEqual(
            self.unit_converter.tx_power_idx_to_power_dbm(
                power_idx1, enable_second_array
            ),
            29,
        )
        self.assertEqual(
            self.unit_converter.tx_power_idx_to_power_dbm(
                power_idx2, enable_second_array
            ),
            42,
        )
        self.assertEqual(
            self.unit_converter.tx_power_idx_to_power_dbm(power_idx2, True), 42 + 4.5
        )

        self.assertEqual(
            self.unit_converter.tx_power_dbm_to_power_idx(
                self.unit_converter.tx_power_idx_to_power_dbm(
                    power_idx0, enable_second_array
                ),
                enable_second_array,
            ),
            power_idx0,
        )

        self.assertEqual(
            self.unit_converter.tx_power_dbm_to_power_idx(
                self.unit_converter.tx_power_idx_to_power_dbm(
                    power_idx1, enable_second_array
                ),
                enable_second_array,
            ),
            power_idx1,
        )

        self.assertEqual(
            self.unit_converter.tx_power_dbm_to_power_idx(
                self.unit_converter.tx_power_idx_to_power_dbm(
                    power_idx2, enable_second_array
                ),
                enable_second_array,
            ),
            power_idx2,
        )
        self.assertEqual(
            self.unit_converter.tx_power_dbm_to_power_idx(
                self.unit_converter.tx_power_idx_to_power_dbm(
                    power_idx2, True
                ),
                True,
            ),
            power_idx2,
        )

    def test_bwgd_unix_time_converter(self):
        logging.info("Testing bwgd, unit_time conversions")
        bwgd0, bwgd1, bwgd2 = 47481906752, 47479768640, 47479764640
        self.assertAlmostEqual(
            self.unit_converter.bwgd_to_unix_time(bwgd0), 1531501594.8512, places=4
        )
        self.assertAlmostEqual(
            self.unit_converter.bwgd_to_unix_time(bwgd1), 1531446859.1840, places=4
        )
        self.assertAlmostEqual(
            self.unit_converter.bwgd_to_unix_time(bwgd2), 1531446756.7840, places=4
        )

        self.assertEqual(
            self.unit_converter.unix_time_to_bwgd(
                self.unit_converter.bwgd_to_unix_time(bwgd0)
            ),
            bwgd0,
        )
        self.assertEqual(
            self.unit_converter.unix_time_to_bwgd(
                self.unit_converter.bwgd_to_unix_time(bwgd1)
            ),
            bwgd1,
        )
        self.assertEqual(
            self.unit_converter.unix_time_to_bwgd(
                self.unit_converter.bwgd_to_unix_time(bwgd2)
            ),
            bwgd2,
        )


if __name__ == "__main__":
    logging.basicConfig(
        format="%(asctime)s %(levelname)-8s %(message)s",
        level=logging.INFO,
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    unittest.main()
