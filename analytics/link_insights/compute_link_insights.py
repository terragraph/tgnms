#!/usr/bin/env python3

""" Using LinkInsight and JobScheduler classes to compute the link stats
    periodically. Currently only compute link metric mean and variance.
"""

import sys
import os
import time
from datetime import datetime
import pytz

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from module.topology_handler import TopologyHelper
from module.beringei_db_access import BeringeiDbAccess
from link_insights.link_insight import LinkInsight
from module.job_scheduler import JobScheduler


def compute_link_insight(
    metric_names,
    topology_name="tower G",
    sample_duration_in_s=3600,
    source_db_interval=30,
    dump_to_json=False,
    json_log_name_prefix="sample_log_",
    stats_query_timestamp=None,
):
    """
    Read link stats from BQS and compute link stats. Currently compute mean
    and variance.

    Args:
    metric_names: metrics list, each metric is like "phystatus.ssnrest".
    topology_name: the setup network of interest, like "tower G".
    sample_duration_in_s: duration of the samples, for example 3600 means use
                          1 hour data points for each link.
    source_db_interval: the resolution of the database read from, 30 means
                        beringei_30s database.
    dump_to_json: If True, save a copy of the link stats to JSON;
                  If False, don't save to JSON.
    json_log_name_prefix: prefix of the output JSON log file, only used if dump_to_json.
    stats_query_timestamp: The time of the link stats computation. The sampling
    window is [stats_query_timestamp - sample_duration_in_s, stats_query_timestamp].

    Return:
    No return.
    """

    print("Computing link insight for metrics: ", metric_names)
    date = datetime.now(tz=pytz.utc)
    date = date.astimezone(pytz.timezone("US/Pacific"))
    print("Current CA time is  :", date.strftime("%m/%d/%Y %H:%M:%S %Z"))

    if dump_to_json:
        print("Will dump a copy to JSON for debugging")

    link_insight = LinkInsight()
    topology_helper = TopologyHelper()
    if not topology_helper:
        print("Cannot create TopologyHelper object")
        return
    beringei_db_access = BeringeiDbAccess()
    if not beringei_db_access:
        print("Cannot create BeringeiDbAccess object")
        return

    # Obtain the network config
    topology_reply = topology_helper.get_topology_from_api_service()
    network_config = topology_helper.obtain_network_dict(topology_reply)
    if stats_query_timestamp is None:
        stats_query_timestamp = int(time.time())

    for metric in metric_names:
        print("Examining the link metrics of " + metric)

        link_macs_list = list(network_config["link_macs_to_name"].keys())

        # Construct the query with metric information. BQS finds out the
        # right Beringei key_id by link_metric during read_beringei_db
        query_request_to_send = link_insight.construct_query_request(
            key_option="link_metric",
            link_macs_list=link_macs_list,
            topology_name=topology_name,
            metric_name=metric,
            start_ts=stats_query_timestamp - sample_duration_in_s,
            end_ts=stats_query_timestamp,
            source_db_interval=source_db_interval,
        )

        # Read the from the Beringei database, return type is RawQueryReturn
        try:
            query_returns = beringei_db_access.read_beringei_db(query_request_to_send)
        except ValueError as err:
            print("Read Beringei database error:", err.args)
            return

        computed_stats = link_insight.compute_timeseries_avg_and_var(query_returns)

        if dump_to_json:
            link_insight.dump_link_stats_to_json(
                computed_stats,
                query_request_to_send,
                network_config,
                metric,
                sample_duration_in_s,
                source_db_interval,
                stats_query_timestamp,
                json_log_name=json_log_name_prefix + metric + ".json",
            )

        # Construct the message with computed insights and write to Beringei database
        # via BQS
        try:
            stats_to_write = link_insight.construct_write_request(
                computed_stats,
                query_request_to_send,
                network_config,
                metric,
                sample_duration_in_s,
                source_db_interval,
                stats_query_timestamp,
            )
            beringei_db_access.write_beringei_db(stats_to_write)
        except ValueError as err:
            print("Failed to write back to Beringei database", err.args)
            return


if __name__ == "__main__":
    metric_names = ["phystatus.ssnrest", "stapkt.txpowerindex", "stapkt.mcs"]

    job_scheduler = JobScheduler()

    # Schedule link_insight jobs to run in the next 12 hours
    max_run_time_in_s = 24 * 60 * 60
    # Run once every 2 mins
    period_in_s = 2 * 60

    num_of_jobs_to_submit = max_run_time_in_s / period_in_s
    print(
        "Schedule link_insights jobs with periodicity"
        + "of {} mins for the next {} hours".format(
            period_in_s / 60, max_run_time_in_s / 3600
        )
    )
    # Submit job via job_scheduler
    job_scheduler.schedule_periodic_jobs(
        compute_link_insight,
        period_in_s=period_in_s,
        num_of_jobs_to_submit=num_of_jobs_to_submit,
        job_input=[metric_names],
    )
