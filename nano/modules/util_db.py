#!/usr/bin/env python3

import time

import MySQLdb as mariadb


class MYSQLDB(object):
    """
    MYSQLDB provides interface to interact with mysql
    terragraph_network_analyzer database
    """

    def __init__(self, hostname="localhost", username="root", password="facebook"):
        """
        initilize the database connection
        @param hostname: ip address for the database host
        @param username: mysqldb username
        @param password: mysqldb password
        """
        self.connection = mariadb.connect(
            host=hostname, user=username, passwd=password, db="cxl"
        )

    def write(self, args, result):
        """
        interface to write data in to the terragraph_network_analyzer table
        """
        # Get the current timestamp
        now_time = int(time.time())
        cursor = self.connection.cursor()
        normalize_data = {}
        # Create table coloums and row data
        insert_str = "INSERT INTO terragraph_network_analyzer ("
        for f_key, f_value in result.items():
            if args["iperf"] and args["no_tcp"]:
                normalize_data["test_tag"] = "iperf_udp"
            elif args["iperf"]:
                normalize_data["test_tag"] = "iperf_udp_tcp"
            elif args["ping"]:
                normalize_data["test_tag"] = "ping"
            elif args["sector_availability"]:
                normalize_data["test_tag"] = "sector_availability"

            normalize_data["time"] = now_time
            normalize_data["link"] = f_key
            colomn_str = "test_tag, link, time,"
            value_str = "%(test_tag)s, %(link)s, %(time)s,"
            for s_key, s_val in f_value.items():
                try:
                    if str(s_key) == "dashboard":
                        normalize_data[s_key] = str(s_val)
                    elif str(s_key) == "healthiness":
                        normalize_data[s_key] = str(s_val)
                    elif str(s_key) == "rxokStdZ":
                        continue
                    elif str(s_key) == "txokStdA":
                        continue
                    else:
                        normalize_data[s_key] = int(s_val)
                except ValueError:
                    normalize_data[s_key] = int(0)
                except TypeError:
                    normalize_data[s_key] = int(0)
                colomn_str += s_key + ","
                value_str += "%(" + s_key + ")s,"
            add_data_str = (
                insert_str + colomn_str[:-1] + ") VALUES (" + value_str[:-1] + ")"
            )
            add_data = add_data_str
            cursor.execute(add_data, normalize_data)
            # Commit the rows
            self.connection.commit()
        # Close the connections
        cursor.close()
        self.connection.close()
