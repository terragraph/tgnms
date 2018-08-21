#!/usr/bin/env python3

""" LinkInsight class provides methods to query stats, compute link mean/variance,
    PPS, PER, link health and write back the processed stats back to Beringei database.
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
from module.unit_converter import UnitConverter


class LinkInsight(object):
    """Functions for link-level insight calculation. Data is obtained
       from Beringei database and the computed stats can be written back to
       Beringei database.
    """

    # The increase speed of counter. The counter should increase by one
    # every bwgd (25.6 ms). The counter could be heartbeat, keepalive, bwreq,
    # or linkavailable.
    COUNTER_SPEED_PER_S = 1000 / 25.6

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
        metric_names: a list of metric of interest, like "phyStatus.ssnrEst".
        key_option: Can be either "link_metric" or "key_id".
                    If key_option equals "link_metric", use the metric_names, link_macs,
                    and topology_name to identify the right time series.
                    If key_option equals "key_id", use key_ids.
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
                    metric_name = metric_name.lower()
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

    def construct_node_write_request(
        self,
        computed_stats,
        query_requests_to_send,
        network_config,
        sample_duration_in_s,
        source_db_interval,
        stats_query_timestamp,
        dest_db_intervals,
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
        dest_db_intervals: indicates the Beringei databases to write to.
        metric_name: if provided, will use it as the name prefix of the computed stats.
        (For example, for SNR link mean write request construction, we only want the
        mean computed from the "phystatus.ssnr" not "stapkt.mcs".)
        If None, will use the metric_name from query_keys as name prefix of
        the computed stats.

        Return:
        stats_to_write: On success, stats to write to the Beringei database,
                        type UnifiedWriteRequest. Raise exception on error.
        """

        if len(computed_stats) != len(query_requests_to_send.queries):
            raise ValueError(
                "Computed stats length does not match that of query_requests"
            )

        node_stats = []
        for query_idx, query in enumerate(query_requests_to_send.queries):
            for key_idx in range(len(computed_stats[query_idx])):
                query_key = query.queryKeyList[key_idx]
                source_mac = query_key.sourceMac
                peer_mac = query_key.peerMac
                if metric_name is None:
                    metric_name = query_key.metricName
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
                    node_stat_to_write = bq.NodeStats(
                        mac=source_mac, stats=[stats_with_key]
                    )
                    node_stats.append(node_stat_to_write)

        stats_to_write = bq.UnifiedWriteRequest(
            intervals=dest_db_intervals, nodeStats=node_stats
        )
        return stats_to_write

    def construct_network_stats_write_request(
        self,
        network_stats,
        sample_duration_in_s,
        source_db_interval,
        stats_query_timestamp,
        topology_name,
        dest_db_intervals,
    ):
        """Prepare the network stats (aggregate stats) for writing to Beringei database.

        Args:
        network_stats: computed network stats, a dict.
        sample_duration_in_s: the duration of the stats read, for example 3600
            means link data of past 1 hour are used to computed the stats.
        source_db_interval: interval of the Beringei database reading from.
        stats_query_timestamp: the time at which the link stats is computed.
        topology_name: name of the setup, like "tower G".
        dest_db_intervals: indicates the Beringei databases to write to.

        Return:
        stats_to_write: On success, stats to write to the Beringei database,
                        type UnifiedWriteRequest. Raise exception on error.
        """
        topology = Topology(name=topology_name)
        if topology is None:
            raise ValueError("Cannot create topology object")

        stats_with_keys = []
        for network_stats_name in network_stats:
            # For each computed network insight, like "num_green_links"
            key_name = "{}.{}.{}.{}.{}".format(
                "network",
                topology_name.lower().replace(" ", "_"),
                network_stats_name,
                sample_duration_in_s,
                source_db_interval,
            )
            stats_with_key = bq.Stat(
                key=key_name,
                ts=stats_query_timestamp,
                value=network_stats[network_stats_name],
            )
            stats_with_keys.append(stats_with_key)

        agg_stat = bq.AggStats(topologyName=topology_name, stats=stats_with_keys)

        stats_to_write = bq.UnifiedWriteRequest(
            intervals=dest_db_intervals, aggStats=[agg_stat]
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
                "Computed stats length does not match that of query_requests"
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
                key_id_to_macs[return_key_id] = (source_mac, peer_mac)
            except ValueError as err:
                logging.exception("Get Beringei key_id error")

        return key_id_to_macs

    def match_values_list_by_timestamp(self, time_series_list, source_db_interval=30):
        """Match a list of timeseries so that the values are time aligned. Each element
        is of type timeSeries and each time series length can be different.

        Args:
        time_series_list: list of time_series, each time series is of type timeSeries.
        source_db_interval: the interval of the Beringei database being queried from.

        Return:
        matched_values_list: 2-D list of values. Each element of matched_values_list
                             is a list of values. matched_values_list only contains list
                             of values if all of the time_series_list entries have
                             values at a given timestamp - otherwise the values
                             are dropped.
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

        matched_values_list = []
        matched_time_stamps = []

        for ts in time_series_list:
            if not ts:
                return matched_values_list, matched_time_stamps

        # Beringei will return time series with time stamps in ascending order.
        # Thus, the start_time is the max of the first data point of all
        # input time series. And the end_time is the minimum of the last data point
        # of all input time series.
        start_time = max(ts[0].unixTime for ts in time_series_list)
        end_time = min(ts[-1].unixTime for ts in time_series_list)

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

    def get_uptime_windows(self, counters_list, time_stamps, sampling_start_time=0):
        """ Calculate a list of event pairs where each event pair is identified by the
            start and end times over which the link is up. Ideally, the sum of the
            heartbeat/keepalive/uplink_bwreq counters increases by one per
            bwgd (25.6 ms).

            Args:
            counters_list: A list of mgmttx counters. Each counters is a list of
            the counter values of [heartbeat, keepalive, uplink_bwreq].
            time_stamps: time_stamps, need to be index matched with counters_list.
            sampling_start_time: start time (unix time in seconds) of the queried stats.

            Return:
            valid_windows: list of valid windows, each element is of format
                           [start_time, end_time].
        """

        # This algorithm sweeps from right to left, and computes the start time of
        # each datapoint by using 2X of the counter speed and reported counter value.
        # On database side, this assumes: a). The reported counter value is always
        # correct; (only time can be wrong) b). The time drift is always towards future
        # bins, not past bins.
        # On counter increasing speed side, this algorithm takes account of the
        # following current issue: if there is retransmission, the mgmttx counter can
        # increases by two per bwgd. (Normally, without re-transmission, should increase
        # one per bwgd)

        if not counters_list or len(counters_list) != len(time_stamps):
            return []

        counter_sums = [sum(counters) for counters in counters_list]

        valid_windows = []
        # Sweep the reported counters from right to left. For each point, determine
        # the start time of the current window by:
        #   time_stamp - counter_sum / (COUNTER_SPEED_PER_S * 2)
        # Notice that this can lead to two link flap reports for a single link flap.
        # Condition: a). There is no re-transmission before the first two counter
        # reports (i.e., mgmttx counter increases by one per bwgd);
        # b). The sampling point is not perfectly aligned with the link come back
        # (i.e., the mgmttx counter stats report sampling point is off , compared
        # to the moment that link come back, by at least one bwgd).
        # Result: for each link flap, two valid windows are output by the algorithm
        # Example: link come back at time 0
        # Sampling at 15, 45, 75 , ...
        # The counter samples are [15 * speed, 45 * speed, 75 * speed]
        # The calculated windows are [floor(7.5), 15] and [floor(22.5), ...]
        current_idx = len(time_stamps) - 1
        current_start_time = None
        current_end_time = None
        while current_idx >= 0:
            if (
                current_end_time is None
                or time_stamps[current_idx] < current_start_time
            ):
                if current_end_time and current_end_time > current_start_time:
                    valid_windows.append([current_start_time, current_end_time])
                current_end_time = time_stamps[current_idx]

            current_start_time = max(
                sampling_start_time,
                np.floor(
                    time_stamps[current_idx]
                    - (counter_sums[current_idx] / (self.COUNTER_SPEED_PER_S * 2))
                ),
            )

            current_idx -= 1

        if current_end_time and current_end_time > current_start_time:
            valid_windows.append([current_start_time, current_end_time])

        # Make the valid windows to be in ascending orders.
        valid_windows = valid_windows[::-1]

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
                       get_uptime_windows().
        minimum_packet_number: the minimum number of packets needed to compute link
        traffic stats. If not enough packets counts are reported, do not compute
        traffic insights.

        Return:
        output_stats: a dict with computed traffic insights name as keys.
        """

        # If there are many valid windows (i.e., frequent link resets), we can
        # implement an interval tree and sweep packet counters from left to right.
        # However, since there should only be few valid windows during the sampling
        # period, the following should be of lower complexity.

        output_stats = {"ok_counter": 0, "fail_counter": 0, "link_up_duration_in_s": 0}
        tx_counter_duration = 0
        min_ts_idx = 0
        for start_time, end_time in valid_windows:
            output_stats["link_up_duration_in_s"] += end_time - start_time
            for ts_idx in range(min_ts_idx, len(time_stamps) - 1):
                if time_stamps[ts_idx] > end_time:
                    min_ts_idx = ts_idx
                    break
                elif (
                    start_time <= time_stamps[ts_idx] < end_time
                    and start_time < time_stamps[ts_idx + 1] <= end_time
                ):
                    output_stats["ok_counter"] += (
                        packet_counters_list[ts_idx + 1][0]
                        - packet_counters_list[ts_idx][0]
                    )
                    output_stats["fail_counter"] += (
                        packet_counters_list[ts_idx + 1][1]
                        - packet_counters_list[ts_idx][1]
                    )
                    tx_counter_duration += time_stamps[ts_idx + 1] - time_stamps[ts_idx]

        total_packet_num = output_stats["ok_counter"] + output_stats["fail_counter"]
        if total_packet_num > minimum_packet_number and tx_counter_duration:
            # Only compute the traffic stats if enough samples are obtained
            output_stats["PER"] = output_stats["fail_counter"] / total_packet_num
            output_stats["PPS"] = total_packet_num / tx_counter_duration

        return output_stats

    def compute_per_pps(self, metric_names, read_returns, sampling_start_time):
        """ Compute the traffic stats of links based on the read returns of
            link stats on "mgmttx.uplinkbwreq", "mgmttx.keepalive", "mgmttx.heartbeat" ,
            "stapkt.txok", "stapkt.txfail".

            Args:
            metric_names: name of the stats queried of each link. The sequence
            needs to be index matched to that of read query sent to BQS.
            read_returns: the read return from BQS, of type RawQueryReturn.
            sampling_start_time: start time (unix time in seconds) of the queried stats.

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
                counters_list, counter_ts = self.match_values_list_by_timestamp(
                    [
                        uplink_bwreq_return.timeSeries,
                        keepalive_return.timeSeries,
                        heartbeat_return.timeSeries,
                    ],
                    source_db_interval=30,
                )
                packet_list, packet_ts = self.match_values_list_by_timestamp(
                    [tx_ok_return.timeSeries, tx_fail_return.timeSeries],
                    source_db_interval=30,
                )
            except BaseException as err:
                raise ValueError(
                    "Error during match_values_list_by_timestamp(): {}".format(err.args)
                )

            valid_windows = self.get_uptime_windows(
                counters_list, counter_ts, sampling_start_time=sampling_start_time
            )
            traffic_stats = self.compute_single_traffic_stats(
                packet_list, packet_ts, valid_windows
            )

            traffic_stats_returns.append([traffic_stats])

        return traffic_stats_returns

    def compute_link_available(self, metric_names, read_returns, sampling_start_time):
        """ Compute the link available times by using the "stapkt.linkavailable" counters.
            Currently, to workaround stats pipeline glitches, we use the
            link mgmttx counters and the computed link uptime valid windows. Please see
            compute_single_link_available_stats() for the detailed algorithm.

            Args:
            metric_names: name of the stats queried of each link. The sequence
            needs to be index matched to that of read query sent to BQS.
            read_returns: the read return from BQS, of type RawQueryReturn.
            sampling_start_time: start time (unix time in seconds) of the queried stats.

            Return:
            available_stats_returns: a 2-D list of stats. Each sub-list is of length 1
            and the contained element is an dict with keys of "link_available_time" and
            "link_uptime". Raise exception on error.
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
            link_available_return = per_link_return[name_to_idx["stapkt.linkavailable"]]

            try:
                counters_list, counter_ts = self.match_values_list_by_timestamp(
                    [
                        uplink_bwreq_return.timeSeries,
                        keepalive_return.timeSeries,
                        heartbeat_return.timeSeries,
                    ],
                    source_db_interval=30,
                )
            except BaseException as err:
                raise ValueError(
                    "Error during match_values_list_by_timestamp(): {}".format(err.args)
                )

            uptime_windows = self.get_uptime_windows(
                counters_list, counter_ts, sampling_start_time=sampling_start_time
            )

            available_stats = self.compute_single_link_available_stats(
                link_available_return.timeSeries, uptime_windows, sampling_start_time
            )

            available_stats_returns.append([available_stats])

        return available_stats_returns

    def compute_single_link_available_stats(
        self, available_time_series, link_uptime_windows, sampling_start_time
    ):
        """
        Compute the link available time based on the "stapkt.linkavailable" time series.
        The algorithm works as follows: a). Using the mgmttx (keepalive/heartbeat/bwreq)
        counters to calculate the link uptime windows. b). For each window, used the
        largest link available counter and counter increase speed to get the link
        available time during that link uptime window. c). Sum over all link uptime
        windows. The algorithm is effective for the cases when there is only a single
        link available counter data point during the window or the first link available
        counters are not reported during a link uptime window. Note that this algorithm
        can lead to over accounting issue with the current link uptime
        windows calculation (get_uptime_windows()). For example, if the link reset at
        time 0. And we observe at time [15, 45, 75, 105] with mgmttx/linkAvailable
        counter values of [15 * s, 45 * s, 75 * s, 105 * s]. The link uptime windows are
        [[floor(7.5) ,15], [floor(22.5) ,105]]. With the above algorithm, the total link
        available time will be 105 + 15 = 120, which is larger than 105. This issue will
        be automatically resolved once the mgmttx counter is fixed on firmware and the
        get_uptime_windows() is updated.

        Args:
        available_time_series: linkAvailable counters time series, of type timeSeries.
        link_uptime_windows: list of valid windows, each element is of format
                             [start_time, end_time].
        sampling_start_time: start time (unix time in seconds) of the queried stats.

        Return:
        output_stats: a dict with keys of "link_available_time" and "link_uptime".
        """

        link_available_counters = [dp.value for dp in available_time_series]
        link_available_ts = [dp.unixTime for dp in available_time_series]
        if not link_available_ts:
            logging.error("No link available counter report")
            return {}

        output_stats = {"link_available_time": 0, "link_uptime": 0}

        for start_timestamp, end_timestamp in link_uptime_windows:
            output_stats["link_uptime"] += end_timestamp - start_timestamp
            if start_timestamp == sampling_start_time:
                if link_available_ts[0] <= end_timestamp:
                    # There are link available counter reports in the first window
                    counter_start = link_available_counters[0]
                else:
                    # There is no available counter report in the first window
                    continue
            else:
                counter_start = 0

            right_counter_idx = self.find_largest_ts_idx(
                link_available_ts, end_timestamp
            )
            if link_available_ts[right_counter_idx] < start_timestamp:
                continue
            else:
                output_stats["link_available_time"] += (
                    link_available_counters[right_counter_idx] - counter_start
                ) / self.COUNTER_SPEED_PER_S

        return output_stats

    def find_largest_ts_idx(self, link_available_ts, end_timestamp):
        """
        Find the index of the largest time stamp that is smaller than the end_timestamp.

        Args:
        link_available_ts: a list of time stamps, should be in ascending order.
        end_timestamp: the end_timestamp of a link uptime window.

        Return:
        start_idx: the index of the largest time stamp whose value is smaller or equal
        to end_timestamp.
        """
        if link_available_ts[-1] <= end_timestamp:
            return len(link_available_ts) - 1

        start_idx = 0
        end_idx = len(link_available_ts) - 1

        # Find the smallest idx that is larger than the end_timestamp
        while start_idx != end_idx:
            mid_idx = int((start_idx + end_idx) / 2)
            if link_available_ts[mid_idx] <= end_timestamp:
                start_idx = mid_idx + 1
            else:
                end_idx = mid_idx

        if end_idx > 0:
            end_idx -= 1

        return end_idx

    def get_link_health_num(
        self,
        extracted_stats,
        sample_duration_in_s,
        green_cutoff_ratio,
        amber_cutoff_ratio,
    ):
        """ Compute the number of green, amber, and red links in a network.
            Currently, the definitions of green, amber, and red links are:
            green: link_available_time / observed_window >= green_cutoff_ratio
            amber: link_available_time / observed_window >= amber_cutoff_ratio
            red: link_available_time / observed_window < amber_cutoff_ratio

        Args:
        extracted_stats: a dict, which contains a key of "link_available_time" and
        corresponding dict value is a list of computed link available time of all
        links in the network.
        sample_duration_in_s: duration of the sampling window.
        green_cutoff_ratio: threshold of green links.
        amber_cutoff_ratio: threshold of amber links.

        Return:
        links_health_stats: a dict, with keys of "num_green_links", "num_amber_link",
        and "num_red_link".
        """

        if amber_cutoff_ratio > green_cutoff_ratio:
            logging.warning("Amber threshold larger than green threshold")

        links_health_stats = {
            "num_green_link": 0,
            "num_amber_link": 0,
            "num_red_link": 0,
        }
        if "link_available_time" not in extracted_stats:
            logging.warning("There is no link available time reported for any link")
            return links_health_stats

        green_amber_cutoff = sample_duration_in_s * green_cutoff_ratio
        amber_lower_cutoff = sample_duration_in_s * amber_cutoff_ratio

        for link_available_time in extracted_stats["link_available_time"]:
            if link_available_time >= green_amber_cutoff:
                links_health_stats["num_green_link"] += 1
            elif link_available_time >= amber_lower_cutoff:
                links_health_stats["num_amber_link"] += 1
            else:
                links_health_stats["num_red_link"] += 1

        logging.info("The network link health stats is {}".format(links_health_stats))

        return links_health_stats

    def get_all_link_stats(self, computed_stats):
        """ Extract links stats of all links from computed link stats.

        Args:
        computed_stats: a 2-D list of computed stats, each element of computed_stats
        is a list of dict. Each dict maps the computed link stats name to its value.

        Return:
        stats_key_to_stats: dict, with keys being the link stats names (like
        "link_available_time") and the dict values are a lists. Each value in a list
        is the computed stats value of a link.
        """
        stats_key_to_stats = {}

        for query_stats in computed_stats:
            for query_key_stats in query_stats:
                for stats_key in query_key_stats:
                    if stats_key in stats_key_to_stats:
                        stats_key_to_stats[stats_key].append(query_key_stats[stats_key])
                    else:
                        stats_key_to_stats[stats_key] = [query_key_stats[stats_key]]

        return stats_key_to_stats

    def compute_link_foliage(
        self,
        read_returns,
        metric_names,
        link_macs_list,
        source_db_interval,
        number_of_windows,
        min_window_size,
        minimum_var,
    ):
        """ Compute the foliage factor of each link based on the pathloss covariance
            between forward link and reverse link.

            Args:
            read_returns: the read return from BQS, of type RawQueryReturn.
            metric_names: name of the stats queried of each link. The sequence
            needs to be index matched to that of each link's query sent to BQS.
            link_macs_list: list of link macs (source_mac, peer_mac), need to be
            index matched to that of read query.
            source_db_interval: database interval of the database queried from.

            Return:
            foliage_factor_returns: a 2-D list of stats. Each sub-list is of length 1
            and contain a dict with key of "foliage_factor".
            Raise exception on error.
        """

        name_to_idx = {metric: idx for idx, metric in enumerate(metric_names)}
        if (
            "stapkt.txpowerindex" not in name_to_idx
            or "phystatus.srssi" not in name_to_idx
        ):
            raise ValueError("Not all needed metrics are queried")

        link_macs_to_tx_power_rx_rssi = {}
        for link_idx, link_return in enumerate(read_returns.queryReturnList):
            link_return = link_return.timeSeriesAndKeyList
            forward_link_macs = (
                link_macs_list[link_idx][0],
                link_macs_list[link_idx][1],
            )
            reverse_link_macs = (forward_link_macs[1], forward_link_macs[0])

            if forward_link_macs not in link_macs_to_tx_power_rx_rssi:
                link_macs_to_tx_power_rx_rssi[forward_link_macs] = {}
            if reverse_link_macs not in link_macs_to_tx_power_rx_rssi:
                link_macs_to_tx_power_rx_rssi[reverse_link_macs] = {}

            tx_power = link_return[name_to_idx["stapkt.txpowerindex"]].timeSeries
            rx_rssi = link_return[name_to_idx["phystatus.srssi"]].timeSeries

            link_macs_to_tx_power_rx_rssi[forward_link_macs]["tx_power"] = tx_power
            link_macs_to_tx_power_rx_rssi[reverse_link_macs]["rx_rssi"] = rx_rssi

        unit_converter = UnitConverter()
        enable_second_array = False
        link_macs_to_foliage_factor = {}
        for link_macs in link_macs_to_tx_power_rx_rssi:
            reverse_link_macs = (link_macs[1], link_macs[0])
            if (
                link_macs in link_macs_to_foliage_factor
                or reverse_link_macs in link_macs_to_foliage_factor
            ):
                # Already processed
                continue

            try:
                values_list, _ = self.match_values_list_by_timestamp(
                    [
                        link_macs_to_tx_power_rx_rssi[link_macs]["tx_power"],
                        link_macs_to_tx_power_rx_rssi[link_macs]["rx_rssi"],
                        link_macs_to_tx_power_rx_rssi[reverse_link_macs]["tx_power"],
                        link_macs_to_tx_power_rx_rssi[reverse_link_macs]["rx_rssi"],
                    ],
                    source_db_interval=source_db_interval,
                )
                TX_POWER_FORWARD_IDX = 0
                RSSI_POWER_FORWARD_IDX = 1
                TX_POWER_REVERSE_IDX = 2
                RSSI_POWER_REVERSE_IDX = 3
            except BaseException as err:
                logging.warning(
                    "Error during match_values_list_by_timestamp(): {}".format(err.args)
                )
                continue

            # pathloss = txPower(A) - RSSI(Z) + G_tx(A) + G_Rx(Z)
            # G_tx(A) + G_Rx(Z): same across all links, thus we only need to compute
            # pathloss_offset = txPower(A) - RSSI(Z)
            forward_link_pathloss = [
                unit_converter.tx_power_idx_to_power_dbm(
                    values[TX_POWER_FORWARD_IDX], enable_second_array
                )
                - values[RSSI_POWER_FORWARD_IDX]
                for values in values_list
            ]
            reverse_link_pathloss = [
                unit_converter.tx_power_idx_to_power_dbm(
                    values[TX_POWER_REVERSE_IDX], enable_second_array
                )
                - values[RSSI_POWER_REVERSE_IDX]
                for values in values_list
            ]
            foliage_factor = self.compute_single_link_foliage_factor(
                forward_link_pathloss,
                reverse_link_pathloss,
                number_of_windows,
                min_window_size,
                minimum_var,
            )

            if foliage_factor is not None:
                link_macs_to_foliage_factor[link_macs] = foliage_factor

        foliage_factor_returns = []
        for link_macs in link_macs_list:
            link_macs = tuple(link_macs)
            foliage_stats = {}

            if link_macs in link_macs_to_foliage_factor:
                foliage_stats = {
                    "foliage_factor": link_macs_to_foliage_factor[link_macs]
                }
            elif (link_macs[1], link_macs[0]) in link_macs_to_foliage_factor:
                foliage_stats = {
                    "foliage_factor": link_macs_to_foliage_factor[
                        link_macs[1], link_macs[0]
                    ]
                }
            else:
                # If the foliage factor is not computed, foliage factor is not
                # computed
                foliage_stats = {}

            foliage_factor_returns.append([foliage_stats])

        return foliage_factor_returns

    def compute_single_link_foliage_factor(
        self,
        forward_link_pathloss,
        reverse_link_pathloss,
        number_of_windows=5,
        min_window_size=20,
        minimum_var=0,
    ):
        """ Compute the link foliage factor based on the link pathloss covariance
        between forward link and reverse link.

        Args:
        forward_link_pathloss: list of pathloss offset values of a link, from source
        node to peer node.
        reverse_link_pathloss: list of pathloss offset values of a link, from peer
        node to source node, need to be index matched with forward_link_pathloss.
        minimum_var: the minimum channel variance for foliage factor to be computed

        Return:
        foliage_factor: a float value between 0 and 1 that indicates the
        level of foliage. Larger value means higher probability of foliage.
        """

        # TODO: Currently, do a uniform window slicing over time. Can potentially
        # has a small running detection to find more accurate sub-windows.
        if len(forward_link_pathloss) != len(reverse_link_pathloss):
            logging.error("Different lengths of forward and reverse link pathloss")
            return None

        if len(forward_link_pathloss) < min_window_size * number_of_windows:
            logging.error(
                ("Cannot compute foliage factor, need {} samples," "{} provide").format(
                    min_window_size * number_of_windows, len(forward_link_pathloss)
                )
            )
            return None

        window_len = len(forward_link_pathloss) / number_of_windows

        windows = [
            [int(i * window_len), int((i + 1) * window_len)]
            for i in range(number_of_windows)
        ]

        cross_covariances = []
        for start_idx, end_idx in windows:
            forward_link_offsets = forward_link_pathloss[start_idx : end_idx + 1]
            reverse_link_offsets = reverse_link_pathloss[start_idx : end_idx + 1]
            forward_var = np.var(forward_link_offsets)
            reverse_var = np.var(reverse_link_offsets)

            if forward_var <= minimum_var or reverse_var <= minimum_var:
                # If the channel is too stable, skip the window
                continue
            # Compute the un-normalized covariance between forward pathloss
            cross_covariance = np.cov([forward_link_offsets, reverse_link_offsets])[0][
                1
            ]
            # Normalize by variance of forward and reverse link pathloss
            cross_covariance /= np.sqrt(forward_var * reverse_var)
            cross_covariances.append([forward_var + reverse_var, cross_covariance])

        foliage_factor = 0
        total_weight = 0
        for weight, factor in cross_covariances:
            foliage_factor += weight * factor
            total_weight += weight

        if total_weight:
            foliage_factor = foliage_factor / total_weight

        return foliage_factor

    def get_link_foliage_num(self, extracted_stats, foliage_threshold, num_links):
        """ Compute the number of foliage and foliage_free links.
            Currently, the definitions of foliage, foliage_free links are:
            foliage: foliage_factor > foliage_threshold
            foliage_free: foliage_factor <= foliage_threshold.

        Args:
        extracted_stats: a dict with key of "foliage_factor" and the corresponding
        dict value is a list of computed foliage factor of all links in the network.
        sample_duration_in_s: duration of the sampling window.
        num_links: total number of links in current network topology.

        Return:
        links_foliage_stats: a dict, with keys of "num_foliage_links",
        "num_foliage_free_links".
        """

        links_foliage_stats = {
            "num_foliage_links": 0,
            "num_foliage_free_links": 0,
            "num_unclassified_foliage_links": 0,
        }

        for foliage_factor in extracted_stats["foliage_factor"]:
            if foliage_factor > foliage_threshold:
                links_foliage_stats["num_foliage_links"] += 0.5
            else:
                links_foliage_stats["num_foliage_free_links"] += 0.5

        links_foliage_stats["num_unclassified_foliage_links"] = (
            num_links
            - links_foliage_stats["num_foliage_links"]
            - links_foliage_stats["num_foliage_free_links"]
        )

        logging.info("The network link foliage stats is {}".format(links_foliage_stats))

        return links_foliage_stats

    def compute_interference_stats(
        self,
        metric_names,
        link_macs_list,
        read_returns,
        pathloss_map,
        node_mac_to_polarity,
        node_mac_to_golay,
        enable_second_array=False,
    ):
        """ Compute the interference stats of all links in a network.

            Args:
            metric_names: name of the stats queried of each link. The sequence
            needs to be index matched to that of read query sent to BQS.
            link_macs_list: list of link macs (tx_mac, rx_mac), need to be
            index matched to that of read query.
            read_returns: the read return from BQS, of type RawQueryReturn.
            pathloss_map: pathloss of all node pairs with all beam index pairs. Computed
            by using IM scan result, from get_pathloss_from_im_scan() in ScanHandler
            class.
            node_mac_to_polarity: dict, node mac to polarity.
            node_mac_to_golay: dict, the values are dicts with keys of "rxGolayIdx" and
                               "txGolayIdx".
            enable_second_array: if second array is used.

            Return:
            interference_stats_returns: a 2-D list of stats. Each sub-list is of
            length 1 and contains a dict with key of "snr", "inr", "sinr", "inr_pilot",
            "sinr_pilot".
            Raise exception on error.
        """

        name_to_idx = {metric: idx for idx, metric in enumerate(metric_names)}
        if (
            "phyperiodic.txbeamidx" not in name_to_idx
            or "phyperiodic.rxbeamidx" not in name_to_idx
            or "stapkt.txpowerindex" not in name_to_idx
        ):
            raise ValueError("Not all needed metrics are queried")

        unit_converter = UnitConverter()

        # link_macs_to_beam_power_stats is a dict that maps link mac pairs
        # (tx_mac, rx_mac) to the power_beam_stats. The power_beam_stats is a
        # dict with keys of "tx_beam_idx", "rx_beam_idx", "tx_power".
        link_macs_to_beam_power_stats = {}
        # tx_mac_to_power_beam maps each node mac to the a list of used tx_power and
        # tx_beam_idx combinations. Each combination represents a link from this
        # tx node.
        tx_mac_to_power_beam = {}
        for query_return_idx, query_return in enumerate(read_returns.queryReturnList):
            mac_pair = tuple(link_macs_list[query_return_idx])

            if mac_pair not in link_macs_to_beam_power_stats:
                link_macs_to_beam_power_stats[mac_pair] = {}

            query_return = query_return.timeSeriesAndKeyList
            tx_beam_idx_ts = query_return[
                name_to_idx["phyperiodic.txbeamidx"]
            ].timeSeries
            rx_beam_idx_ts = query_return[
                name_to_idx["phyperiodic.rxbeamidx"]
            ].timeSeries
            tx_power_idx_ts = query_return[
                name_to_idx["stapkt.txpowerindex"]
            ].timeSeries

            # Currently, the beam index pairs do not change often in the time.
            # To reduce the computation complexity, we start by using the last slice
            # of data for interference stats computation.
            if tx_beam_idx_ts and rx_beam_idx_ts and tx_power_idx_ts:
                tx_beam_idx = tx_beam_idx_ts[-1].value
                rx_beam_idx = rx_beam_idx_ts[-1].value
                tx_power_idx = tx_power_idx_ts[-1].value

                tx_power = unit_converter.tx_power_idx_to_power_dbm(
                    tx_power_idx, enable_second_array
                )

                link_macs_to_beam_power_stats[mac_pair] = {
                    "tx_beam_idx": tx_beam_idx,
                    "rx_beam_idx": rx_beam_idx,
                    "tx_power": tx_power,
                }
                if mac_pair[0] not in tx_mac_to_power_beam:
                    tx_mac_to_power_beam[mac_pair[0]] = [[tx_power, tx_beam_idx]]
                else:
                    tx_mac_to_power_beam[mac_pair[0]].append([tx_power, tx_beam_idx])

        link_macs_to_interference_stats = self.compute_network_link_interference(
            link_macs_to_beam_power_stats,
            pathloss_map,
            tx_mac_to_power_beam,
            node_mac_to_polarity,
            node_mac_to_golay,
        )

        interference_stats_returns = []
        for link_macs in link_macs_list:
            if tuple(link_macs) in link_macs_to_interference_stats:
                link_interference_stats = link_macs_to_interference_stats[
                    tuple(link_macs)
                ]
            else:
                link_interference_stats = {}

            interference_stats_returns.append([link_interference_stats])

        return interference_stats_returns

    def compute_network_link_interference(
        self,
        link_macs_to_beam_power_stats,
        pathloss_map,
        tx_mac_to_power_beam,
        node_mac_to_polarity,
        node_mac_to_golay,
        detection_floor_in_dBm=-30,
    ):
        """Compute the interference stats of each link by using the beam index reported
           by nodes in periodic beamforming. The pathloss of each link, pathloss_map,
           comes from the IM scan.

           Args:
           link_macs_to_beam_power_stats: a dict that maps (tx_mac, rx_mac) to dicts
           with keys of "tx_beam_idx", "rx_beam_idx", "tx_power".
           pathloss_map: pathloss of all node pairs with all beam index pairs. Computed
           by using IM scan result, from get_pathloss_from_im_scan() in ScanHandler
           class.
           tx_mac_to_power_beam: dict, maps node mac to a list of pairs of tx_power and
           tx_beam_idx. Each pair corresponds to the report stats from a link with
           tx_mac as tx node.
           node_mac_to_polarity: dict, node mac to node polarity.
           node_mac_to_golay: dict, node mac to node Golay assignments.
           detection_floor_in_dBm: the minimum signal strength, used to populate the
           inr, snr, or sinr if no signal can be found.

           Return:
           link_macs_to_interference_stats: a dict that maps mac pairs (tx_mac, rx_mac)
           to the interference stats. Interference stats will have keys of "snr",
           "sinr", "inr", "sinr_pilot", and "inr_pilot".
        """

        link_macs_to_interference_stats = {}

        for link_macs in link_macs_to_beam_power_stats:
            tx_mac = link_macs[0]
            rx_mac = link_macs[1]
            interference_stats = {}
            snr = detection_floor_in_dBm
            # inr absolute value value, not in dB
            inr_absolute = 0
            inr_pilot_absolute = 0
            sinr = detection_floor_in_dBm
            beam_power_stats = link_macs_to_beam_power_stats[link_macs]
            reverse_power_stats = link_macs_to_beam_power_stats[rx_mac, tx_mac]
            if (
                "tx_power" not in beam_power_stats
                or "tx_beam_idx" not in beam_power_stats
                or "rx_beam_idx" not in reverse_power_stats
            ):
                continue

            tx_power = beam_power_stats["tx_power"]
            tx_beam_idx = beam_power_stats["tx_beam_idx"]
            rx_beam_idx = reverse_power_stats["rx_beam_idx"]

            try:
                snr = tx_power - pathloss_map[rx_mac][tx_mac][tx_beam_idx, rx_beam_idx]
            except BaseException as err:
                logging.warning(
                    "Link {}->{} ({}, {}) does not have im_scan report".format(
                        tx_mac, rx_mac, tx_beam_idx, rx_beam_idx
                    )
                )

            if rx_mac in pathloss_map:
                try:
                    rx_polarity = node_mac_to_polarity[rx_mac]
                    rx_golay = node_mac_to_golay[rx_mac]["rxGolayIdx"]
                except BaseException as err:
                    logging.error(
                        "Cannot find polarity/Golay for node {}".format(rx_mac)
                    )
                    continue

                # Iterate through the possible interferences
                for interferer_mac in pathloss_map[rx_mac]:
                    if interferer_mac == tx_mac:
                        continue

                    try:
                        interferer_polarity = node_mac_to_polarity[interferer_mac]
                        interferer_golay = node_mac_to_golay[interferer_mac][
                            "txGolayIdx"
                        ]
                    except BaseException as err:
                        logging.error(
                            "Cannot find polarity/Golay for node {}".format(
                                interferer_mac
                            )
                        )
                        continue

                    if interferer_polarity == rx_polarity:
                        # If the interferer and rx node are of same polarity,
                        # no interference will be generated
                        continue

                    interference = detection_floor_in_dBm
                    interference_pilot = detection_floor_in_dBm

                    # If the interferer can potentially tx, use the link that leads
                    # to the largest interference. Note this means that the computed
                    # inr/sinr is the upper/lower bound of the true value.
                    # (The possible multiple point to single point is not considered
                    # here.)
                    if interferer_mac in tx_mac_to_power_beam:
                        for tx_power, tx_beam_idx in tx_mac_to_power_beam[
                            interferer_mac
                        ]:
                            if (tx_beam_idx, rx_beam_idx) in pathloss_map[rx_mac][
                                interferer_mac
                            ]:
                                logging.info(
                                    "Data interference: {}->{}, ({}, {})".format(
                                        interferer_mac, rx_mac, tx_beam_idx, rx_beam_idx
                                    )
                                )

                                pathloss_absolute = pathloss_map[rx_mac][
                                    interferer_mac
                                ][tx_beam_idx, rx_beam_idx]

                                per_beam_interference = tx_power - pathloss_absolute

                                interference = max(interference, per_beam_interference)
                                if rx_golay == interferer_golay:
                                    interference_pilot = max(
                                        interference_pilot, per_beam_interference
                                    )
                                    logging.info(
                                        "Pilot interference: {}->{}, ({}, {})".format(
                                            interferer_mac,
                                            rx_mac,
                                            tx_beam_idx,
                                            rx_beam_idx,
                                        )
                                    )
                            else:
                                continue

                    if interference > detection_floor_in_dBm:
                        inr_absolute += 10 ** (interference / 10)
                    if interference_pilot > detection_floor_in_dBm:
                        inr_pilot_absolute += 10 ** (interference_pilot / 10)

            sinr = 10 * np.log10((10 ** (snr / 10)) / (1 + inr_absolute))
            sinr_pilot = 10 * np.log10((10 ** (snr / 10)) / (1 + inr_pilot_absolute))
            if inr_absolute:
                inr = 10 * np.log10(inr_absolute)
            else:
                inr = detection_floor_in_dBm

            if inr_pilot_absolute:
                inr_pilot = 10 * np.log10(inr_pilot_absolute)
            else:
                inr_pilot = detection_floor_in_dBm

            logging.debug(
                "{}->{} ({}, {}), snr: {}, inr: {}, sinr: {}".format(
                    tx_mac, rx_mac, tx_beam_idx, rx_beam_idx, snr, inr, sinr
                )
            )

            interference_stats = {
                "snr": snr,
                "inr": inr,
                "sinr": sinr,
                "sinr_pilot": sinr_pilot,
                "inr_pilot": inr_pilot,
            }
            link_macs_to_interference_stats[link_macs] = interference_stats

        return link_macs_to_interference_stats
