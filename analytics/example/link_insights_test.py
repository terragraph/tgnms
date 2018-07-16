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
from link_insights.link_insight import LinkInsight
from link_insights.compute_link_insights import compute_link_insight


class TestLinkInsights(unittest.TestCase):
    def __init__(self, *args, **kwargs):
        super(TestLinkInsights, self).__init__(*args, **kwargs)
        self.topology_name = "tower G"

    def test_link_insight_visualization(self):
        """ This is a simple offline visualization to plot the mean/variance CDF
            of a selected metric across the network.
        """
        metric_names = ["phystatus.ssnrest"]

        json_log_name_prefix = "link_stats_"

        # Compute the insights and generate JSON file which contains the
        # interested link metric insights
        compute_link_insight(
            metric_names,
            self.topology_name,
            dump_to_json=True,
            json_log_name_prefix=json_log_name_prefix,
        )

        for metric in metric_names:
            # Read from the logged JSON file
            json_file_name = json_log_name_prefix + metric + ".json"
            try:
                with open(json_file_name) as json_file:
                    link_stats = json.load(json_file)
            except Exception:
                logging.error("Cannot found the JSON file of ", json_file_name)

        means = []
        variances = []
        for query_idx in link_stats.keys():
            per_query_stat = link_stats[query_idx]
            for query_key_idx in per_query_stat:
                per_link_stat = per_query_stat[query_key_idx]
                if "mean" not in per_link_stat or "variance" not in per_link_stat:
                    # If do not have link mean/variance computed, skip
                    continue
                means.append(per_link_stat["mean"])
                variances.append(per_link_stat["variance"])

        # Check that there is at least 1 link with its stats mean computed
        self.assertTrue(means)

        # Plot the CDF of the computed stats across links
        percentages = np.arange(1, 100, 1)

        mean_percentiles = [np.percentile(means, p) for p in percentages]
        var_percentiles = [np.percentile(variances, p) for p in percentages]

        plt.subplot(1, 2, 1)
        plt.plot(mean_percentiles, percentages, "b-")
        plt.xlabel(metric + " mean")
        plt.ylabel("Percentages (%)")

        plt.subplot(1, 2, 2)
        plt.plot(var_percentiles, percentages, "r-")
        plt.xlabel(metric + " variance")

        plt.savefig(json_log_name_prefix + "plot.pdf".format(metric))
        plt.close()

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


if __name__ == "__main__":
    logging.basicConfig(
        format="%(asctime)s %(levelname)-8s %(message)s",
        level=logging.INFO,
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    unittest.main()
