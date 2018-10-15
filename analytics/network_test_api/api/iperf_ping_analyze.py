#!/usr/bin/env python3.6
# Copyright 2004-present Facebook. All Rights Reserved.

import re
from statistics import mean, stdev
from decimal import Decimal

THROUGHPUT_DATA = 'throughput_data'
IPERF_OUTPUT = 'iperf_output'
LOST_DATA = 'lost_data'
JITTER = 'jitter'
LINK_ERROR = 'link_error'
DURATION_LIST = 'duration_list'

MINIMUM = 'min'
MAXIMUM = 'max'
MEAN = 'mean'
STD = 'std'


def process_iperf_response_bidirectional(response, is_threaded=False):
    iperf_stats = {}
    iperf_throughput_data = []
    iperf_real_data = []
    iperf_link_data = []
    iperf_jitter = []
    iperf_link_error = []
    iperf_duration = []
    count = 0

    for line in response.split("\n"):
        if (' sec ' in line and '/sec' in line and
           'datagrams received out-of-order' not in line):
            count += 1
            if not is_threaded or (is_threaded and '[SUM]' in line):
                # Get data of Bandwidth
                duration = re.findall('\d+\.\d+', line)
                if duration:
                    if len(duration) >= 2:
                        second = float(duration[1])
                        iperf_duration.append(int(second))

                m = re.search('([\d.]+) ([GMK]?)bits/sec', line)
                if m:
                    if 'G' in m.group(2):
                        bps = float(m.group(1)) * 1
                    elif 'M' in m.group(2):
                        bps = float(m.group(1)) * 1
                    elif 'K' in m.group(2):
                        bps = float(m.group(1)) * 1
                    else:
                        bps = float(m.group(1))
                    iperf_throughput_data.append(bps)

                # Get % data of Packet loss (link error)
                m = re.search('([\d.]+)%', line)
                if m:
                    link_error = float(m.group(1))
                    iperf_link_data.append(link_error)

                # Get Jitter Values
                m = re.search('([\d.]+) ms', line)
                if m:
                    temp_jitter = float(m.group(1))
                    iperf_jitter.append(temp_jitter)
                else:
                    iperf_jitter.append(0)

                total_packets = 0
                lost_packets = 0

                # Calculate packet loss
                m = re.search('([\d.]+) \(', line)
                if m:
                    total_packets = int(m.group(1))

                m = re.search('([\d.]+)/', line)
                if m:
                    lost_packets = int(m.group(1))

                if lost_packets == 0:
                    temp_link_error = 0
                    iperf_link_error.append(temp_link_error)
                else:
                    if total_packets > 0:
                        temp_link_error = (float(lost_packets) * 100 /
                                           int(total_packets))
                    else:
                        temp_link_error = 0.0
                    iperf_link_error.append(temp_link_error)

            iperf_real_data.append(line)

    iperf_stats[THROUGHPUT_DATA] = iperf_throughput_data
    iperf_stats[IPERF_OUTPUT] = iperf_real_data
    iperf_stats[LOST_DATA] = iperf_link_data
    iperf_stats[JITTER] = iperf_jitter
    iperf_stats[LINK_ERROR] = iperf_link_error
    # Make sure to get all the unique values
    iperf_stats[DURATION_LIST] = list(set(iperf_duration))

    return iperf_stats


def get_all_stats(input_list):
    detail_dict = {}

    if not input_list:
        return detail_dict

    try:
        # Populate dict
        detail_dict[MINIMUM] = min(input_list)
        detail_dict[MAXIMUM] = max(input_list)
        detail_dict[MEAN] = mean(input_list)
        detail_dict[STD] = stdev(input_list)

    except Exception as e:

        print(str(e))
        # Populate with 0
        detail_dict[MINIMUM] = None
        detail_dict[MAXIMUM] = None
        detail_dict[MEAN] = None
        detail_dict[STD] = None

    return detail_dict


def parse_and_pack_iperf_data(input_data):
    return_dict = {}
    # Parse the iperf output to get the throughput values
    # jitter, link errors for each second
    all_stats_dict = process_iperf_response_bidirectional(input_data,
                                                          is_threaded=False)
    # Get the throughput min, max, mean and std from the sample
    if THROUGHPUT_DATA in all_stats_dict:
        throughput_list = all_stats_dict[THROUGHPUT_DATA]
        # Get all the stats
        stats = get_all_stats(throughput_list)
        return_dict['throughput'] = stats

    # Get the link_error min, max, mean and std from the sample
    if LINK_ERROR in all_stats_dict:
        link_error_list = all_stats_dict[LINK_ERROR]
        # Get all the stats
        stats = get_all_stats(link_error_list)
        return_dict['link_errors'] = stats

    # Get the Jitter min, max, mean and std from the sample
    if JITTER in all_stats_dict:
        jitter_list = all_stats_dict[JITTER]
        # Get all the stats
        stats = get_all_stats(jitter_list)
        return_dict['jitter'] = stats

    # Get the Lost datagram min, max, mean and std from the sample
    if LOST_DATA in all_stats_dict:
        lost_datagram_list = all_stats_dict[LOST_DATA]
        # Get all the stats
        stats = get_all_stats(lost_datagram_list)
        return_dict['lost_datagram'] = stats

    return return_dict


def get_ping_statistics(ping_logs):
    return_dict = {}
    ping_statistics_line = None
    try:
        if len(ping_logs) > 0:
            line_array_list = ping_logs.split('\n')
            got_req_line = False
            len_line_array_list = len(line_array_list)

            while len_line_array_list > 0 and not got_req_line:
                len_line_array_list -= 1
                result = line_array_list[len_line_array_list].find(
                                                            'min/avg/max/mdev')
                if result > 0:
                    got_req_line = True
                    ping_statistics_line = line_array_list[len_line_array_list]

            if got_req_line and ping_statistics_line is not None:
                # Take out min/max/mean/std from ping response and
                # prepare dictionary for Ping Results
                values = re.search(r'(.*)(min/avg/max/mdev)(\W*=\W*)(\d*.\d*)(/)(\d*.\d*)(/)(\d*.\d*)(/)(\d*.\d*)',
                                   ping_statistics_line)
                return_dict["min"] = values.group(4)
                return_dict["mean"] = values.group(6)
                return_dict["max"] = values.group(8)
                return_dict["std"] = values.group(10)

    except Exception as e:
        print(str(e))
    return return_dict
