#!/usr/bin/env python3.6
# Copyright 2004-present Facebook. All Rights Reserved.

import re
from statistics import mean, stdev


THROUGHPUT_DATA = "throughput_data"
IPERF_OUTPUT = "iperf_output"
LOST_DATA = "lost_data"
JITTER = "jitter"
LINK_ERROR = "link_error"
DURATION_LIST = "duration_list"

MINIMUM = "min"
MAXIMUM = "max"
MEAN = "mean"
STD = "std"


def process_iperf_response_bidirectional(response, expected_num_of_intervals):
    iperf_stats = {}
    iperf_throughput_data = []
    iperf_lost_data_percent = []
    iperf_jitter = []
    iperf_link_error = []

    for interval in response["intervals"][:expected_num_of_intervals]:
        if "omitted" in interval["sum"] and not interval["sum"]["omitted"]:
            # note the throughput received for this interval
            if "bits_per_second" in interval["sum"]:
                iperf_throughput_data.append(interval["sum"]["bits_per_second"])
            # note the jitter received for this interval
            if "jitter_ms" in interval["sum"]:
                iperf_jitter.append(interval["sum"]["jitter_ms"])
            # note the lost datagram percentage received for this interval
            if "lost_percent" in interval["sum"]:
                iperf_lost_data_percent.append(interval["sum"]["lost_percent"])
                # note the link error for this interval
                if not interval["sum"].get("lost_percent"):
                    iperf_link_error.append(0.0)
                else:
                    if "packets" in interval["sum"] and interval["sum"]["packets"]:
                        link_error = (
                            float(interval["sum"]["lost_packets"])
                            * 100
                            / int(interval["sum"]["packets"])
                        )
                    else:
                        link_error = 0.0
                    iperf_link_error.append(link_error)

    iperf_stats[THROUGHPUT_DATA] = iperf_throughput_data
    iperf_stats[LOST_DATA] = iperf_lost_data_percent
    iperf_stats[JITTER] = iperf_jitter
    iperf_stats[LINK_ERROR] = iperf_link_error
    return iperf_stats


def get_all_stats(input_list):
    detail_dict = {}

    try:
        # Populate dict
        detail_dict[MINIMUM] = min(input_list)
        detail_dict[MAXIMUM] = max(input_list)
        detail_dict[MEAN] = mean(input_list)
        detail_dict[STD] = stdev(input_list)
    except Exception:
        detail_dict[MINIMUM] = None
        detail_dict[MAXIMUM] = None
        detail_dict[MEAN] = None
        detail_dict[STD] = None

    return detail_dict


def parse_and_pack_iperf_data(input_data, expected_num_of_intervals):
    return_dict = {}
    # Parse the iperf output to get the throughput values
    # jitter, link errors for each second
    all_stats_dict = process_iperf_response_bidirectional(
        input_data, expected_num_of_intervals
    )
    # Get the throughput min, max, mean and std from the sample
    if THROUGHPUT_DATA in all_stats_dict:
        throughput_list = all_stats_dict[THROUGHPUT_DATA]
        # Get all the stats
        stats = get_all_stats(throughput_list)
        return_dict["throughput"] = stats

    # Get the link_error min, max, mean and std from the sample
    if LINK_ERROR in all_stats_dict:
        link_error_list = all_stats_dict[LINK_ERROR]
        # Get all the stats
        stats = get_all_stats(link_error_list)
        return_dict["link_errors"] = stats

    # Get the Jitter min, max, mean and std from the sample
    if JITTER in all_stats_dict:
        jitter_list = all_stats_dict[JITTER]
        # Get all the stats
        stats = get_all_stats(jitter_list)
        return_dict["jitter"] = stats

    # Get the Lost datagram min, max, mean and std from the sample
    if LOST_DATA in all_stats_dict:
        lost_datagram_list = all_stats_dict[LOST_DATA]
        # Get all the stats
        stats = get_all_stats(lost_datagram_list)
        return_dict["lost_datagram"] = stats

    return return_dict


def get_ping_statistics(ping_logs):
    return_dict = {}
    ping_statistics_line = None
    try:
        if len(ping_logs) > 0:
            line_array_list = ping_logs.split("\n")
            got_req_line = False
            len_line_array_list = len(line_array_list)

            while len_line_array_list > 0 and not got_req_line:
                len_line_array_list -= 1
                result = line_array_list[len_line_array_list].find("min/avg/max/mdev")
                if result > 0:
                    got_req_line = True
                    ping_statistics_line = line_array_list[len_line_array_list]

            if got_req_line and ping_statistics_line is not None:
                # Take out min/max/mean/std from ping response and
                # prepare dictionary for Ping Results
                values = re.search(
                    r"(.*)(min/avg/max/mdev)(\W*=\W*)(\d*.\d*)(/)(\d*.\d*)(/)(\d*.\d*)(/)(\d*.\d*)",
                    ping_statistics_line,
                )
                return_dict["min"] = values.group(4)
                return_dict["mean"] = values.group(6)
                return_dict["max"] = values.group(8)
                return_dict["std"] = values.group(10)

    except Exception as e:
        print(str(e))
    return return_dict
