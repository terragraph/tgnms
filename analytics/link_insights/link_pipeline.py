#!/usr/bin/env python3

""" Provide LinkPipeline class, which contains the pipelines that each will read
    data from Beringei database (via BQS), process the data, and write the processed
    stats back to Beringei database (via BQS).
"""

import logging
import os
import sys
import time
import json

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from link_insights.link_insight import LinkInsight
from module.beringei_db_access import BeringeiDbAccess
from module.topology_handler import TopologyHelper
from module.mysql_db_access import MySqlDbAccess
from module.path_store import PathStore


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

        # initialize Beringei access class
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

    def _write_netowrk_stats_to_beringei(
        self,
        network_stats,
        source_db_interval,
        sample_duration_in_s,
        stats_query_timestamp,
    ):
        """Write the computed network insight to the Beringei database via BQS.

        Args:
        network_stats: a dict that maps dict work key names (like "num_green_link")
                       to value.
        source_db_interval: int to indicate which Beringei database is read.
        sample_duration_in_s: sampling duration of the link stats.
        stats_query_timestamp: The time of the link stats computation. The sampling
        window is [stats_query_timestamp - sample_duration_in_s, stats_query_timestamp].

        Return:
        void.
        """

        # TODO: Currently, construct_network_stats_write_request() will re-use the node
        # stats write endpoint (StatsWriteHandler) before the new aggregate stats
        # write handler at BQS is ready. To workaround the node mac, we will use the
        # source_mac of the first link. Update construct_network_stats_write_request()
        # once the aggregate stats write handler is landed.
        if self.link_macs_list:
            fake_mac = self.link_macs_list[0][0]
        else:
            raise ValueError("There is no link in the network")

        network_write_request = self.link_insight.construct_network_stats_write_request(
            network_stats,
            sample_duration_in_s,
            source_db_interval,
            stats_query_timestamp,
            self.topology_name,
            fake_mac,
        )

        self.beringei_db_access.write_beringei_db(network_write_request)
        logging.info("Successfully write network stats to Beringei")

    def link_mean_variance_pipeline(
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
            # Read from the Beringei database, return type is RawQueryReturn
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
                json_log_name_prefix + "link_mean_variance.json",
                None,
            )
        except ValueError as err:
            logging.error("Error during pipeline execution:", err.args)
            return

        logging.info("Link metric mean and variance pipeline execution finished")

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
            # Read from the Beringei database, return type is RawQueryReturn
            read_returns, query_request_to_send = self._read_beringei(
                metric_names,
                stats_query_timestamp,
                sample_duration_in_s,
                source_db_interval,
            )

            computed_stats = self.link_insight.compute_per_pps(
                metric_names, read_returns, stats_query_timestamp - sample_duration_in_s
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

    def link_health_pipeline(
        self,
        sample_duration_in_s=3600,
        source_db_interval=30,
        dump_to_json=False,
        json_log_name_prefix="sample_available_",
    ):
        """
        Compute the link available time using the link "stapkt.linkavailable" counters.

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

        logging.info("Running the link health pipeline")
        stats_query_timestamp = int(time.time())
        metric_names = [
            "stapkt.linkavailable",
            "mgmttx.uplinkbwreq",
            "mgmttx.keepalive",
            "mgmttx.heartbeat",
        ]
        try:
            # Read from the Beringei database, return type is RawQueryReturn
            read_returns, query_request_to_send = self._read_beringei(
                metric_names,
                stats_query_timestamp,
                sample_duration_in_s,
                source_db_interval,
            )

            computed_stats = self.link_insight.compute_link_available(
                metric_names, read_returns, stats_query_timestamp - sample_duration_in_s
            )

            self._write_beringei(
                dump_to_json,
                computed_stats,
                query_request_to_send,
                sample_duration_in_s,
                source_db_interval,
                stats_query_timestamp,
                json_log_name_prefix + "available.json",
                "health",
            )

            # Compute the network wide link health stats
            links_stats = self.link_insight.get_all_link_stats(computed_stats)
            network_health_stats = self.link_insight.get_link_health_num(
                links_stats, sample_duration_in_s
            )

            self._write_netowrk_stats_to_beringei(
                network_health_stats,
                source_db_interval,
                sample_duration_in_s,
                stats_query_timestamp,
            )

        except ValueError as err:
            logging.error("Error during pipeline execution:", err.args)
            return

        logging.info("Link health pipeline execution finished")


if __name__ == "__main__":
    try:
        with open(PathStore.ANALYTICS_CONFIG_FILE) as config_file:
            analytics_config = json.load(config_file)
    except BaseException as err:
        logging.error("Cannot load config with error {}".format(err.args))

    mysql_db_access = MySqlDbAccess()
    if mysql_db_access is None:
        raise ValueError("Cannot create MySqlDbAccess object")

    api_service_config = mysql_db_access.read_api_service_setting()
    if len(api_service_config) != 1:
        raise ValueError("There should be a single topology")
    topology_name = list(api_service_config.keys())[0]
    link_pipeline = LinkPipeline(topology_name)

    if len(sys.argv) < 2:
        logging.error("No pipeline specified")
    elif sys.argv[1] == "link_mean_variance_pipeline":
        job_config = analytics_config["pipelines"]["link_mean_variance_pipeline"]
        link_pipeline.link_mean_variance_pipeline(
            job_config["metric_names"],
            job_config["sample_duration_in_s"],
            job_config["source_db_interval"],
        )
    elif sys.argv[1] == "traffic_stats_pipeline":
        job_config = analytics_config["pipelines"]["traffic_stats_pipeline"]
        link_pipeline.traffic_stats_pipeline(
            job_config["sample_duration_in_s"], job_config["source_db_interval"]
        )
    else:
        logging.error("Unknown pipeline")
