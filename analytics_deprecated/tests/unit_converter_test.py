#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

""" Test examples of the UnitConverter class.
"""

import logging
import unittest

from module.unit_converter import UnitConverter


class TestUnitConverter(unittest.TestCase):
    def __init__(self, *args, **kwargs):
        super(TestUnitConverter, self).__init__(*args, **kwargs)
        self.unit_converter = UnitConverter()

    def test_tx_power_idx_converter(self):
        logging.info("Testing tx_power, idx and dBm converting")
        enable_second_array = False
        power_idxs = [21, 10, 25]
        self.assertEqual(
            self.unit_converter.tx_power_idx_to_power_dbm(
                power_idxs[0], enable_second_array
            ),
            40,
        )
        self.assertEqual(
            self.unit_converter.tx_power_idx_to_power_dbm(
                power_idxs[1], enable_second_array
            ),
            29,
        )
        self.assertEqual(
            self.unit_converter.tx_power_idx_to_power_dbm(
                power_idxs[2], enable_second_array
            ),
            42,
        )
        self.assertEqual(
            self.unit_converter.tx_power_idx_to_power_dbm(power_idxs[2], True), 42 + 4.5
        )

        self.assertEqual(
            self.unit_converter.tx_power_dbm_to_power_idx(
                self.unit_converter.tx_power_idx_to_power_dbm(
                    power_idxs[0], enable_second_array
                ),
                enable_second_array,
            ),
            power_idxs[0],
        )

        self.assertEqual(
            self.unit_converter.tx_power_dbm_to_power_idx(
                self.unit_converter.tx_power_idx_to_power_dbm(
                    power_idxs[1], enable_second_array
                ),
                enable_second_array,
            ),
            power_idxs[1],
        )

        self.assertEqual(
            self.unit_converter.tx_power_dbm_to_power_idx(
                self.unit_converter.tx_power_idx_to_power_dbm(
                    power_idxs[2], enable_second_array
                ),
                enable_second_array,
            ),
            power_idxs[2],
        )
        self.assertEqual(
            self.unit_converter.tx_power_dbm_to_power_idx(
                self.unit_converter.tx_power_idx_to_power_dbm(power_idxs[2], True), True
            ),
            power_idxs[2],
        )

    def test_bwgd_unix_time_converter(self):
        logging.info("Testing bwgd, unit_time conversions")
        bwgds = [47481906752, 47479768640, 47479764640]
        self.assertAlmostEqual(
            self.unit_converter.bwgd_to_unix_time(bwgds[0]), 1531501594.8512, places=4
        )
        self.assertAlmostEqual(
            self.unit_converter.bwgd_to_unix_time(bwgds[1]), 1531446859.1840, places=4
        )
        self.assertAlmostEqual(
            self.unit_converter.bwgd_to_unix_time(bwgds[2]), 1531446756.7840, places=4
        )

        self.assertEqual(
            self.unit_converter.unix_time_to_bwgd(
                self.unit_converter.bwgd_to_unix_time(bwgds[0])
            ),
            bwgds[0],
        )
        self.assertEqual(
            self.unit_converter.unix_time_to_bwgd(
                self.unit_converter.bwgd_to_unix_time(bwgds[1])
            ),
            bwgds[1],
        )
        self.assertEqual(
            self.unit_converter.unix_time_to_bwgd(
                self.unit_converter.bwgd_to_unix_time(bwgds[2])
            ),
            bwgds[2],
        )


if __name__ == "__main__":
    logging.basicConfig(
        format="%(asctime)s %(levelname)-8s %(message)s",
        level=logging.INFO,
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    unittest.main()
