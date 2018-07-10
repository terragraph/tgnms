#!/usr/bin/env python3

"""Provide tests for MySqlDbAccess class.
"""

import unittest
import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from module.mysql_db_access import MySqlDbAccess


class TestMySQLAccess(unittest.TestCase):
    def test_api_service_setting(self):
        """ Test to make sure correct API service ip/port is obtained.
        """
        print("Querying API service setting")
        mysql_db_access = MySqlDbAccess(mysql_host_ip="172.17.0.1")
        if mysql_db_access is None:
            raise ValueError("Cannot create MySqlDbAccess object")

        try:
            api_service = mysql_db_access.read_api_service_setting(
                topology_name="tower G"
            )
        except BaseException as err:
            raise ValueError("Failed to get the api_service setting", err.args)
        print("The found api service setting is ", api_service)
        mysql_db_access.close_connection()

        # Currently, the api_service ip/port is "172.17.0.1" and 8081
        self.assertEqual(api_service["api_ip"], "172.17.0.1")
        self.assertEqual(api_service["api_port"], 8081)


if __name__ == "__main__":
    unittest.main()
