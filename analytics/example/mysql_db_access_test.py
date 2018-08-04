#!/usr/bin/env python3

"""Provide tests for MySqlDbAccess class.
"""

import unittest
import sys
import os
import logging

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from module.mysql_db_access import MySqlDbAccess


class TestMySQLAccess(unittest.TestCase):
    def test_api_service_setting(self):
        """ Test to make sure correct API service ip/port can be obtained.
        """
        logging.info("Querying API service setting")
        mysql_db_access = MySqlDbAccess()
        if mysql_db_access is None:
            raise ValueError("Cannot create MySqlDbAccess object")

        try:
            api_service = mysql_db_access.read_api_service_setting()
        except BaseException as err:
            raise ValueError("Fail to get the api_service setting." +
                             "Error: {}".format(err.args))
        mysql_db_access.close_connection()

        # Check to make sure there are valid api_service setting
        self.assertTrue(api_service)
        logging.info("The api_service ip and ports are")
        for topology_name in api_service:
            logging.info(
                "Topology name: {}, api_ip: {}, api_port: {}".format(
                    topology_name,
                    api_service[topology_name]["api_ip"],
                    api_service[topology_name]["api_port"],
                )
            )


if __name__ == "__main__":
    logging.basicConfig(
        format="%(asctime)s %(levelname)-8s %(message)s",
        level=logging.INFO,
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    unittest.main()
