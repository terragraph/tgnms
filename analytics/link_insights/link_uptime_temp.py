#!/usr/bin/env python3

# TODO: add functions back into link_insights and link_pipeline once they are landed

import logging
import time

from link_pipeline import LinkPipeline


def compute_link_uptime(read_returns, line_insight):
    """ Using a series of time series to find the rages that is valid for time
        matching.

        Args:
        read_returns: the read return from BQS, of type RawQueryReturn. The first
        key of each read query/return should be of metric "stapkt.linkavailable".

        Return:
        per_stats_returns: a 2-D list of stats. Each sub-list is of length 1
        and contain a dict which maps traffic insight key_names to computed values.
        Raise except on error.
    """

    per_stats_returns = []
    for per_link_return in read_returns.queryReturnList:
        per_link_return = per_link_return.timeSeriesAndKeyList
        # check the length should be equal
        # the First one is the link_alive_counter
        link_available_ts = per_link_return[0].timeSeries

        counters = [[dp.value] for dp in link_available_ts]
        time_stamps = [dp.unixTime for dp in link_available_ts]
        valid_windows = line_insight.get_valid_windows(counters, time_stamps)
        link_uptime = sum(
            window_end - window_start for window_start, window_end in valid_windows
        )
        per_values = {"link_uptime": link_uptime}
        per_stats_returns.append([per_values])

    return per_stats_returns


def link_uptime_pipeline(
    sample_duration_in_s=3600,
    source_db_interval=30,
    dump_to_json=False,
    json_log_name_prefix="sample_uptime_",
):
    """
    Compute the link uptime using the link

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

    # TODO: remove this once merge
    link_pipeline = LinkPipeline("tower G")
    # #######

    logging.info("Running the link traffic pipeline")
    stats_query_timestamp = int(time.time())
    try:
        # Read the from the Beringei database, return type is RawQueryReturn
        read_returns, query_request_to_send = link_pipeline._read_beringei(
            ["stapkt.linkavailable"],
            stats_query_timestamp,
            sample_duration_in_s,
            source_db_interval,
        )

        # TODO: link_pipeline.link_insight.compute_link_uptime
        computed_stats = compute_link_uptime(read_returns, link_pipeline.link_insight)
        print(computed_stats)

        link_pipeline._write_beringei(
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


if __name__ == "__main__":
    link_uptime_pipeline(dump_to_json=True)
