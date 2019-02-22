#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import enum
import time

from django.contrib.auth.models import User
from django.db import models
from django.utils import timezone


# Enum values of Tests correspond to Operator Network Level Test Plan section numbers
class Tests(enum.Enum):
    WIRELESS = 1
    SEQUENTIAL_TEST = 8.2
    PARALLEL_TEST = 8.3
    MULTI_HOP_TEST = 8.9


# Enum values for Traffic Direction
class TrafficDirection(enum.Enum):
    BIDIRECTIONAL = 1
    SOUTHBOUND = 2
    NORTHBOUND = 3


# Enum values for Test Status
class TestStatus(enum.Enum):
    RUNNING = 1
    FINISHED = 2
    ABORTED = 3
    FAILED = 4


class TestRunExecution(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True)
    start_date_utc = models.DateTimeField(default=timezone.now)
    end_date_utc = models.DateTimeField(null=True)
    status = models.IntegerField(
        default=0,
        choices=[(test_status.value, test_status.name) for test_status in TestStatus],
    )
    expected_end_time = models.IntegerField(default=time.time())
    test_code = models.CharField(max_length=120, blank=True, null=True)
    topology_id = models.IntegerField(null=True)
    topology_name = models.CharField(default="", max_length=256)

    class Meta:
        verbose_name = "Test Run Execution"
        verbose_name_plural = "Test Runs Executions"


class TestResult(models.Model):
    test_run_execution = models.ForeignKey(
        TestRunExecution, on_delete=models.CASCADE, null=True
    )
    status = models.IntegerField(
        default=0,
        choices=[(test_status.value, test_status.name) for test_status in TestStatus],
    )
    origin_node = models.CharField(default="", max_length=256)
    peer_node = models.CharField(default="", max_length=256)
    link_name = models.CharField(max_length=256)
    start_time = models.DateTimeField(null=True)
    end_time = models.DateTimeField(null=True)
    pathloss_avg = models.FloatField(null=True)
    foliage_factor = models.FloatField(null=True)
    health = models.IntegerField(null=True)
    early_weak_factor = models.FloatField(null=True)
    mcs_p90 = models.IntegerField(null=True)
    mcs_avg = models.FloatField(null=True)
    rssi_avg = models.FloatField(null=True)
    rssi_std = models.FloatField(null=True)
    snr_avg = models.FloatField(null=True)
    snr_std = models.FloatField(null=True)
    txpwr_avg = models.FloatField(null=True)
    txpwr_std = models.FloatField(null=True)
    num_tx_packets = models.IntegerField(null=True)
    num_rx_packets = models.IntegerField(null=True)
    tx_per = models.FloatField(null=True)
    rx_per = models.FloatField(null=True)
    tx_ba = models.IntegerField(null=True)
    rx_ba = models.IntegerField(null=True)
    tx_ppdu = models.IntegerField(null=True)
    rx_ppdu = models.IntegerField(null=True)
    rx_plcp_fail = models.IntegerField(null=True)
    rx_beam_idx = models.IntegerField(null=True)
    rx_rtcal_top_panel_beam = models.IntegerField(null=True)
    rx_rtcal_bot_panel_beam = models.IntegerField(null=True)
    rx_vbs_beam = models.IntegerField(null=True)
    rx_cbf_beam = models.IntegerField(null=True)
    tx_beam_idx = models.IntegerField(null=True)
    tx_rtcal_top_panel_beam = models.IntegerField(null=True)
    tx_rtcal_bot_panel_beam = models.IntegerField(null=True)
    tx_vbs_beam = models.IntegerField(null=True)
    tx_cbf_beam = models.IntegerField(null=True)
    link_up_time = models.IntegerField(null=True)
    link_available_time = models.IntegerField(null=True)
    num_link_up_flaps = models.IntegerField(null=True)
    num_link_avail_flaps = models.IntegerField(null=True)
    p2mp_flag = models.BooleanField(default=True)
    ping_avg_latency = models.FloatField(null=True)
    ping_loss = models.IntegerField(null=True)
    ping_max_latency = models.FloatField(null=True)
    ping_min_latency = models.FloatField(null=True)
    ping_pkt_rx = models.IntegerField(null=True)
    ping_pkt_tx = models.IntegerField(null=True)
    ping_output_blob = models.TextField(null=True, blank=True)
    iperf_pushed_throughput = models.FloatField(null=True)
    iperf_throughput_min = models.FloatField(null=True)
    iperf_throughput_max = models.FloatField(null=True)
    iperf_throughput_mean = models.FloatField(null=True)
    iperf_throughput_std = models.FloatField(null=True)
    iperf_link_error_min = models.FloatField(null=True)
    iperf_link_error_max = models.FloatField(null=True)
    iperf_link_error_mean = models.FloatField(null=True)
    iperf_link_error_std = models.FloatField(null=True)
    iperf_jitter_min = models.FloatField(null=True)
    iperf_jitter_max = models.FloatField(null=True)
    iperf_jitter_mean = models.FloatField(null=True)
    iperf_jitter_std = models.FloatField(null=True)
    iperf_lost_datagram_min = models.FloatField(null=True)
    iperf_lost_datagram_max = models.FloatField(null=True)
    iperf_lost_datagram_mean = models.FloatField(null=True)
    iperf_lost_datagram_std = models.FloatField(null=True)
    iperf_udp_flag = models.BooleanField(default=True)
    iperf_p90_tput = models.FloatField(null=True)
    iperf_client_blob = models.TextField(null=True, blank=True)
    iperf_server_blob = models.TextField(null=True, blank=True)
    is_ecmp = models.BooleanField(default=False)
    route_changed_count = models.IntegerField(default=0)
