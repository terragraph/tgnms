#!/usr/bin/env python3

"""
   Provide MySqlDbAccess class, which will provide IO between the analytics
   and the MySQL database.
"""

import pymysql
import os
import json


class MySqlDbAccess(object):
    """
    Interface to access MySQL database. Used for API service setting fetching.
    """

    # TODO: add the Beringei Query Server setting fetching once the topologies table
    # in MySQL is refactored and contains BQS setting.

    def __new__(
        cls,
        mysql_host_ip=None,
        database_name="cxl",
        analytics_config_file="../AnalyticsConfig.json",
    ):
        """Create new MySqlDbAccess object if MySQL database username and password
           are uniquely found in the docker env file.
        Args:
        mysql_host_ip: ip address of the MySQL host. If specified, will be used
                       as MySQL ip address. If not, will try to find in the
                       analytics setup file in analytics_config_file.
        database_name: name of the MySQL database.
        analytics_config_file: path to the analytics setting file, will be used to
                               find MySQL ip if not specified.

        Return: MySqlDbAccess object on success.
                None on failure.
        """

        # TODO: Currently, The MySQL password/username is in a .env file and
        # create them as environment variable during docker-compose,
        # which is not the safest way. Need to figure right encryption flow
        # before large-scale deployment.

        if mysql_host_ip is None:
            try:
                with open(analytics_config_file) as config_file:
                    analytics_config = json.load(config_file)
            except Exception:
                print(
                    "Did not provide mysql_host_ip and cannot find the configuration file"
                )
                return None

            if "MYSQL" not in analytics_config or "ip" not in analytics_config["MYSQL"]:
                print("Cannot find MySQL config in the configurations")
                return None
            mysql_host_ip = analytics_config["MYSQL"]["ip"]

        instance = super().__new__(cls)
        # Private username and password
        instance.__mysql_username = None
        instance.__mysql_password = None

        try:
            if "MYSQL_USER" not in os.environ:
                raise ValueError("Missing environment variable of 'MYSQL_USER'")
            instance.__mysql_username = os.environ["MYSQL_USER"]
            if "MYSQL_PASS" not in os.environ:
                raise ValueError("Missing environment variable of 'MYSQL_PASS'")
            instance.__mysql_password = os.environ["MYSQL_PASS"]

        except BaseException as err:
            print("Error during loading MySQL environment info:", err.args)
            return None

        try:
            # Connect to the MySQL database
            instance.__connection = pymysql.connect(
                host=mysql_host_ip,
                user=instance.__mysql_username,
                password=instance.__mysql_password,
                db=database_name,
                charset="utf8mb4",
                cursorclass=pymysql.cursors.DictCursor,
            )
        except BaseException as err:
            print("Error during MySQL connection setup:", err.args)
            return None

        return instance

    def close_connection(self):
        """Close the MySQL connection and remove all MySQL settings.
        """
        self.__mysql_username = None
        self.__mysql_password = None
        self.__connection.close()

    def read_api_service_setting(self):
        """Read the API service setting from MySQL.
        Args:
        void

        Return: dictionary which contains keys of "api_ip" and "api_port".
                Raise exception on error.
        """
        api_service_config = {}

        with self.__connection.cursor() as cursor:
            sql_string = (
                "SELECT DISTINCT name, api_ip, api_port FROM topologies "
                + "GROUP BY name, api_ip, api_port;"
            )
            try:
                cursor.execute(sql_string)
            except BaseException as err:
                print(err.args)
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
