#!/usr/bin/env python3

""" LinkInsight class provides methods to query stats, compute link
    mean/variance, and write back the computed stats back to Beringei database.
"""

import numpy as np
import sys
import os
import json
import time
import logging

# Include the API between BQS and Analytics
sys.path.append(
    os.path.abspath(os.path.join(os.path.dirname(__file__), "..") + "/interface/gen-py")
)
from facebook.gorilla.beringei_query import ttypes as bq
from facebook.gorilla.Topology.ttypes import Topology

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from module.topology_handler import TopologyHelper
from module.beringei_db_access import BeringeiDbAccess


class LinkInsight(object):
    """Functions for link-level insight calculation. Data is obtained
       from Beringei database and the computed stats can be written back to
       Beringei database.
    """

    def _check_dimension_matched(self, computed_stats, query_requests_to_send):
        """ Check to make sure that the computed_stats and query_requests_to_send
            are two dimension-matched 2-d lists.

            Args:
            computed_stats: a 2-d list, is index matched with the query_returns,
                            and is computed by method of compute_timeseries_avg_and_var.
            query_requests_to_send: the query requests sent to the BQS.

            Return:
            If dimensions are matched, return True; else, return False.
        """
        if len(query_requests_to_send.queries) != len(computed_stats):
            logging.error(
                "Send {} queries, ".format(len(query_requests_to_send.queries)),
                "have {} processed lists".format(len(computed_stats)),
            )
            return False

        for query_idx, query in enumerate(query_requests_to_send.queries):
            if len(query.queryKeyList) != len(computed_stats[query_idx]):
                logging.error(
                    "For query # {}, send {} keys, have {} processed elements".format(
                        query_idx,
                        len(query.queryKeyList),
                        len(computed_stats[query_idx]),
                    )
                )
                return False

        return True

    def construct_query_request(
        self,
        topology_name,
        link_macs_list=None,
        metric_name=None,
        key_option="link_metric",
        key_ids=None,
        start_ts=None,
        end_ts=None,
        source_db_interval=30,
    ):
        """Prepare query request by a). key_id or b). link_macs and metric_name. The
           constructed queries are sent to Beringei Query Server for raw stats
           reading by BeringeiDbAccess.read_beringei_db.

        Args:
        topology_name: name of the setup, like "tower G".
        link_macs_list: list of Beringei link mac pairs,
                        each element is (source_mac, peer_mac).
        metric_string: metric of interest, like "phystatus.ssnrest".
        key_option: Can be either "link_metric" or "key_id".
                    On "link_metric", use the key metric, link_macs, and
                    topology_name to identify the right time series.
                    On "key_id", use key_ids.
        key_ids: list of Beringei metric key_ids or dict with keys being key_ids,
                 only used if key_option is "key_id".
        start_ts: query window left range.
        end_ts: query window right range.
        source_db_interval: the interval of the Beringei database that holds the
                            raw data.

        Return:
        query_request_to_send: query request to send, of type RawReadQueryRequest.
        """

        if end_ts is None or start_ts is None:
            logging.warning("Start/End time stamp not provided!")
            bq.RawReadQueryRequest([])

        # Construct the queries to send
        query_requests_to_send = []
        if key_option == "link_metric" and link_macs_list:
            for source_mac, peer_mac in link_macs_list:
                raw_query_key = bq.RawQueryKey(
                    sourceMac=source_mac,
                    peerMac=peer_mac,
                    metricName=metric_name,
                    topologyName=topology_name,
                )
                query_to_send = bq.RawReadQuery(
                    queryKeyList=[raw_query_key],
                    startTimestamp=start_ts,
                    endTimestamp=end_ts,
                    interval=source_db_interval,
                )
                query_requests_to_send.append(query_to_send)
        elif key_option == "key_id" and key_ids:
            for key_id in key_ids:
                raw_query_key = bq.RawQueryKey(keyId=key_id)
                query_to_send = bq.RawReadQuery(
                    queryKeyList=[raw_query_key],
                    startTimestamp=start_ts,
                    endTimestamp=end_ts,
                    interval=source_db_interval,
                )
                query_requests_to_send.append(query_to_send)
        else:
            logging.warning("Nothing to query")

        # Generate the query list to send
        query_request_to_send = bq.RawReadQueryRequest(query_requests_to_send)

        return query_request_to_send

    def construct_write_request(
        self,
        computed_stats,
        query_requests_to_send,
        network_config,
        metric_name,
        sample_duration_in_s,
        source_db_interval,
        stats_query_timestamp,
        topology_name,
        dest_db_interval=30,
    ):
        """Prepare computed link stats request to be send to Beringei Query Server
           for Beringei database writing.

        Args:
        computed_stats: computed link stats, 2-d list of computed stats. Need
                        to be index matched with the query_requests_to_send.
        query_requests_to_send: the query sent to the BQS, used for the macs
                                and metric name creation during write requests
                                generation.
        network_config: network config dictionary, have keys of
               "link_macs_to_name", "node_mac_to_name", and "node_mac_to_site".
        metric_name: name of the metric to query, like "phystatus.ssnrest".
        sample_duration_in_s: the duration of the stats read, for example 3600
            means link data of past 1 hour are used to computed the link stats.
        source_db_interval: interval of the Beringei database reading from.
        stats_query_timestamp: the time on which the link stats is computed.
        topology_name: name of the setup, like "tower G".
        dest_db_interval: indicates which Beringei database to write to.

        Return:
        stats_to_write: On success, stats to write to the Beringei database,
                        type StatsWriteRequest. Raise exception on error.
        """
        topology = Topology(name=topology_name)
        if topology is None:
            raise ValueError("Cannot create topology object")

        if not self._check_dimension_matched(computed_stats, query_requests_to_send):
            raise ValueError("Computed stats index do not match that of query_requests")

        query_agents = []
        for query_idx, query in enumerate(query_requests_to_send.queries):
            for key_idx, query_key in enumerate(query.queryKeyList):
                source_mac = query_key.sourceMac
                peer_mac = query_key.peerMac
                source_site = network_config["node_mac_to_site"][source_mac]
                source_name = network_config["node_mac_to_name"][source_mac]
                per_link_stats = computed_stats[query_idx][key_idx]

                if per_link_stats is None:
                    logging.warning(
                        "Skipping link between {} and {} due to no stats".format(
                            source_mac, peer_mac
                        )
                    )
                    continue

                for computed_metric in per_link_stats:
                    # For each computed link insight, like "mean", "average"
                    stats_with_key = bq.Stat(
                        key=(
                            "{}.{}.{}.{}.{}".format(
                                peer_mac,
                                metric_name,
                                computed_metric,
                                sample_duration_in_s,
                                source_db_interval,
                            )
                        ),
                        ts=stats_query_timestamp,
                        value=per_link_stats[computed_metric],
                    )
                    node_state_to_write = bq.NodeStates(
                        mac=source_mac,
                        site=source_site,
                        name=source_name,
                        stats=[stats_with_key],
                    )
                    query_agents.append(node_state_to_write)

        stats_to_write = bq.StatsWriteRequest(
            topology=topology, agents=query_agents, interval=dest_db_interval
        )
        return stats_to_write

    def compute_timeseries_avg_and_var(self, query_returns):
        """Compute the link metric average and variance.

        Args:
        query_returns: query returned results, type RawQueryReturn.

        Return:
        computed_stats: a 2-d list, is index matched with the input, query_returns.
                        Each sub-list is the computed stats list of a query
                        return of a RawReadQuery.
                        Each element of the sub-list is the computed stats from
                        a single RawQueryKey. Each element is of type dict, with
                        keys of "num_data_points", "variance", "mean".
        """

        computed_stats = []
        num_no_report_time_series = 0
        num_of_query_keys = 0
        for query_return in query_returns.queryReturnList:
            per_query_stats = []
            for time_series_and_key in query_return.timeSeriesAndKeyList:
                num_of_query_keys += 1
                per_link_stats = {}
                reported_values = [
                    time_value_pair.value
                    for time_value_pair in time_series_and_key.timeSeries
                ]

                # Generate the link status of each link
                per_link_stats["num_data_points"] = len(reported_values)
                if reported_values:
                    # If there is data report for the query_key, get
                    # the mean and variance
                    per_link_stats["variance"] = np.var(reported_values)
                    per_link_stats["mean"] = np.mean(reported_values)
                else:
                    num_no_report_time_series += 1

                per_query_stats.append(per_link_stats)
            computed_stats.append(per_query_stats)

        logging.info(
            "{} out of {} query keys do not have any report".format(
                num_no_report_time_series, num_of_query_keys
            )
        )

        return computed_stats

    def dump_link_stats_to_json(
        self,
        computed_stats,
        query_requests_to_send,
        network_config,
        metric_name,
        sample_duration_in_s,
        source_db_interval,
        stats_query_timestamp,
        json_log_name="sample_log.json",
    ):
        """Dump a copy of computed link insights to JSON file, can be used for
           offline plotting or debugging.

        Args:
        computed_stats: 2-d list of computed stats. Need to be index matched
                        with the query_requests_to_send.
        query_requests_to_send: the query sent to the BQS, used to find the macs
                                and metric name of each query_key.
        network_config: network config dictionary, have keys of
               "link_macs_to_name", "node_mac_to_name", and "node_mac_to_site".
        metric_name: name of the metric of the query, like "phystatus.ssnrest".
        sample_duration_in_s: the duration of the stats read, for example 3600
            means link data of past 1 hour are used to computed the link stats.
        source_db_interval: interval of the Beringei database reading from.
        stats_query_timestamp: the time on which the link stats is computed.
        json_log_name: name of the output JSON file.

        Return:
        void: On success, write to the JSON file.
              Raise exception on error.
        """

        if not self._check_dimension_matched(computed_stats, query_requests_to_send):
            raise ValueError("Computed stats index do not match that of query_requests")

        output_dict = {}
        for query_idx, query in enumerate(query_requests_to_send.queries):
            per_query_dict = {}
            for key_idx, query_key in enumerate(query.queryKeyList):
                per_query_dict[key_idx] = {}
                per_link_stats = computed_stats[query_idx][key_idx]

                per_query_dict[key_idx]["source_mac"] = query_key.sourceMac
                per_query_dict[key_idx]["peer_mac"] = query_key.peerMac
                per_query_dict[key_idx]["metric_name"] = metric_name
                link_name = network_config["link_macs_to_name"][
                    query_key.sourceMac, query_key.peerMac
                ]
                per_query_dict[key_idx]["link_name"] = link_name
                source_site = network_config["node_mac_to_site"][query_key.sourceMac]
                per_query_dict[key_idx]["source_site"] = source_site
                source_name = network_config["node_mac_to_name"][query_key.sourceMac]
                per_query_dict[key_idx]["source_name"] = source_name
                per_query_dict[key_idx]["source_db_interval"] = source_db_interval
                per_query_dict[key_idx]["stats_query_timestamp"] = stats_query_timestamp
                per_query_dict[key_idx]["sample_duration_in_s"] = sample_duration_in_s

                for computed_metric in per_link_stats:
                    per_query_dict[key_idx][computed_metric] = per_link_stats[
                        computed_metric
                    ]
            output_dict[query_idx] = per_query_dict

        logging.info("Logging to " + json_log_name)

        try:
            with open(json_log_name, "w", encoding="utf-8") as jsonfile:
                json.dump(
                    output_dict,
                    jsonfile,
                    sort_keys=True,
                    indent=4,
                    separators=(",", ": "),
                )
        except Exception:
            logging.error("Cannot open JSON file to write")

    def get_network_wide_link_key_id_by_metric(
        self, topology_name, metric, network_config, key_prefix="tgf"
    ):
        """Send query to Beringei Query Server for metrics Beringei key_ids.
           This function is used for debugging. For formal link insight computation,
           use ConstructQueryRequest and provide metric information
           (source_mac, peer_mac, topology_name, metric_name)
           to Beringei Query Server, which is also much faster.

        Args:
        topology_name: name of the setup, like "tower G".
        metric: metric to query, like 'phystatus.ssnrest'.
        network_config: network config dictionary, have keys of
               "link_macs_to_name", "node_mac_to_name", and "node_mac_to_site".
        key_prefix: prefix of the metric, like "tgf", "tgd", "link".

        Return:
        key_id_to_macs: dict from link metric key_id to link_macs, which is the
                        tuple of (source_mac, peer_mac), on success.
                        On error, return empty dict.
        """

        # Construct the Beringei database key_id to link macs via BQS,
        # the link macs is the tuple of (source_mac, peer_mac)
        beringei_db_access = BeringeiDbAccess()
        if beringei_db_access is None:
            logging.error("Fail to create BeringeiDbAccess object")
            return {}

        key_id_to_macs = {}
        num_links = len(network_config["link_macs_to_name"].keys())
        logging.info("In total, {} links to find key_ids".format(num_links))
        for source_mac, peer_mac in network_config["link_macs_to_name"].keys():

            full_key = key_prefix + "." + peer_mac + "." + metric

            # Construct requests to send to obtain Beringei key_id
            type_ahead_request = bq.TypeAheadRequest(
                topologyName=topology_name, input=full_key
            )

            # Read key_id via Beringei Query Server
            try:
                return_key_id = beringei_db_access.get_beringei_key_id(
                    source_mac, type_ahead_request
                )
            except ValueError as err:
                logging.exception("Get Beringei key_id error")
                return {}

            key_id_to_macs[return_key_id] = (source_mac, peer_mac)
        return key_id_to_macs
