#!/usr/bin/env python3

""" Provide LinkPipeline class, which holds the stats pipelines on link insights.
"""

import logging
import os
import sys
import time

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from link_insights.link_insight import LinkInsight
from module.beringei_db_access import BeringeiDbAccess
from module.topology_handler import TopologyHelper


class LinkPipeline(object):
    def __new__(cls, topology_name):
        """Get the LinkPipeline class instance, which holds the stats pipelines of
           link insights.

        Args:
        topology_name: name of the topology of interest, like "tower G".

        Return: LinkPipeline object on success. None on failure.
        """
        topology_helper = TopologyHelper(topology_name=topology_name)
        if not topology_helper:
            logging.error("Cannot create TopologyHelper object")
            return None

        instance = super().__new__(cls)

        instance.topology_name = topology_name
        # initialize topology related variables
        topology_reply = topology_helper.get_topology_from_api_service()
        instance.network_config = topology_helper.obtain_network_dict(topology_reply)
        # Include both forward and reverse links of (source_mac, peer_mac) and
        # (peer_mac, source_mac)
        instance.link_macs_list = []
        for source_mac, peer_mac in list(
            instance.network_config["link_macs_to_name"].keys()
        ):
            instance.link_macs_list += [[source_mac, peer_mac], [peer_mac, source_mac]]

        # initialize Beringie access class
        instance.beringei_db_access = BeringeiDbAccess()
        if not instance.beringei_db_access:
            logging.error("Cannot create BeringeiDbAccess object")
            return None

        # initialize link insight class
        instance.link_insight = LinkInsight()
        logging.info("LinkPipeline object created")
        return instance

    def _read_beringei(
        self,
        metric_names,
        stats_query_timestamp,
        sample_duration_in_s,
        source_db_interval,
    ):
        """Read the wanted metrics from the Beringei database via BQS.

        Args:
        metric_names: list of metric_names, each is like "phystatus.ssnrest".
        stats_query_timestamp: The time of the link stats computation. The sampling
        window is [stats_query_timestamp - sample_duration_in_s, stats_query_timestamp].
        sample_duration_in_s: sampling duration.
        source_db_interval: int to indicate the Beringei to be queried.

        Return:
        query_returns: read query return from BQS, of type RawQueryReturn.
        query_request_to_send: read query request to be send to BQS, of type
                               RawReadQueryRequest.
        """
        query_request_to_send = self.link_insight.construct_query_request(
            self.topology_name,
            key_option="link_metric",
            metric_names=metric_names,
            link_macs_list=self.link_macs_list,
            start_ts=stats_query_timestamp - sample_duration_in_s,
            end_ts=stats_query_timestamp,
            source_db_interval=source_db_interval,
        )
        # Read the from the Beringei database, return type is RawQueryReturn
        query_returns = self.beringei_db_access.read_beringei_db(query_request_to_send)
        return query_returns, query_request_to_send

    def _write_beringei(
        self,
        dump_to_json,
        computed_stats,
        query_request_to_send,
        sample_duration_in_s,
        source_db_interval,
        stats_query_timestamp,
        json_log_name,
        metric_name,
    ):
        """Write the computed insights to the Beringei database via BQS.

        Args:
        dump_to_json: if True, save a copy of computed_stats to local json for
                      debugging.
        computed_stats: 2-D list of computed stats.
        query_request_to_send: read queries that were sent to Beringei database,
                               used to find source_mac, peer_mac.
        source_db_interval: int to indicate which Beringei database is read.
        stats_query_timestamp: The time of the link stats computation. The sampling
        window is [stats_query_timestamp - sample_duration_in_s, stats_query_timestamp].
        sample_duration_in_s: sampling duration.
        metric_name: name of the metric key prefix to write back to Beringei database.

        Return:
        void.
        """
        if dump_to_json:
            self.link_insight.dump_link_stats_to_json(
                computed_stats,
                query_request_to_send,
                self.network_config,
                sample_duration_in_s,
                source_db_interval,
                stats_query_timestamp,
                json_log_name,
            )
        stats_to_write = self.link_insight.construct_write_request(
            computed_stats,
            query_request_to_send,
            self.network_config,
            sample_duration_in_s,
            source_db_interval,
            stats_query_timestamp,
            self.topology_name,
            metric_name=metric_name,
        )
        self.beringei_db_access.write_beringei_db(stats_to_write)
        logging.info("Successfully write back to Beringei")

    def naive_link_pipeline(
        self,
        metric_names,
        sample_duration_in_s=3600,
        source_db_interval=30,
        dump_to_json=False,
        json_log_name_prefix="sample_log_",
    ):
        """
        Read link stats from BQS and compute link stats. Currently compute mean
        and variance.

        Args:
        metric_names: metrics list, each metric is like "phystatus.ssnrest".
        sample_duration_in_s: duration of the samples, for example 3600 means use
        1 hour data points for each link.
        source_db_interval: the resolution of the database read from, 30 means
        beringei_30s database.
        dump_to_json: If True, save a copy of the link stats to json;
        If False, don't save to json.
        json_log_name_prefix: prefix of the output json log file, only used
        if dump_to_json.

        Return:
        Void.
        """

        logging.info("Running the naive link pipeline for: " + ", ".join(metric_names))
        stats_query_timestamp = int(time.time())

        try:
            # Read the from the Beringei database, return type is RawQueryReturn
            read_returns, query_request_to_send = self._read_beringei(
                metric_names,
                stats_query_timestamp,
                sample_duration_in_s,
                source_db_interval,
            )

            # Compute the returned time series average and variance
            computed_stats = self.link_insight.compute_timeseries_avg_and_var(
                read_returns
            )

            self._write_beringei(
                dump_to_json,
                computed_stats,
                query_request_to_send,
                sample_duration_in_s,
                source_db_interval,
                stats_query_timestamp,
                json_log_name_prefix + "naive.json",
                None,
            )
        except ValueError as err:
            logging.error("Error during pipeline execution:", err.args)
            return

        logging.info("Naive link pipeline execution finished")

    def traffic_stats_pipeline(
        self,
        sample_duration_in_s=3600,
        source_db_interval=30,
        dump_to_json=False,
        json_log_name_prefix="sample_log_",
    ):
        """
        Read link stats from BQS and compute link insights on traffic.
        Currently compute packet error rate (PER) and packet per second (PPS).

        Args:
        sample_duration_in_s: duration of the samples, for example 3600 means use
                              1 hour data points for each link.
        source_db_interval: the resolution of the database read from, 30 means
                            beringei_30s database.
        dump_to_json: if True, save a copy of the link stats to json;
                      If False, don't save to json.
        json_log_name_prefix: prefix of the output json log file, only used
                              if dump_to_json.

        Return:
        Void.
        """

        logging.info("Running the link traffic pipeline")
        stats_query_timestamp = int(time.time())
        metric_names = [
            "mgmttx.uplinkbwreq",
            "mgmttx.keepalive",
            "mgmttx.heartbeat",
            "stapkt.txok",
            "stapkt.txfail",
        ]

        try:
            # Read the from the Beringei database, return type is RawQueryReturn
            read_returns, query_request_to_send = self._read_beringei(
                metric_names,
                stats_query_timestamp,
                sample_duration_in_s,
                source_db_interval,
            )

            computed_stats = self.link_insight.compute_traffic_stats(
                metric_names, read_returns
            )

            self._write_beringei(
                dump_to_json,
                computed_stats,
                query_request_to_send,
                sample_duration_in_s,
                source_db_interval,
                stats_query_timestamp,
                json_log_name_prefix + "traffic.json",
                "traffic",
            )
        except ValueError as err:
            logging.error("Error during pipeline execution:", err.args)
            return

        logging.info("Link traffic pipeline execution finished")

    def link_uptime_pipeline(
        self,
        sample_duration_in_s=3600,
        source_db_interval=30,
        dump_to_json=False,
        json_log_name_prefix="sample_uptime_",
    ):
        """
        Compute the link uptime using the link "stapkt.linkavailable" counters.

        Args:
        sample_duration_in_s: duration of the samples, for example 3600 means use
        1 hour data points for each link.
        source_db_interval: the resolution of the database read from, 30 means
        beringei_30s database.
        dump_to_json: if True, save a copy of the link stats to json;
        If False, don't save to json.
        json_log_name_prefix: prefix of the output json log file, only used
        if dump_to_json.

        Return:
        Void.
        """

        logging.info("Running the link uptime pipeline")
        stats_query_timestamp = int(time.time())
        try:
            # Read the from the Beringei database, return type is RawQueryReturn
            read_returns, query_request_to_send = self._read_beringei(
                ["stapkt.linkavailable"],
                stats_query_timestamp,
                sample_duration_in_s,
                source_db_interval,
            )

            computed_stats = self.link_insight.compute_link_uptime(read_returns)

            self._write_beringei(
                dump_to_json,
                computed_stats,
                query_request_to_send,
                sample_duration_in_s,
                source_db_interval,
                stats_query_timestamp,
                json_log_name_prefix + "uptime.json",
                None,
            )
        except ValueError as err:
            logging.error("Error during pipeline execution:", err.args)
            return

        logging.info("Link uptime pipeline execution finished")
