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


class BeringeiDbAccess(object):
    """
    Interface to read and write to Beringei DataBase via http requests to
    Beringei Data Server.
    """

    def __new__(cls, analytics_config_file="../AnalyticsConfig.json"):
        """Create new BeringeiDbAccess object if BQS setting is found
           from the configuration file.

        Args:
        analytics_config_file: Path to the PyAnalytics.

        Return: BeringeiDbAccess object on success.
                None on failure.
        """

        try:
            with open(analytics_config_file) as local_file:
                analytics_config = json.load(local_file)
        except Exception:
            print("Cannot find the configuration file")
            return None

        if "BQS" not in analytics_config:
            print("Cannot find BQS config in the configurations")
            return None
        else:
            instance = super().__new__(cls)
            print("BeringeiDbAccess object created")
            instance._bqs_config = analytics_config["BQS"]
            return instance

    def _post_http_request_to_beringei_query_server(self, request_body, request_path):
        """Serialize and post http message to Beringei query server.

        Args:
        request_path: path of the http request post, used by BQS to find the
                      right end-point. Currently support "raw_query",
                      "binary_stats_writer", "binary_stats_typeahead".

        Return: The message response from BQS on success;
                On error, raise exception.
        """
        if request_path not in [
            "raw_query",
            "binary_stats_writer",
            "binary_stats_typeahead",
        ]:
            raise ValueError("Unknown http path")

        target_domain = "{}:{}".format(self._bqs_config["ip"], self._bqs_config["port"])

        if self._bqs_config["proxy"]:
            # Enable proxy
            non_proxy_domain_set = set(os.environ["NO_PROXY"].split(","))
            if target_domain in non_proxy_domain_set:
                non_proxy_domain_set.remove(target_domain)
            os.environ["NO_PROXY"] = ",".join(
                [domain for domain in non_proxy_domain_set]
            )
        else:
            os.environ["NO_PROXY"] = target_domain

        url_to_post = "http://{}:{}/".format(
            self._bqs_config["ip"], self._bqs_config["port"]
        )
        url_to_post += request_path
        print("url to send: ", url_to_post)

        # Serialize the query request by binary protocol
        request_body_bytes = serialize(
            request_body, protocol_factory=TBinaryProtocol.TBinaryProtocolFactory()
        )

        # Post the http requests and get response
        try:
            response = requests.post(url_to_post, data=request_body_bytes)
        except OSError:
            raise ValueError("Cannot send to the server")

        if not response.ok:
            print("Response status error with code: ", response.status_code)
            raise ValueError("Response status not ok")

        return response

    def get_beringei_key_id(self, source_mac, type_ahead_request):
        """Get the Beringei DB key id from Beringei Query Server.

        Args:
        source_mac:  MAC address of the source node of the statistic.
        type_ahead_request: list of query to send, of type TypeAheadRequest.

        Return:
        key_id: the founded key_id, raise exception on fail to find.
        """

        try:
            response = self._post_http_request_to_beringei_query_server(
                type_ahead_request, "binary_stats_typeahead"
            )
        except ValueError as err:
            print(err.args)
            raise ValueError("Fail to get http response")

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
            raise ValueError("Fail to decode returned folly JSON")

        if not len(query_returns):
            raise ValueError("Empty http response")

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

        raise ValueError("Cannot find matched key_id")

    def read_beringei_db(self, query_request_to_send):
        """Send query to Beringei Query Server to query from Beringei DB.

        Args:
        query_request_to_send: list of query to send,
                               it is of type RawReadQueryRequest.

        Return:
        query_returns: query read result on success.
                       On error, raise exception.
        """

        try:
            response = self._post_http_request_to_beringei_query_server(
                query_request_to_send, "raw_query"
            )
        except ValueError as err:
            print(err.args)
            raise ValueError("Fail to read from Beringei database")

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
            raise ValueError("Fail to read Beringei database")

        return query_returns

    def write_beringei_db(self, stats_to_write):
        """Send query to Beringei Query Server to write to Beringei DB.

        Args:
        stats_to_write: list of stats to write, of type StatsWriteRequest.

        Return:
        void on success. Raise exception on error.
        """

        try:
            response = self._post_http_request_to_beringei_query_server(
                stats_to_write, "binary_stats_writer"
            )
        except ValueError as err:
            print(err.args)
            raise ValueError("Fail to write to Beringei database")
