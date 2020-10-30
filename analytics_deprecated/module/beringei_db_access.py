#!/usr/bin/env python3

"""
   Provide BeringeiDbAccess class, which can read, write, and get Beringei
   key_id between analytics and Beringei database.
"""

import json
import logging
import os

import requests
from module.path_store import PathStore
from thrift.protocol import TBinaryProtocol
from thrift.TSerialization import deserialize, serialize


class BeringeiDbAccess(object):
    """
    Interface to read and write to Beringei DataBase via http requests to
    Beringei Data Server.
    """

    def __new__(cls):
        """Create new BeringeiDbAccess object if BQS setting is found
           from the configuration file.

        Args:
        void.

        Return: BeringeiDbAccess object on success.
                None on failure.
        """

        try:
            with open(PathStore.ANALYTICS_CONFIG_FILE) as local_file:
                analytics_config = json.load(local_file)
        except Exception:
            logging.error("Cannot find the configuration file")
            return None

        if "BQS" not in analytics_config:
            logging.error("Cannot find BQS config in the configurations")
            return None
        else:
            instance = super().__new__(cls)
            logging.debug("BeringeiDbAccess object created")
            instance._bqs_config = analytics_config["BQS"]
            return instance

    def _post_http_request_to_beringei_query_server(
        self, request_body, request_path, is_binary=True
    ):
        """Serialize and post http message to Beringei query server.

        Args:
        request_path: path of the http request post, used by BQS to find the
                      right end-point. Currently support "raw_query",
                      "binary_stats_writer", "binary_stats_typeahead",
                      "events_writer".
        events_writer request_body is a text json so no need to serialize

        Return: The message response from BQS on success;
                On error, raise exception.
        """
        if request_path not in [
            "raw_query",
            "binary_stats_writer",
            "binary_stats_typeahead",
            "unified_stats_writer",
            "events_writer",
        ]:
            raise ValueError("Unknown http path")

        target_domain = "{}:{}".format(
            self._bqs_config["hostname"], self._bqs_config["port"]
        )

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
            self._bqs_config["hostname"], self._bqs_config["port"]
        )
        url_to_post += request_path
        logging.debug("url to send: {}".format(url_to_post))

        # Serialize the query request by binary protocol
        if is_binary:
            request_body_rq = serialize(
                request_body, protocol_factory=TBinaryProtocol.TBinaryProtocolFactory()
            )
        else:
            request_body_rq = request_body

        # Post the http requests and get response
        try:
            response = requests.post(url_to_post, data=request_body_rq, timeout=60)
            logging.debug(
                "BQS post response status code: {}".format(response.status_code)
            )
        except OSError:
            raise ValueError("Cannot send to the server")

        if not response.ok:
            logging.error(
                "Response status error with code: {}".format(response.status_code)
            )
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
            logging.error(err.args)
            raise ValueError("Fail to get http response")

        # response.content should be of str of folly::JSON
        try:
            return_json_str = response.content.decode("utf-8")
            query_returns = json.JSONDecoder().decode(return_json_str)
        except Exception as ex:
            logging.error(
                "During decoding return, a type {0} exception occurred.".format(
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

    def write_bqs(self, stats_to_write, request_path="binary_stats_writer"):
        """Send query to Beringei Query Server to write to Beringei DB.

        Args:
        stats_to_write: list of stats to write, of type StatsWriteRequest.

        Return:
        void on success. Raise exception on error.
        """

        try:
            return self._post_http_request_to_beringei_query_server(
                request_body=stats_to_write, request_path=request_path, is_binary=False
            )
        except ValueError as err:
            logging.error(err.args)
            raise ValueError("Fail to post to BQS")

    def write_node_and_agg_stats_beringei_db(self, stats_to_write):
        """Send query to Beringei Query Server to write network wide aggregate stats to
        Beringei database.

        Args:
        stats_to_write: list of node and aggregate stats to write, of type
                        UnifiedWriteRequest.

        Return:
        void on success. Raise exception on error.
        """

        try:
            self._post_http_request_to_beringei_query_server(
                stats_to_write, "unified_stats_writer"
            )
        except ValueError as err:
            logging.error(err.args)
            raise ValueError("Fail to write aggregate stats to Beringei database")