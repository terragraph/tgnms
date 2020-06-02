#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

from ..models import NetworkTestHealth


def compute_node_health(
    expected_bitrate: int, iperf_avg_throughput: float
) -> NetworkTestHealth:
    """Compute the health of a node under test using simple traffic rate metrics."""
    iperf_tput_ratio = iperf_avg_throughput / expected_bitrate
    if iperf_tput_ratio >= 0.99:
        return NetworkTestHealth.EXCELLENT
    elif iperf_tput_ratio >= 0.95:
        return NetworkTestHealth.GOOD
    elif iperf_tput_ratio >= 0.75:
        return NetworkTestHealth.MARGINAL
    else:
        return NetworkTestHealth.POOR
