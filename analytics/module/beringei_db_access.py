#!/usr/bin/env python3

"""
   Provide BeringeiDbAccess class, which can read, write, and get Beringei
   key_id between analytics and Beringei database.
"""

import os
import requests
import json
import sys

from thrift.TSerialization import serialize, deserialize
from thrift.protocol import TBinaryProtocol

sys.path.append(
    os.path.abspath(os.path.join(os.path.dirname(__file__), "..") + "/interface/gen-py")
)
from facebook.gorilla.beringei_data.ttypes import RawQueryReturn

# Constants
ERROR_RETURN = -1
SUCCESS_RETURN = 0


class BeringeiDbAccess(object):
    """
    Interface to read and write to Beringei DataBase via http requests to
    Beringei Data Server.
    """

    def __new__(cls, py_config_file="../AnalyticsConfig.json"):
        """Create new BeringeiDbAccess object if BQS setting is found
           from the configuration file.

        Args:
        py_config_file: Path to the PyAnalytics.

        Return: BeringeiDbAccess object on success.
                None on failure.
        """

        try:
            with open(py_config_file) as local_file:
                py_config = json.load(local_file)
        except Exception:
            print("Cannot find the configuration file!")
            return None

        if "BQS" not in py_config:
            print("Cannot find BQS config in the configurations!")
            return None
        else:
            instance = super().__new__(cls)
            print("BeringeiDbAccess objective created")
            instance.BQS_config = py_config["BQS"]
            return instance

    def get_beringei_key_id(self, source_mac, type_ahead_request):
        """Get the Beringei DB key id from Beringei Query Server.

        Args:
        source_mac:  MAC address of the source node of the statistic.
        type_ahead_request: list of query to send, of type TypeAheadRequest.

        Return:
        key_id: the founded key_id, if not found return ERROR_RETURN.
        """

        if self.BQS_config["protocol"] != "http":
            # Currently only support http msg
            print("Unknown BQS protocol!")
            return ERROR_RETURN

        if self.BQS_config["proxy"]:
            # Current support non-proxy
            print("Proxy supposed off!")
            return ERROR_RETURN
        else:
            os.environ["NO_PROXY"] = "{}:{}".format(
                self.BQS_config["mac"], self.BQS_config["port"]
            )

        url_to_post = "http://{}:{}/".format(
            self.BQS_config["mac"], self.BQS_config["port"]
        )
        url_to_post += "binary_stats_typeahead"

        # Serialize the query request by binary protocol
        request_body_bytes = serialize(
            type_ahead_request,
            protocol_factory=TBinaryProtocol.TBinaryProtocolFactory(),
        )

        # Post the http requests and get response
        try:
            response = requests.post(url_to_post, data=request_body_bytes)
        except OSError:
            print("Cannot send to the server")
            return

        if not response.ok:
            print("Response status error with code: ", response.status_code)
            return

        # response.content should be of str of folly::JSON
        try:
            return_json_str = response.content.decode("utf-8")
            query_returns = json.JSONDecoder().decode(return_json_str)
        except Exception as ex:
            print(
                "During decoding JSON return, an exception of type {0} occurred.".format(
                    type(ex).__name__
                )
            )
            return ERROR_RETURN

        if not len(query_returns):
            return ERROR_RETURN

        # Search the query return to find the Beringei key_id match is found
        # TODO: Currently, BQS TypeAheadRequest search may leads to duplicate
        # keys, once the duplication is fixed in the BQS, update here.
        for query in query_returns:
            for returned_key in query:
                if (
                    returned_key["key"] == type_ahead_request.input.lower()
                    and returned_key["node"] == source_mac
                ):
                    return returned_key["keyId"]

        return ERROR_RETURN

    def read_beringei_db(self, query_request_to_send):
        """Send query to Beringei Query Server to query from Beringei DB.

        Args:
        query_request_to_send: list of query to send,
                               it is of type RawReadQueryRequest.

        Return:
        query_returns: query read result.
        """

        if self.BQS_config["protocol"] != "http":
            # Currently only support http msg
            print("[Error]: Unknown BQS protocol!")
            return

        if self.BQS_config["proxy"]:
            # Current support non-proxy
            print("Proxy supposed off!")
            return
        else:
            os.environ["NO_PROXY"] = "{}:{}".format(
                self.BQS_config["mac"], self.BQS_config["port"]
            )

        url_to_post = "http://{}:{}/".format(
            self.BQS_config["mac"], self.BQS_config["port"]
        )
        url_to_post += "raw_query"

        # Convert query to binary bytes stream
        request_body_bytes = serialize(
            query_request_to_send,
            protocol_factory=TBinaryProtocol.TBinaryProtocolFactory(),
        )

        # Post the http requests and get response
        try:
            response = requests.post(url_to_post, data=request_body_bytes)
        except OSError:
            print("Cannot send to the server")
            return

        if not response.ok:
            print("response status error with code: ", response.status_code)
            return

        # response.content should be of binary bytes stream of RawQueryReturn
        output = RawQueryReturn()
        try:
            query_returns = deserialize(
                output,
                response.content,
                protocol_factory=TBinaryProtocol.TBinaryProtocolFactory(),
            )
        except Exception as ex:
            print(
                "During return deserialization, an exception of type {0} occurred.".format(
                    type(ex).__name__
                )
            )
            return None

        return query_returns

    def write_beringei_db(self, stats_to_write):
        """Send query to Beringei Query Server to write to Beringei DB.

        Args:
        stats_to_write: list of stats to write, of type StatsWriteRequest.

        Return:
        SUCCESS_RETURN on success.
        ERROR_RETURN on fail to write.
        """

        if self.BQS_config["protocol"] != "http":
            # Currently only support http msg
            print("Unknown BQS protocol!")
            return ERROR_RETURN

        if self.BQS_config["proxy"]:
            # Current support non-proxy
            print("Proxy supposed off!")
            return ERROR_RETURN
        else:
            os.environ["NO_PROXY"] = "{}:{}".format(
                self.BQS_config["mac"], self.BQS_config["port"]
            )

        url_to_post = "http://{}:{}/".format(
            self.BQS_config["mac"], self.BQS_config["port"]
        )
        url_to_post += "binary_stats_writer"

        # Convert query to binary bytes stream
        request_body_bytes = serialize(
            stats_to_write, protocol_factory=TBinaryProtocol.TBinaryProtocolFactory()
        )

        # Post the http requests and get response
        try:
            response = requests.post(url_to_post, data=request_body_bytes)
        except OSError:
            print("Cannot send to the server")
            return ERROR_RETURN

        if not response.ok:
            print("Response status error with code: ", response.status_code)
            return ERROR_RETURN
        else:
            print("Successful write to Beringei DB")
            return SUCCESS_RETURN
