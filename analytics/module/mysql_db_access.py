#!/usr/bin/env python3

"""
   Provide MySqlDbAccess class, which will provide IO between the analytics
   and the MySQL database.
"""

import pymysql


class MySqlDbAccess(object):
    """
    Interface to access MySQL database. Used for API service setting fetching.
    """

    # TODO: add the Beringei Query Server setting fetching once the topologies table
    # in MySQL is refactored and contains BQS setting.

    def __new__(
        cls,
        env_config_file="../../tgnms/docker/env/mysql.env",
        mysql_host_ip="::1",
        database_name="cxl",
    ):
        """Create new MySqlDbAccess object if MySQL database username and password
           is uniquely found in the docker env file.
        Args:
        env_config_file: config file that stores the MySQL database setting.
        mysql_host_ip: ip address of the MySQL host.
        database_name: name of the MySQL database.

        Return: MySqlDbAccess object on success.
                None on failure.
        """

        # TODO: Currently, use the mysql.env file under tgnms to find the
        # password and username of the MySQL. Putting password/username in
        # a .env and create them as environment variable is not the safest way.
        # Need to figure right encryption flow before large-scale deployment.

        instance = super().__new__(cls)
        # Private username and password
        instance.__mysql_username = None
        instance.__mysql_password = None

        try:
            with open(env_config_file, "r") as env_file:
                lines = env_file.readlines()
                for line in lines:
                    line = line.strip()
                    if line.startswith("MYSQL_USER"):
                        if instance.__mysql_username is None:
                            instance.__mysql_username = line.split("=")[-1]
                        else:
                            raise ValueError("Multiple definition of MySQL username")
                    elif line.startswith("MYSQL_PASS"):
                        if instance.__mysql_password is None:
                            instance.__mysql_password = line.split("=")[-1]
                        else:
                            raise ValueError("Multiple definition of MySQL password")

            if (instance.__mysql_username is None) or (
                instance.__mysql_password is None
            ):
                raise ValueError("Missing information of MySQL")

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

    def read_api_service_setting(self, topology_name="tower G"):
        """Read the API service setting from MySQL.
        Args:
        topology_name: name of the topologies, like "tower G".

        Return: dictionary which contains keys of "api_ip" and "api_port".
                Raise exception on error.
        """
        api_service_config = {"api_ip": None, "api_port": None}

        with self.__connection.cursor() as cursor:
            sql_string = (
                "SELECT DISTINCT api_ip, api_port FROM topologies "
                + "WHERE name=%s GROUP BY api_ip, api_port;"
            )
            try:
                cursor.execute(sql_string, (topology_name,))
            except BaseException as err:
                print(err.args)
                raise ValueError("MySQL execution error")

            results = cursor.fetchall()
            if not results:
                raise ValueError("Cannot find matched api_service setting")
            elif len(results) > 1:
                raise ValueError(
                    "Conflicting api_service environment setting, ", results
                )
            api_service_config["api_ip"] = results[0]["api_ip"]
            api_service_config["api_port"] = results[0]["api_port"]

        return api_service_config
