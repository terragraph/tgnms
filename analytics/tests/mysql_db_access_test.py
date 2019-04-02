#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

"""Provide tests for MySqlDbAccess class.
"""

import logging
import unittest

from module.mysql_db_access import MySqlDbAccess
from module.scan_handler import ScanHandler


class TestMySQLAccess(unittest.TestCase):
    def __init__(self, *args, **kwargs):
        super(TestMySQLAccess, self).__init__(*args, **kwargs)
        try:
            self.mysql_db_access = MySqlDbAccess()
            if self.mysql_db_access is None:
                raise ValueError("Cannot create MySqlDbAccess object")
            self.api_service = self.mysql_db_access.read_api_service_setting()
            # Just use the first topology in the MySQL table for testing
            self.topology_name = list(self.api_service.keys())[0]
        except BaseException as err:
            self.fail(
                ("Cannot load topology from the api_service. Error: {}").format(
                    err.args
                )
            )

        logging.info("Using topology of {} for tests".format(self.topology_name))

    def test_api_service_setting(self):
        """ Test to make sure correct API service ip/port can be obtained.
        """
        logging.info("The api_service ip and ports are")

        for topology_name in self.api_service:
            logging.info(
                "Topology name: {}, api_ip: {}, api_port: {}".format(
                    topology_name,
                    self.api_service[topology_name]["api_ip"],
                    self.api_service[topology_name]["api_port"],
                )
            )

    def test_get_pathloss_from_im_scan(self):
        """ Read the IM scan results from MySQL.
        """
        scan_handler = ScanHandler()
        pathloss_map, tx_mac_to_scan_unix_time = scan_handler.get_pathloss_from_im_scan(
            self.topology_name
        )
        self.assertTrue(pathloss_map)
        self.assertTrue(tx_mac_to_scan_unix_time)


if __name__ == "__main__":
    logging.basicConfig(
        format="%(asctime)s %(levelname)-8s %(message)s",
        level=logging.INFO,
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    unittest.main()
