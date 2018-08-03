#!/usr/bin/env python3

"""
   Provide MySqlDbAccess class, which will provide IO between the analytics
   and the MySQL database.
"""

import pymysql
import os
import json
import logging
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from module.path_store import PathStore


class MySqlDbAccess(object):
    """
    Interface to access MySQL database. Used for API service setting fetching.
    """

    # TODO: add the Beringei Query Server setting fetching once the topologies table
    # in MySQL is refactored and contains BQS setting.

    def __new__(cls, database_name="cxl"):
        """Create new MySqlDbAccess object if MySQL database username and password
           are uniquely found in the docker env file.
        Args:
        database_name: name of the MySQL database.

        Return: MySqlDbAccess object on success.
                None on failure.
        """

        # TODO: Currently, The MySQL password/username is in a .env file and
        # create them as environment variable during docker-compose,
        # which is not the safest way. Need to figure right encryption flow
        # before large-scale deployment.

        try:
            with open(PathStore.ANALYTICS_CONFIG_FILE) as config_file:
                analytics_config = json.load(config_file)
        except Exception:
            logging.error("Cannot find the configuration file")
            return None

        if "MYSQL" not in analytics_config or "ip" not in analytics_config["MYSQL"]:
            logging.error("Cannot find MySQL config in the configurations")
            return None
        mysql_host_ip = analytics_config["MYSQL"]["ip"]

        instance = super().__new__(cls)

        try:
            if "MYSQL_USER" not in os.environ:
                raise ValueError("Missing environment variable of 'MYSQL_USER'")
            mysql_username = os.environ["MYSQL_USER"]
            if "MYSQL_PASS" not in os.environ:
                raise ValueError("Missing environment variable of 'MYSQL_PASS'")
            mysql_password = os.environ["MYSQL_PASS"]

        except BaseException as err:
            logging.error("Error during loading MySQL environment info" +
                          "error {}".format(err.args))
            return None

        try:
            # Connect to the MySQL database
            instance.__connection = pymysql.connect(
                host=mysql_host_ip,
                user=mysql_username,
                password=mysql_password,
                db=database_name,
                charset="utf8mb4",
                cursorclass=pymysql.cursors.DictCursor,
            )
        except BaseException as err:
            logging.error("Error during MySQL connection setup: {}".format(err.args))
            return None

        return instance

    def close_connection(self):
        """Close the MySQL connection and remove all MySQL settings.
        """
        self.__connection.close()

    def read_api_service_setting(self):
        """Read the API service setting from MySQL.
        Args:
        void

        Return: dict which maps the topology names to the corresponding
                api_service ip/port. Each mapped topology name is a dict with
                key of "api_ip" and "api_port". Raise exception on error.
        """
        api_service_config = {}

        with self.__connection.cursor() as cursor:
            sql_string = "SELECT DISTINCT name, api_ip, api_port FROM topologies;"
            try:
                cursor.execute(sql_string)
            except BaseException as err:
                logging.error(err.args)
                raise ValueError("MySQL execution error")

            results = cursor.fetchall()
            for api_result in results:
                if api_result["name"] in api_service_config:
                    raise ValueError(
                        "Find multiple api set up for network", api_result["name"]
                    )
                api_service_config[api_result["name"]] = {}
                api_service_config[api_result["name"]]["api_ip"] = api_result["api_ip"]
                api_service_config[api_result["name"]]["api_port"] = api_result[
                    "api_port"
                ]

        return api_service_config
