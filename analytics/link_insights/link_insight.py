#!/usr/bin/env python3

""" LinkInsight class provides methods to query stats, compute link
    insights, and write back the computed insights back to Beringei database.
"""

import numpy as np
import sys
import os
import json
import logging

# Include the API between BQS and Analytics
sys.path.append(
    os.path.abspath(os.path.join(os.path.dirname(__file__), "..") + "/interface/gen-py")
)
from facebook.gorilla.beringei_query import ttypes as bq
from facebook.gorilla.Topology.ttypes import Topology

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from module.beringei_db_access import BeringeiDbAccess


class LinkInsight(object):
    """Functions for link-level insight calculation. Data is obtained
       from Beringei database and the computed stats can be written back to
       Beringei database.
    """

    def __init__(self):
        # The increase speed of counter. The counter should increase by one
        # every bwgd (25.6 ms). The counter could be heartbeat, keepalive, bwreq,
        # or linkavailable.
        self.counter_speed_per_s = 1000 / 25.6

    def construct_query_request(
        self,
        topology_name,
        link_macs_list=None,
        metric_names=None,
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
        metric_names: a list of metric of interest, each element is
                      like "phystatus.ssnrest".
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
        query_request_to_send: query request to send, of type RawReadQueryRequest,
        can be viewed as a list of queries. When using "key_id" (as key_option) during
        debugging, each query has 1 query_key entry and corresponds to a Beringei
        key_id. When using "link_metric" option, each query corresponds to a link
        and each query can contain multiple query_keys. The query_keys are generated
        by each metric_name in metric_names and are index matched.
        """

        if end_ts is None or start_ts is None:
            logging.warning("Start/End time stamp not provided!")
            return bq.RawReadQueryRequest([])

        # Construct the queries to send, of type RawReadQueryRequest
        query_requests_to_send = []
        if key_option == "link_metric" and link_macs_list:
            for source_mac, peer_mac in link_macs_list:
                raw_query_keys = []
                for metric_name in metric_names:
                    raw_query_key = bq.RawQueryKey(
                        sourceMac=source_mac,
                        peerMac=peer_mac,
                        metricName=metric_name,
                        topologyName=topology_name,
                    )
                    raw_query_keys.append(raw_query_key)
                query_to_send = bq.RawReadQuery(
                    queryKeyList=raw_query_keys,
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
        sample_duration_in_s,
        source_db_interval,
        stats_query_timestamp,
        topology_name,
        dest_db_interval=30,
        metric_name=None,
    ):
        """Prepare computed link stats request to be send to Beringei Query Server
           for Beringei database writing.

        Args:
        computed_stats: computed link stats, 2-d list of computed stats. Need
                        to be index matched with the query_requests_to_send.
        query_requests_to_send: the query sent to the BQS, used for the macs
        and metric name creation during write requests generation.
        network_config: network config dictionary, have keys of
               "link_macs_to_name", "node_mac_to_name", and "node_mac_to_site".
        sample_duration_in_s: the duration of the stats read, for example 3600
            means link data of past 1 hour are used to computed the link stats.
        source_db_interval: interval of the Beringei database reading from.
        stats_query_timestamp: the time on which the link stats is computed.
        topology_name: name of the setup, like "tower G".
        dest_db_interval: indicates which Beringei database to write to.
        metric_name: if provided, will use it as the name prefix of the computed stats.
        If None, will use the metric_name from query_keys as name prefix of
        the computed stats.

        Return:
        stats_to_write: On success, stats to write to the Beringei database,
                        type StatsWriteRequest. Raise exception on error.
        """
        topology = Topology(name=topology_name)
        if topology is None:
            raise ValueError("Cannot create topology object")

        if len(computed_stats) != len(query_requests_to_send.queries):
            raise ValueError(
                "Computed stats length do not match that of query_requests"
            )

        query_agents = []
        for query_idx, query in enumerate(query_requests_to_send.queries):
            for key_idx in range(len(computed_stats[query_idx])):
                query_key = query.queryKeyList[key_idx]
                source_mac = query_key.sourceMac
                peer_mac = query_key.peerMac
                if metric_name is None:
                    metric_name = query_key.metricName
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

    def construct_network_stats_write_request(
        self,
        network_stats,
        sample_duration_in_s,
        source_db_interval,
        stats_query_timestamp,
        topology_name,
        fake_mac,
        dest_db_interval=30,
    ):
        # TODO: change descriptions
        """Prepare computed link stats request to be send to Beringei Query Server
           for Beringei database writing.

        Args:
        computed_stats: computed link stats, 2-d list of computed stats. Need
                        to be index matched with the query_requests_to_send.
        query_requests_to_send: the query sent to the BQS, used for the macs
        and metric name creation during write requests generation.
        network_config: network config dictionary, have keys of
               "link_macs_to_name", "node_mac_to_name", and "node_mac_to_site".
        sample_duration_in_s: the duration of the stats read, for example 3600
            means link data of past 1 hour are used to computed the link stats.
        source_db_interval: interval of the Beringei database reading from.
        stats_query_timestamp: the time on which the link stats is computed.
        topology_name: name of the setup, like "tower G".
        dest_db_interval: indicates which Beringei database to write to.
        metric_name: if provided, will use it as the name prefix of the computed stats.
        If None, will use the metric_name from query_keys as name prefix of
        the computed stats.

        Return:
        stats_to_write: On success, stats to write to the Beringei database,
                        type StatsWriteRequest. Raise exception on error.
        """
        topology = Topology(name=topology_name)
        if topology is None:
            raise ValueError("Cannot create topology object")

        stats_with_keys = []
        for network_stats_name in network_stats:
            # For each computed link insight, like "mean", "average"
            stats_with_key = bq.Stat(
                key=(
                    "{}.{}.{}.{}.{}".format(
                        "network",
                        topology_name.replace(" ", "_"),
                        network_stats_name,
                        sample_duration_in_s,
                        source_db_interval,
                    )
                ),
                ts=stats_query_timestamp,
                value=network_stats[network_stats_name],
            )
            stats_with_keys.append(stats_with_key)

        network_stats_agent = bq.NodeStates(
            # TODO: confirm all zero mac, we will use a fake mac now
            # once ... is ready. update here.
            # mac="00:00:00:00:00:00",
            mac=fake_mac,
            stats=stats_with_keys,
        )

        stats_to_write = bq.StatsWriteRequest(
            topology=topology, agents=[network_stats_agent], interval=dest_db_interval
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
        sample_duration_in_s: the duration of the stats read, for example 3600
            means link data of past 1 hour are used to computed the link stats.
        source_db_interval: interval of the Beringei database reading from.
        stats_query_timestamp: the time on which the link stats is computed.
        json_log_name: name of the output JSON file.

        Return:
        void: On success, write to the JSON file.
              Raise exception on error.
        """

        if len(computed_stats) != len(query_requests_to_send.queries):
            raise ValueError(
                "Computed stats length do not match that of query_requests"
            )

        output_dict = {}
        for query_idx, query in enumerate(query_requests_to_send.queries):
            per_query_dict = {}
            for key_idx in range(len(computed_stats[query_idx])):
                query_key = query.queryKeyList[key_idx]
                per_query_dict[key_idx] = {}
                per_link_stats = computed_stats[query_idx][key_idx]

                per_query_dict[key_idx]["source_mac"] = query_key.sourceMac
                per_query_dict[key_idx]["peer_mac"] = query_key.peerMac
                per_query_dict[key_idx]["metric_name"] = query_key.metricName
                if (query_key.sourceMac, query_key.peerMac) in network_config[
                    "link_macs_to_name"
                ]:
                    link_name = network_config["link_macs_to_name"][
                        query_key.sourceMac, query_key.peerMac
                    ]
                else:
                    link_name = network_config["link_macs_to_name"][
                        query_key.peerMac, query_key.sourceMac
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

    def match_values_list_by_timestamp(self, time_series_list, source_db_interval=30):
        """Match a list of timeseries. Each element is of type timeSeries and the
        each time series length can be different.

        Args:
        time_series_list: list of time_series.
        source_db_interval: the interval of the Beringei database being queried from.

        Return:
        matched_values_list: list of value lists, each list is a sub-list of values
                              that are of the same time_stamp.
        matched_time_stamps: time_stamps, index (length) matched with the
                             matched_values_list.
        Raise Exception if the input time_series_list is not a list of timeSeries.
        """

        logging.debug(
            "There are {} time series to match timestamp with".format(
                len(time_series_list)
            )
        )

        # List that maps the ts_idx to the sweep pointer index of the data points in
        # each of timeseries
        ts_idx_to_dp_idx = [0] * len(time_series_list)

        # Beringei will return time series with time stamps in ascending order.
        # Thus, the start_time is the max of the first data point of all
        # input time series. And the end_time is the minimum of the last data point
        # of all input time series.
        start_time = max(ts[0].unixTime for ts in time_series_list)
        end_time = min(ts[-1].unixTime for ts in time_series_list)

        matched_values_list = []
        matched_time_stamps = []
        for time_stamp in range(
            start_time, end_time + source_db_interval, source_db_interval
        ):
            values = []
            for ts_idx in range(len(time_series_list)):
                dp_idx = ts_idx_to_dp_idx[ts_idx]
                while dp_idx < len(time_series_list[ts_idx]):
                    if time_series_list[ts_idx][dp_idx].unixTime == time_stamp:
                        values.append(time_series_list[ts_idx][dp_idx].value)
                        ts_idx_to_dp_idx[ts_idx] += 1
                        break
                    elif time_series_list[ts_idx][dp_idx].unixTime < time_stamp:
                        ts_idx_to_dp_idx[ts_idx] += 1
                        dp_idx = ts_idx_to_dp_idx[ts_idx]
                    else:
                        # The pointed to value is large than the time_stamp skip
                        break

            if len(values) == len(time_series_list):
                matched_values_list.append(values)
                matched_time_stamps.append(time_stamp)

        return matched_values_list, matched_time_stamps

    def get_valid_windows(self, counters_list, time_stamps):
        """ Calculate the valid time windows by using the increment speed of
            heartbeat/keepalive/uplink_bwreq counters or "staPkt.linkAvailable"
            counters. Ideally, the sum of the heartbeat/keepalive/uplink_bwreq
            counters or "staPkt.linkAvailable" counters should increase at the
            speed of 25.6 ms per count.

            Args:
            counters_list: A list of counters elements. Each element can be
            a). a list of the counter values of heartbeat/keepalive/uplink_bwreq.
            b). a list of sub-lists each having a single element whose value being
            "staPkt.linkAvailable" counter.
            time_stamps: time_stamps, need to be index matched with counters_list.

            Return:
            valid_windows: list of valid windows, each element is of format
                           [start_time, end_time].
        """

        if len(counters_list) != len(time_stamps) or len(counters_list) == 1:
            # Note that it means if there is only 1 point in time_stamps/counter_sums,
            # return will be empty list due to unable to check uptime from counter delta
            return []

        counter_sums = [sum(counters) for counters in counters_list]

        current_start_idx = 0
        valid_windows = []
        # Do a sweep from left to right, the counter_sum value is expected
        # to increase over time at speed of 25.6 ms per count.
        while current_start_idx < len(time_stamps) - 1:
            current_idx = current_start_idx + 1
            while current_idx < len(time_stamps):
                # The algorithm will make sure than the delta counter to its right
                # neighbor matches with the expected one, we start from left to right
                # TODO: Currently, due to stats pipeline glitches, we consider the
                # interval between two neighbor data points whose delta counter is
                # positive to be valid. After stats pipeline is updated, we should
                # compute the counter increase speed between two neighbor points to
                # determine valid windows.
                if counter_sums[current_idx] - counter_sums[current_idx - 1] > 0:
                    current_idx += 1
                else:
                    break

            current_idx -= 1
            if current_idx > current_start_idx:
                valid_windows.append(
                    [time_stamps[current_start_idx], time_stamps[current_idx]]
                )
            current_start_idx = current_idx + 1

        return valid_windows

    def compute_single_traffic_stats(
        self, packet_counters_list, time_stamps, valid_windows, minimum_packet_number=50
    ):
        """Compute the traffic stats from the packet ok/fail counters. Only traffic
           during the valid windows will be considered.

        Args:
        packet_counters_list: list of packet counter lists, each packet counter list is
                              [tx_ok_counter, tx_fail_counter].
        time_stamps: the timestamps of the packet_counters_list, need to be index
                     matched.
        valid_windows: The valid windows are computed by link uptime via
                       get_valid_windows().
        minimum_packet_number: the minimum number of packets needed to compute link
        traffic stats. If not enough packets counts are reported, do not compute
        traffic insights.

        Return:
        output_stats: a dict with computed traffic insights name as keys.
        """

        time_stamp_to_packet_counters = {}
        for time_stamp_idx, time_stamp in enumerate(time_stamps):
            packet_counter = {}
            packet_counter["ok"] = packet_counters_list[time_stamp_idx][0]
            packet_counter["fail"] = packet_counters_list[time_stamp_idx][1]
            time_stamp_to_packet_counters[time_stamp] = packet_counter

        output_stats = {"ok_counter": 0, "fail_counter": 0, "valid_duration_in_s": 0}
        for start_timestamp, end_timestamp in valid_windows:
            output_stats["ok_counter"] += (
                time_stamp_to_packet_counters[end_timestamp]["ok"]
                - time_stamp_to_packet_counters[start_timestamp]["ok"]
            )
            output_stats["fail_counter"] += (
                time_stamp_to_packet_counters[end_timestamp]["fail"]
                - time_stamp_to_packet_counters[start_timestamp]["fail"]
            )
            output_stats["valid_duration_in_s"] += end_timestamp - start_timestamp

        total_packets_num = output_stats["ok_counter"] + output_stats["fail_counter"]
        if total_packets_num > minimum_packet_number:
            # Only compute the traffic stats if enough samples are obtained
            output_stats["PER"] = output_stats["fail_counter"] / total_packets_num
            output_stats["PPS"] = (
                output_stats["ok_counter"] / output_stats["valid_duration_in_s"]
            )

        return output_stats

    def compute_traffic_stats(self, metric_names, read_returns):
        """ Compute the traffic stats of links based on the read returns of
            link stats on "mgmttx.uplinkbwreq", "mgmttx.keepalive", "mgmttx.heartbeat" ,
            "stapkt.txok", "stapkt.txfail".

            Args:
            metric_names: name of the stats queried of each link. The sequence
            needs to be index matched to that of read query sent to BQS.
            read_returns: the read return from BQS, of type RawQueryReturn.

            Return:
            traffic_stats_returns: a 2-D list of stats. Each sub-list is of length 1
            and contain a dict which maps traffic insight key_names to computed values.
            Raise exception on error.
        """

        name_to_idx = {metric: idx for idx, metric in enumerate(metric_names)}
        if (
            "mgmttx.uplinkbwreq" not in name_to_idx
            or "mgmttx.keepalive" not in name_to_idx
            or "mgmttx.heartbeat" not in name_to_idx
            or "stapkt.txok" not in name_to_idx
            or "stapkt.txfail" not in name_to_idx
        ):
            raise ValueError("Not all needed metrics are queried")

        traffic_stats_returns = []
        for query_return in read_returns.queryReturnList:
            query_return = query_return.timeSeriesAndKeyList
            # check the length should be equal
            uplink_bwreq_return = query_return[name_to_idx["mgmttx.uplinkbwreq"]]
            keepalive_return = query_return[name_to_idx["mgmttx.keepalive"]]
            heartbeat_return = query_return[name_to_idx["mgmttx.heartbeat"]]
            tx_ok_return = query_return[name_to_idx["stapkt.txok"]]
            tx_fail_return = query_return[name_to_idx["stapkt.txfail"]]

            try:
                values_list, time_stamps = self.match_values_list_by_timestamp(
                    [
                        uplink_bwreq_return.timeSeries,
                        keepalive_return.timeSeries,
                        heartbeat_return.timeSeries,
                        tx_ok_return.timeSeries,
                        tx_fail_return.timeSeries,
                    ],
                    source_db_interval=30,
                )
            except BaseException as err:
                raise ValueError(
                    "Error during match_values_list_by_timestamp():", err.args
                )

            counters_list = [counters[:3] for counters in values_list]
            valid_windows = self.get_valid_windows(counters_list, time_stamps)

            packet_counters_list = [counters[3:] for counters in values_list]
            traffic_stats = self.compute_single_traffic_stats(
                packet_counters_list, time_stamps, valid_windows
            )

            traffic_stats_returns.append([traffic_stats])

        return traffic_stats_returns

    def compute_link_available(self, metric_names, read_returns):
        """ Compute the link available times by using the "stapkt.linkavailable" counters.
            Currently, to workaround stats pipeline glitches, we use the
            link mgmttx counters and the computed link uptime valid windows. Please see
            compute_single_link_available_stats() for detailed algorithm.

            Args:
            metric_names: name of the stats queried of each link. The sequence
            needs to be index matched to that of read query sent to BQS.
            read_returns: the read return from BQS, of type RawQueryReturn.

            Return:
            available_stats_returns: a 2-D list of stats. Each sub-list is of length 1
            and contain a dict which maps link available insight key_names to
            computed values. Raise except on error.
        """

        available_stats_returns = []
        name_to_idx = {metric: idx for idx, metric in enumerate(metric_names)}
        if (
            "stapkt.linkavailable" not in name_to_idx
            or "mgmttx.uplinkbwreq" not in name_to_idx
            or "mgmttx.keepalive" not in name_to_idx
            or "mgmttx.heartbeat" not in name_to_idx
        ):
            raise ValueError("Not all needed metrics are queried")

        for per_link_return in read_returns.queryReturnList:
            per_link_return = per_link_return.timeSeriesAndKeyList

            uplink_bwreq_return = per_link_return[name_to_idx["mgmttx.uplinkbwreq"]]
            keepalive_return = per_link_return[name_to_idx["mgmttx.keepalive"]]
            heartbeat_return = per_link_return[name_to_idx["mgmttx.heartbeat"]]
            link_alive_return = per_link_return[name_to_idx["stapkt.linkavailable"]]

            try:
                values_list, time_stamps = self.match_values_list_by_timestamp(
                    [
                        link_alive_return.timeSeries,
                        uplink_bwreq_return.timeSeries,
                        keepalive_return.timeSeries,
                        heartbeat_return.timeSeries,
                    ],
                    source_db_interval=30,
                )
            except BaseException as err:
                raise ValueError(
                    "Error during match_values_list_by_timestamp():", err.args
                )

            mgmt_counters_list = [counters[1:4] for counters in values_list]
            link_alive_counters = [counters[0] for counters in values_list]

            available_stats = self.compute_single_link_available_stats(
                link_alive_counters, mgmt_counters_list, time_stamps
            )

            available_stats_returns.append([available_stats])

        return available_stats_returns

    def compute_single_link_available_stats(
        self, link_alive_counters, mgmt_counters_list, time_stamps
    ):
        """
        Compute the link available time based on the "stapkt.linkavailable" time series.
        Currently, due to stats pipeline glitches, there can be drift in
        the report time series values. To compensate, we use the following
        algorithm: Using mgmttx counters (heartbeat/keepalive/bwreq) to compute the
        link uptime windows [[t_start_0, t_end_0], ... , [t_start_n, t_end_n]].
        For each link_uptime window, we compute the link available duration by
        calculating the link unavailable duration. The link unavailable time in
        Window i is obtained by using the delta of the following two delta stats:
        a). mgmttx counters delta, delta_mgmtx_i b). linkavailable counters delta
        (delta_link_alive_i).
        In summary, the total link available time now is computed as
        \sum_{i}[(t_end_i - t_start_i) -
                 max(0, delta_mgmtx_i - delta_link_alive_i)/speed], where speed
        is the counter increasing speed.

        Args:
        link_alive_counters: list of linkAvailable counter values, index matched with
        mgmt_counters_list, time_stamps.
        mgmt_counters_list: list of mgmttx counter list, each counter list is of length
        3 with each element being heartbeat/bwreq/keepalive counter value. Need to be
        index matched with link_alive_counters, time_stamps.
        time_stamps: the timestamps of the counter values, index matched with
        link_alive_counters, mgmt_counters_list.

        Return:
        output_stats: a dict with computed link available insights name as keys.
        """

        link_uptime_windows = self.get_valid_windows(mgmt_counters_list, time_stamps)

        output_stats = {"link_available_time": 0, "link_uptime": 0}

        time_stamp_to_available_counters = {}
        time_stamp_to_mgmt_counters = {}
        for time_stamp_idx, time_stamp in enumerate(time_stamps):
            time_stamp_to_available_counters[time_stamp] = link_alive_counters[
                time_stamp_idx
            ]
            time_stamp_to_mgmt_counters[time_stamp] = sum(
                mgmt_counters_list[time_stamp_idx]
            )

        for start_timestamp, end_timestamp in link_uptime_windows:
            delta_mgmt = (
                time_stamp_to_mgmt_counters[end_timestamp]
                - time_stamp_to_mgmt_counters[start_timestamp]
            )
            delta_link_alive = (
                time_stamp_to_available_counters[end_timestamp]
                - time_stamp_to_available_counters[start_timestamp]
            )
            output_stats["link_uptime"] += end_timestamp - start_timestamp
            output_stats["link_available_time"] += (
                end_timestamp - start_timestamp
            ) - max(delta_mgmt - delta_link_alive, 0) / self.counter_speed_per_s

        return output_stats

    def write_network_wide_stats_to_beringei(self):
        return None

    def get_link_health_num(self, extracted_stats, sample_duration_in_s):
        """ TODO
        """
        # TODO: better names???
        network_health_stats = {"green_link": 0, "amber_link": 0, "red_link": 0}
        if "link_available_time" not in extracted_stats:
            logging.warning("There is no link available time reported for any link")
            return network_health_stats

        green_amber_cutoff = sample_duration_in_s * 0.95
        amber_lower_cutoff = sample_duration_in_s * 0.75
        red_upper_cutoff = sample_duration_in_s * 0.45

        unclassified_link = 0
        for link_available_time in extracted_stats["link_available_time"]:
            if link_available_time >= green_amber_cutoff:
                network_health_stats["green_link"] += 1
            elif link_available_time >= amber_lower_cutoff:
                network_health_stats["amber_link"] += 1
            elif link_available_time < red_upper_cutoff:
                network_health_stats["red_link"] += 1
            else:
                unclassified_link += 1

        if unclassified_link:
            logging.warning("There are {} links with ".format(unclassified_link)
                            + "available time are unclassified")

        return network_health_stats
