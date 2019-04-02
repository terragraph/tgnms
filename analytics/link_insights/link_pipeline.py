#!/usr/bin/env python3

""" Provide LinkPipeline class, which contains the pipelines that each will read
    data from Beringei database (via BQS), process the data, and write the processed
    stats back to Beringei database (via BQS).
"""

import json
import logging
import time

from link_insights.link_insight import LinkInsight
from module.beringei_db_access import BeringeiDbAccess
from module.path_store import PathStore
from module.scan_handler import ScanHandler
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
        instance.node_mac_to_polarity = instance.network_config["node_mac_to_polarity"]
        instance.node_mac_to_golay = instance.network_config["node_mac_to_golay"]

        # initialize Beringei access class
        instance.beringei_db_access = BeringeiDbAccess()
        if not instance.beringei_db_access:
            logging.error("Cannot create BeringeiDbAccess object")
            return None

        # initialize link insight class
        instance.link_insight = LinkInsight()
        logging.info("LinkPipeline object created")

        instance.scan_handler = ScanHandler()

        try:
            with open(PathStore.ANALYTICS_CONFIG_FILE) as config_file:
                analytics_config = json.load(config_file)
            instance.intervals_both_dbs = [
                analytics_config["periodic_jobs"]["high_freq_db_period"],
                analytics_config["periodic_jobs"]["low_freq_db_period"],
            ]
            instance.intervals_high_freq_db = [
                analytics_config["periodic_jobs"]["high_freq_db_period"]
            ]
        except BaseException as err:
            logging.error("Cannot find db setting {}".format(err.args))
            return None

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

        # Raise error if no stats is returned
        empty_returns = True
        for query_return in query_returns.queryReturnList:
            for time_series_and_key in query_return.timeSeriesAndKeyList:
                if time_series_and_key.timeSeries:
                    empty_returns = False
                    break

        if empty_returns:
            raise ValueError("All read returns from BQS are empty")

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
        save_to_low_freq_db=False,
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
        save_to_low_freq_db: if False save stats to Beringei 30s only; If True, save to
                             both Beringei 30s and Beringei 900s.

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

        if save_to_low_freq_db:
            dest_db_intervals = self.intervals_both_dbs
        else:
            dest_db_intervals = self.intervals_high_freq_db

        stats_to_write = self.link_insight.construct_node_write_request(
            computed_stats,
            query_request_to_send,
            self.network_config,
            sample_duration_in_s,
            source_db_interval,
            stats_query_timestamp,
            dest_db_intervals,
            metric_name=metric_name,
        )
        self.beringei_db_access.write_node_and_agg_stats_beringei_db(stats_to_write)
        logging.info("Successfully write back to Beringei")

    def _write_network_stats_to_beringei(
        self,
        network_stats,
        source_db_interval,
        sample_duration_in_s,
        stats_query_timestamp,
        save_to_low_freq_db=False,
    ):
        """Write the computed network insight to the Beringei database via BQS.

        Args:
        network_stats: a dict that maps dict work key names (like "num_green_link")
                       to value.
        source_db_interval: int to indicate which Beringei database is read.
        sample_duration_in_s: sampling duration of the link stats.
        stats_query_timestamp: The time of the link stats computation. The sampling
        window is [stats_query_timestamp - sample_duration_in_s, stats_query_timestamp].
        save_to_low_freq_db: if False save stats to Beringei 30s only; If True, save to
                             both Beringei 30s and Beringei 900s.

        Return:
        void.
        """

        if save_to_low_freq_db:
            dest_db_intervals = self.intervals_both_dbs
        else:
            dest_db_intervals = self.intervals_high_freq_db

        network_write_request = self.link_insight.construct_network_stats_write_request(
            network_stats,
            sample_duration_in_s,
            source_db_interval,
            stats_query_timestamp,
            self.topology_name,
            dest_db_intervals,
        )

        self.beringei_db_access.write_node_and_agg_stats_beringei_db(
            network_write_request
        )
        logging.info("Successfully write network stats to Beringei")

    def link_mean_variance_pipeline(
        self,
        metric_names,
        sample_duration_in_s=3600,
        source_db_interval=30,
        dump_to_json=False,
        json_log_name_prefix="sample_log_",
        save_to_low_freq_db=False,
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
        save_to_low_freq_db: if False save stats to Beringei 30s only; If True, save to
                             both Beringei 30s and Beringei 900s.

        Return:
        Void.
        """

        logging.info(
            "Running the link mean and variance pipeline for: {} on {}".format(
                metric_names, self.topology_name
            )
        )
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
                save_to_low_freq_db=save_to_low_freq_db,
            )
        except ValueError as err:
            logging.error(
                "Error during mean and variance pipeline execution for "
                + "'{}'. Error: {}".format(self.topology_name, err.args)
            )
            return

        logging.info(
            "Link metric mean and variance pipeline execution finished for "
            + "'{}'".format(self.topology_name)
        )

    def traffic_stats_pipeline(
        self,
        sample_duration_in_s=3600,
        source_db_interval=30,
        dump_to_json=False,
        json_log_name_prefix="sample_log_",
        save_to_low_freq_db=False,
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
        save_to_low_freq_db: if False save stats to Beringei 30s only; If True, save to
                             both Beringei 30s and Beringei 900s.

        Return:
        Void.
        """

        logging.info(
            "Running the link traffic pipeline on '{}'".format(self.topology_name)
        )
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
                save_to_low_freq_db=save_to_low_freq_db,
            )
        except ValueError as err:
            logging.error(
                "Error during traffic pipeline execution for "
                + "'{}'. Error: {}".format(self.topology_name, err.args)
            )
            return

        logging.info(
            "Link traffic pipeline execution finished for "
            + "'{}'".format(self.topology_name)
        )

    def link_health_pipeline(
        self,
        sample_duration_in_s=3600,
        source_db_interval=30,
        green_cutoff_ratio=0.95,
        amber_cutoff_ratio=0.75,
        dump_to_json=False,
        json_log_name_prefix="sample_available_",
        save_to_low_freq_db=False,
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

        logging.info(
            "Running the link health pipeline on '{}'".format(self.topology_name)
        )
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
                save_to_low_freq_db=save_to_low_freq_db,
            )

            # Compute the network wide link health stats
            links_stats = self.link_insight.get_all_link_stats(computed_stats)
            network_health_stats = self.link_insight.get_link_health_num(
                links_stats,
                sample_duration_in_s,
                green_cutoff_ratio,
                amber_cutoff_ratio,
            )

            self._write_network_stats_to_beringei(
                network_health_stats,
                source_db_interval,
                sample_duration_in_s,
                stats_query_timestamp,
                save_to_low_freq_db=save_to_low_freq_db,
            )

        except ValueError as err:
            logging.error(
                "Error during health pipeline execution for "
                + "'{}'. Error: {}".format(self.topology_name, err.args)
            )
            return

        logging.info(
            "Link health pipeline execution finished for "
            + "'{}'".format(self.topology_name)
        )

    def link_foliage_pipeline(
        self,
        sample_duration_in_s=3600,
        source_db_interval=1,
        foliage_threshold=0.85,
        number_of_windows=5,
        min_window_size=20,
        minimum_var=0,
        dump_to_json=False,
        json_log_name_prefix="sample_foliage_",
        save_to_low_freq_db=False,
    ):
        """
        Calculate the level of covariance between forward link and reverse
        link of each link.
        """
        logging.info("Running the link foliage offset pipeline")
        if source_db_interval != 1:
            logging.warning("The foliage pipeline expects database with 1s")

        stats_query_timestamp = int(time.time())

        metric_names = ["stapkt.txpowerindex", "phystatus.srssi"]

        try:
            # Read the from the Beringei database, return type is RawQueryReturn
            read_returns, query_request_to_send = self._read_beringei(
                metric_names,
                stats_query_timestamp,
                sample_duration_in_s,
                source_db_interval,
            )

            computed_stats = self.link_insight.compute_link_foliage(
                read_returns,
                metric_names,
                self.link_macs_list,
                source_db_interval,
                number_of_windows,
                min_window_size,
                minimum_var,
            )

            self._write_beringei(
                dump_to_json,
                computed_stats,
                query_request_to_send,
                sample_duration_in_s,
                source_db_interval,
                stats_query_timestamp,
                json_log_name_prefix + "foliage.json",
                "foliage",
                save_to_low_freq_db=save_to_low_freq_db,
            )

            # Compute the network wide link foliage stats
            links_stats = self.link_insight.get_all_link_stats(computed_stats)
            network_foliage_stats = self.link_insight.get_link_foliage_num(
                links_stats, foliage_threshold, len(self.link_macs_list) / 2
            )

            self._write_network_stats_to_beringei(
                network_foliage_stats,
                source_db_interval,
                sample_duration_in_s,
                stats_query_timestamp,
                save_to_low_freq_db=save_to_low_freq_db,
            )

        except ValueError as err:
            logging.error(
                "Error during foliage pipeline execution for "
                + "'{}'. Error: {}".format(self.topology_name, err.args)
            )
            return

        logging.info(
            "Foliage pipeline execution finished for "
            + "'{}'".format(self.topology_name)
        )

    def link_interference_pipeline(
        self,
        sample_duration_in_s=600,
        source_db_interval=30,
        dump_to_json=False,
        json_log_name_prefix="sample_interference_",
        save_to_low_freq_db=False,
    ):
        """
        Calculate the snr, inr, sinr of each link based on the pathloss (via IM scan)
        and link beam index from physical periodic beamforming scan.
        """

        logging.info("Running the link interference pipeline")
        stats_query_timestamp = int(time.time())
        metric_names = [
            "phyperiodic.txbeamidx",
            "phyperiodic.rxbeamidx",
            "stapkt.txpowerindex",
        ]

        try:
            # Read the from the Beringei database, return type is RawQueryReturn
            read_returns, query_request_to_send = self._read_beringei(
                metric_names,
                stats_query_timestamp,
                sample_duration_in_s,
                source_db_interval,
            )

            # TODO: Since IM scan does not happen often, can potentially store a
            # copy of pathloss_map back to MySQL to reduce computation.
            pathloss_map, _ = self.scan_handler.get_pathloss_from_im_scan(
                self.topology_name
            )
            if not pathloss_map:
                raise ValueError("Cannot found any IM scan reports in MySQL")

            logging.info(
                "Obtained pathloss map of {} from IM scans".format(self.topology_name)
            )

            interference_stats = self.link_insight.compute_interference_stats(
                metric_names,
                self.link_macs_list,
                read_returns,
                pathloss_map,
                self.node_mac_to_polarity,
                self.node_mac_to_golay,
            )

            self._write_beringei(
                dump_to_json,
                interference_stats,
                query_request_to_send,
                sample_duration_in_s,
                source_db_interval,
                stats_query_timestamp,
                json_log_name_prefix + "interference.json",
                "interference",
                save_to_low_freq_db=save_to_low_freq_db,
            )

        except ValueError as err:
            logging.error(
                "Error during interference pipeline execution for "
                + "'{}'. Error: {}".format(self.topology_name, err.args)
            )
            return

        logging.info(
            "Link interference pipeline execution finished for "
            + "'{}'".format(self.topology_name)
        )


if __name__ == "__main__":
    try:
        with open(PathStore.ANALYTICS_CONFIG_FILE) as config_file:
            analytics_config = json.load(config_file)
    except BaseException as err:
        logging.error("Cannot load config with error {}".format(err.args))

    if len(sys.argv) != 3:
        logging.error("No pipeline or topology specified")

    link_pipeline = LinkPipeline(sys.argv[2])

    if sys.argv[1] == "link_mean_variance_pipeline":
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
    elif sys.argv[1] == "link_health_pipeline":
        job_config = analytics_config["pipelines"]["link_health_pipeline"]
        link_pipeline.link_health_pipeline(
            job_config["sample_duration_in_s"],
            job_config["source_db_interval"],
            job_config["green_cutoff_ratio"],
            job_config["amber_cutoff_ratio"],
        )
    elif sys.argv[1] == "link_foliage_pipeline":
        job_config = analytics_config["pipelines"]["link_foliage_pipeline"]
        link_pipeline.link_foliage_pipeline(
            job_config["sample_duration_in_s"],
            job_config["source_db_interval"],
            job_config["foliage_threshold"],
            job_config["number_of_windows"],
            job_config["min_window_size"],
            job_config["minimum_var"],
        )
    elif sys.argv[1] == "link_interference_pipeline":
        job_config = analytics_config["pipelines"]["link_interference_pipeline"]
        link_pipeline.link_interference_pipeline(
            job_config["sample_duration_in_s"], job_config["source_db_interval"]
        )
    else:
        logging.error("Unknown pipeline")
