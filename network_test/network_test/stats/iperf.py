#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import dataclasses
import json
import logging
from statistics import mean
from typing import Dict, Optional

from terragraph_thrift.Controller.ttypes import IperfTransportProtocol


@dataclasses.dataclass
class ParsedIperfMsg:
    """Struct for representing parsed iperf messages."""

    session_id: str
    src_node_id: str
    dst_node_id: str
    options: Dict
    is_server: bool
    output: Dict


def parse_msg(msg: str) -> Optional[ParsedIperfMsg]:
    """Parse the raw string kafka output into a user-friendly struct."""
    try:
        parsed_msg = json.loads(msg)
        if any(k not in parsed_msg for k in ["isServer", "startIperf", "output"]):
            logging.error(f"Kafka message value is missing keys: {msg}")
            return None

        parsed_output = json.loads(parsed_msg["output"])
    except json.JSONDecodeError:
        logging.exception(f"Kafka message value is not valid JSON: {msg}")
        return None

    return ParsedIperfMsg(
        session_id=parsed_msg["startIperf"]["id"],
        src_node_id=parsed_msg["startIperf"]["iperfConfig"]["srcNodeId"],
        dst_node_id=parsed_msg["startIperf"]["iperfConfig"]["dstNodeId"],
        options=parsed_msg["startIperf"]["iperfConfig"]["options"],
        is_server=parsed_msg["isServer"],
        output=parsed_output,
    )


def compute_iperf_stats(parsed: ParsedIperfMsg) -> Dict:
    return (
        compute_tcp_iperf_stats(parsed)
        if parsed.options["protocol"] == IperfTransportProtocol.TCP
        else compute_udp_iperf_stats(parsed)
    )


def compute_tcp_iperf_stats(parsed: ParsedIperfMsg) -> Dict:
    """Derive 'throughput' and 'retransmits' stats from the iperf output.

    The 'throughput' data is extracted from the server output and the 'retransmit'
    information is extracted from the client output.
    """
    if parsed.is_server:
        throughput = []
        for interval in parsed.output["intervals"][:-1]:
            if not interval["sum"]["omitted"]:
                throughput.append(interval["sum"]["bits_per_second"])

        return {
            "iperf_max_throughput": max(throughput),
            "iperf_min_throughput": min(throughput),
            "iperf_avg_throughput": mean(throughput),
        }
    else:
        retransmits = []
        for interval in parsed.output["intervals"][:-1]:
            if not interval["sum"]["omitted"]:
                retransmits.append(interval["sum"]["retransmits"])

        return {
            "iperf_max_retransmits": max(retransmits),
            "iperf_min_retransmits": min(retransmits),
            "iperf_avg_retransmits": mean(retransmits),
        }


def compute_udp_iperf_stats(parsed: ParsedIperfMsg) -> Dict:
    """Derive 'throughput' and 'lost_percent' stats from the iperf server output.

    The iperf client output is unused for computing UDP stats.
    """
    if not parsed.is_server:
        return {}

    throughput = []
    lost_percent = []
    for interval in parsed.output["intervals"][:-1]:
        if not interval["sum"]["omitted"]:
            throughput.append(interval["sum"]["bits_per_second"])
            lost_percent.append(interval["sum"]["lost_percent"])

    return {
        "iperf_max_throughput": max(throughput),
        "iperf_min_throughput": min(throughput),
        "iperf_avg_throughput": mean(throughput),
        "iperf_max_lost_percent": max(lost_percent),
        "iperf_min_lost_percent": min(lost_percent),
        "iperf_avg_lost_percent": mean(lost_percent),
    }
