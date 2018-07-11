#!/usr/bin/env python3

""" Provide example which compute the link metrics mean/variance and
    generate the corresponding CDF of link stats mean/variance among links.
"""

# Walk around the XWindow issues for plotting
import matplotlib

matplotlib.use("Agg")

import matplotlib.pyplot as plt
import sys
import os
import json
import numpy as np

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from module.topology_handler import TopologyHelper
from link_insights.link_insight import LinkInsight
from link_insights.compute_link_insights import compute_link_insight


print("This is a example to get the links metric Beringei key_id of the whole network")
link_insight = LinkInsight()
topology_helper = TopologyHelper()
if not topology_helper:
    sys.exit("Cannot create TopologyHelper object")
# Utilize the get_network_wide_link_key_id_by_metric method  to find the
# key_ids of all links in a network
topology_reply = topology_helper.get_topology_from_api_service()
network_config = topology_helper.obtain_network_dict(topology_reply)
metric = "phystatus.ssnrest"
key_id_to_link_macs = link_insight.get_network_wide_link_key_id_by_metric(
    metric, network_config
)

# The maximum number of link key_id to macs and metric_name to print
REMIAN_PRINT_COUNT = 10
for key_id in key_id_to_link_macs:
    if REMIAN_PRINT_COUNT <= 0:
        break
    print(
        "key_id {} is for source_mac {}, peer_mac {}, metric_name {}".format(
            key_id,
            key_id_to_link_macs[key_id][0],
            key_id_to_link_macs[key_id][1],
            metric,
        )
    )
    REMIAN_PRINT_COUNT -= 1

# This is an example to directly construct query_request_to_send to send from
# Beringei key_id, the query_request_to_send can be directly used by
# BeringeiDbAccess.read_beringei_db to find the link stats:
# query_request_to_send = link_insight.construct_query_request(
#     key_option="key_id", key_id_list=list(key_id_to_link_macs.keys())
# )

print("This is a simple offline virtualization of the computed link metrics")
metric_names = ["phystatus.ssnrest", "stapkt.txpowerindex", "stapkt.mcs"]

# Run the file and generate JSON file that contains the computed link stats
compute_link_insight(metric_names, dump_to_json=True)

for metric in metric_names:
    # read from the JSON file
    json_file_name = "link-{}-stats.json".format(metric)
    try:
        with open(json_file_name) as json_file:
            link_stats = json.load(json_file)
    except Exception:
        print("Cannot found the JSON file of ", json_file_name)

    means, variances = [], []
    for key in link_stats.keys():
        per_link_stat = link_stats[key]

        # If no data reported, skip
        if per_link_stat["mean"] is None:
            continue

        means.append(per_link_stat["mean"])
        variances.append(per_link_stat["variance"])

    # plot the CDF of the computed stats across links
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

    plt.savefig("link-{}-Plot.pdf".format(metric))
    plt.close()
