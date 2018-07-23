#!/usr/bin/env python3

""" Provide examples which compute the link metrics mean/variance and
    generate the corresponding link metrics mean/variance CDF across all links
    in the network.
"""


import matplotlib

# Walk around the XWindow issues for plotting
matplotlib.use("Agg")

import matplotlib.pyplot as plt
import sys
import os
import json
import numpy as np
import unittest
import logging

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from module.beringei_db_access import BeringeiDbAccess
from module.topology_handler import TopologyHelper
from module.mysql_db_access import MySqlDbAccess
from link_insights.link_insight import LinkInsight
from link_insights.link_pipeline import LinkPipeline


class TestLinkInsights(unittest.TestCase):
    def __init__(self, *args, **kwargs):
        super(TestLinkInsights, self).__init__(*args, **kwargs)
        try:
            mysql_db_access = MySqlDbAccess()
            if mysql_db_access is None:
                raise ValueError("Cannot create MySqlDbAccess object")
            api_service_config = mysql_db_access.read_api_service_setting()
            # Just use the first topology in the MySQL table for testing
            self.topology_name = list(api_service_config.keys())[0]
        except BaseException as err:
            self.fail("Cannot load topology from the api_service", err.args)

        logging.info("Using topology of {} for tests".format(self.topology_name))
        self.link_pipeline = LinkPipeline(self.topology_name)

    def test_link_insight_visualization(self):
        """ This is a simple offline visualization to plot the mean/variance CDF
            of selected metrics across the network.
        """
        metric_names = ["phystatus.ssnrest", "stapkt.mcs"]

        json_log_name_prefix = "link_stats_"

        # Compute the insights and generate json file that contains the
        # interested link metric mean/variance
        self.link_pipeline.naive_link_pipeline(
            metric_names, dump_to_json=True, json_log_name_prefix=json_log_name_prefix
        )

        for metric in metric_names:
            stats_key_to_stats = self._extract_network_wide_stats(
                ["mean", "variance"],
                json_log_name_prefix + "naive.json",
                source_metric_name_filter=metric,
            )

            # Check that there is at least 1 link with its stats computed
            for key in stats_key_to_stats:
                self.assertTrue(stats_key_to_stats[key])

            # Plot the CDF of the computed stats across links
            save_fig_name = json_log_name_prefix + metric + "_plot.pdf"
            self._plot_network_wide_cdf(stats_key_to_stats, save_fig_name=save_fig_name)

            # Check that the figure is output
            self.assertTrue(os.path.isfile(save_fig_name))

    def test_query_stats_by_beringei_key_id(self):
        """ This is an example to directly construct query_request_to_send from
            Beringei key_id, the query_request_to_send is then used by
            BeringeiDbAccess.read_beringei_db to read raw link stats.
        """
        logging.info("-" * 10 + "test_query_stats_by_beringei_key_id starts" + "-" * 10)
        logging.info("running for topology of: " + self.topology_name)

        link_insight = LinkInsight()
        topology_helper = TopologyHelper(topology_name=self.topology_name)
        if not topology_helper:
            raise ValueError("Cannot create TopologyHelper object")
        beringei_db_access = BeringeiDbAccess()
        if not beringei_db_access:
            raise ValueError("Cannot create BeringeiDbAccess object")

        topology_reply = topology_helper.get_topology_from_api_service()
        network_config = topology_helper.obtain_network_dict(topology_reply)

        metric = "phystatus.ssnrest"
        key_id_to_link_macs = link_insight.get_network_wide_link_key_id_by_metric(
            self.topology_name, metric, network_config
        )

        # Raise exception if no key_id is found
        self.assertTrue(key_id_to_link_macs)

        # The maximum number of link key_ids to macs and metric_name to print
        remain_print_count = 5
        for key_id in key_id_to_link_macs:
            if remain_print_count <= 0:
                break
            logging.info(
                "key_id {} is for source_mac {}, peer_mac {}, metric_name {}".format(
                    key_id,
                    key_id_to_link_macs[key_id][0],
                    key_id_to_link_macs[key_id][1],
                    metric,
                )
            )
            remain_print_count -= 1

        query_request_to_send = link_insight.construct_query_request(
            self.topology_name,
            key_option="key_id",
            key_ids=list(key_id_to_link_macs.keys()),
        )

        try:
            query_returns = beringei_db_access.read_beringei_db(query_request_to_send)
        except ValueError as err:
            raise ValueError("Read Beringei database error:", err.args)

        # Check that the read query return is non-empty
        self.assertTrue(query_returns.queryReturnList)
        logging.info(
            "Send queries for {} links, get {} query returns".format(
                len(query_request_to_send.queries), len(query_returns.queryReturnList)
            )
        )

    def test_link_traffic_visualization(self):
        """ This is a simple offline visualization to plot the CDF
            of link traffic related metrics across the network.
        """

        json_log_name_prefix = "temp_traffic_"

        # Compute the insights and generate json file which contains the
        # traffic insights, including "PPS" and "PER"
        self.link_pipeline.traffic_stats_pipeline(
            dump_to_json=True, json_log_name_prefix=json_log_name_prefix
        )

        stats_key_to_stats = self._extract_network_wide_stats(
            ["PPS", "PER"], json_log_name_prefix + "traffic.json"
        )

        # For each stats, check that there is at least 1 link with its stats computed
        for key in stats_key_to_stats:
            self.assertTrue(stats_key_to_stats[key])

        # Plot the CDF of the computed stats across links
        save_fig_name = json_log_name_prefix + "plot.pdf"
        self._plot_network_wide_cdf(stats_key_to_stats, save_fig_name=save_fig_name)

        # Check that the figure is output
        self.assertTrue(os.path.isfile(save_fig_name))

    def test_get_valid_windows(self):
        """ This test includes test cases for get_valid_windows() method in
            LinkInsight class.
        """

        test_len = 120
        interval = 30
        counter_increase_interval = 25.6  # 25.6 ms
        counter_delta = int(interval * 1000 / counter_increase_interval)

        # Case 0: ideal case, the counters are increasing at expected speed
        counter_tuples = [[0, counter_delta * i, 0] for i in range(test_len)]
        time_stamps = [interval * i for i in range(test_len)]

        valid_windows = self.link_pipeline.link_insight.get_valid_windows(
            counter_tuples, time_stamps, allowed_time_off_in_s=0.1
        )
        self.assertEqual(valid_windows, [[0, (test_len - 1) * interval]])

        # Case1: two of the reported samples is off-ed by 1s, 5s in fw, but timestamp
        # from Beringei is un-changed
        off_dp_idx0 = int(test_len / 3)
        off_dp_idx1 = int(test_len / 3) * 2
        counter_tuples[off_dp_idx0][1] += 1 * 1000 / counter_increase_interval
        counter_tuples[off_dp_idx1][1] -= 5 * 1000 / counter_increase_interval

        # Case1.1: In this case, both sampled points of off_dp_idx0 and off_dp_idx1 are
        # considered invalid. This is because that their time_off both exceed the
        # allowed offset of 0.5 seconds.
        valid_windows = self.link_pipeline.link_insight.get_valid_windows(
            counter_tuples, time_stamps, allowed_time_off_in_s=0.5
        )
        self.assertEqual(
            valid_windows,
            [
                [0, (off_dp_idx0 - 1) * interval],
                [(off_dp_idx0 + 1) * interval, (off_dp_idx1 - 1) * interval],
                [(off_dp_idx1 + 1) * interval, (test_len - 1) * interval],
            ],
        )

        # Case1.2: In this case, the sampled point with off_dp_idx0 is considered valid.
        # But off_dp_idx1 is considered invalid because its time_off exceed the
        # allowed time of 2 seconds.
        valid_windows = self.link_pipeline.link_insight.get_valid_windows(
            counter_tuples, time_stamps, allowed_time_off_in_s=2
        )
        self.assertEqual(
            valid_windows,
            [
                [0, (off_dp_idx1 - 1) * interval],
                [(off_dp_idx1 + 1) * interval, (test_len - 1) * interval],
            ],
        )

        # Case 3: there is indeed a reset in middle
        # In this case, the sampled point with off_dp_idx1 is still considered invalid
        # and its left and right neighbors are removed. The interval during the
        # reset is removed.
        len_to_pad = 10
        counter_tuples += [[0, counter_delta * i, 0] for i in range(len_to_pad)]
        time_stamps = [interval * i for i in range(test_len + len_to_pad)]
        valid_windows = self.link_pipeline.link_insight.get_valid_windows(
            counter_tuples, time_stamps, allowed_time_off_in_s=2
        )
        self.assertEqual(
            valid_windows,
            [
                [0, (off_dp_idx1 - 1) * interval],
                [(off_dp_idx1 + 1) * interval, (test_len - 1) * interval],
                [test_len * interval, (test_len + len_to_pad - 1) * interval],
            ],
        )

    def _extract_network_wide_stats(
        self, keys_of_interest, json_file_name, source_metric_name_filter=None
    ):
        """ Extract stats from a json file that is generated by a link pipeline.

        Args:
        keys_of_interest: a list of interested computed stats, each element is like
        "mean" or "PPS".
        json_file_name: name of the json file that is generated by the link pipelines.
        source_metric_name_filter: If not None, will extract keys_of_interest that
        is computed from the source_metric_name_filter. If None, will extract
        keys_of_interest that is computed using any metrics.

        Return:
        stats_key_to_stats: dict, with keys being the computed stats, like "mean"
        "PPS", and the dict values are a lists. Each value in a list is the computed
        stats of a link.
        """

        # Do not need try catch here since it is directly used for tests
        with open(json_file_name) as json_file:
            link_stats = json.load(json_file)

        stats_key_to_stats = {}
        for key in keys_of_interest:
            stats_key_to_stats[key] = []
        for query_idx in link_stats.keys():
            per_query_stat = link_stats[query_idx]
            for query_key_idx in per_query_stat:
                per_link_stat = per_query_stat[query_key_idx]
                if (
                    source_metric_name_filter is not None
                    and source_metric_name_filter != per_link_stat["metric_name"]
                ):
                    continue
                for key in stats_key_to_stats.keys():
                    if key not in per_link_stat:
                        # If do not have needed stats computed, skip
                        continue
                    else:
                        stats_key_to_stats[key].append(per_link_stat[key])

        return stats_key_to_stats

    def _plot_network_wide_cdf(
        self, stats_key_to_stats, save_fig_name="save_to_fig.pdf"
    ):
        """Visualize network wide CDF of the computed link stats.

           Args:
           stats_key_to_stats: dict, which maps computed stats keys to a value list.
           Each value in the value list denotes the computed stats of a link in
           the network.
           save_fig_name: name of the CDF plot output.

           Return:
           void.
        """
        percentages = np.arange(1, 100, 1)
        key_to_percentile = {}
        for key in stats_key_to_stats:
            key_to_percentile[key] = [
                np.percentile(stats_key_to_stats[key], p) for p in percentages
            ]

        num_sub_plot = len(key_to_percentile)
        sub_plot_idx = 1
        for key in key_to_percentile:
            plt.subplot(1, num_sub_plot, sub_plot_idx)
            plt.plot(key_to_percentile[key], percentages, "b-")
            plt.xlabel(key)
            if sub_plot_idx == 1:
                plt.ylabel("Percentages (%)")
            sub_plot_idx += 1

        plt.savefig(save_fig_name)
        logging.info("Saving fig to " + save_fig_name)
        plt.close()

    def test_link_uptime_pipeline(self):
        """ This is a simple offline visualization to plot the CDF
            of link uptime distribution of all links across the network.
        """

        json_log_name_prefix = "temp_uptime_"

        # Compute the insights and generate a json file which contains the link_uptime
        self.link_pipeline.link_uptime_pipeline(
            dump_to_json=True, json_log_name_prefix=json_log_name_prefix
        )

        stats_key_to_stats = self._extract_network_wide_stats(
            ["link_uptime"], json_log_name_prefix + "uptime.json"
        )

        self.assertTrue(stats_key_to_stats["link_uptime"])

        # Plot the CDF of the computed stats across links
        save_fig_name = json_log_name_prefix + "plot.pdf"
        self._plot_network_wide_cdf(stats_key_to_stats, save_fig_name=save_fig_name)

        # Check that the figure is output
        self.assertTrue(os.path.isfile(save_fig_name))

if __name__ == "__main__":
    # TODO: remove later
    # logging.basicConfig(
    #     format="%(asctime)s %(levelname)-8s %(message)s",
    #     level=logging.INFO,
    #     datefmt="%Y-%m-%d %H:%M:%S",
    # )
    logging.basicConfig(filename='run_log.log',level=logging.DEBUG)
    unittest.main()
