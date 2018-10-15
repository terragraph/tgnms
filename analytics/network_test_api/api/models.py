#!/usr/bin/env python3.6
# Copyright 2004-present Facebook. All Rights Reserved.

import time
from django.utils import timezone
from django.db import models
from django.contrib.auth.models import User

TEST_PLAN_EXECUTION_STATUS_RUNNING = 1
TEST_PLAN_EXECUTION_STATUS_FINISHED = 2
TEST_PLAN_EXECUTION_STATUS_ABORTED = 3

TEST_STATUS_RUNNING = 1
TEST_STATUS_FINISHED = 2
TEST_STATUS_ABORTED = 3

TEST_EXEC_RESULT_STATUS_RUNNING = 1
TEST_EXEC_RESULT_STATUS_FINISHED = 2
TEST_EXEC_RESULT_STATUS_ABORTED = 3

TEST_EXEC_RESULT_OUTCOME_PASSED = 1
TEST_EXEC_RESULT_OUTCOME_FAILED = 2
TEST_EXEC_RESULT_OUTCOME_UNKNOWN = 3

TEST_RUN_EXECUTION_STATUS_NOT_STARTED = 0
TEST_RUN_EXECUTION_STATUS_RUNNING = 1
TEST_RUN_EXECUTION_STATUS_FINISHED = 2
TEST_RUN_EXECUTION_STATUS_ABORTED = 3
TEST_RUN_EXECUTION_STATUS_FAILED = 4
TEST_RUN_EXECUTION_STATUS_PASS = 5
TEST_RUN_EXECUTION_STATUS_KILLED = 6
TEST_RUN_EXECUTION_STATUS_NETWORK_FAILURE = 7
TEST_RUN_EXECUTION_STATUS_ABORT_WITHOUT_LOGS = 8
TEST_RUN_EXECUTION_STATUS_SOFTWARE_UPDATE_FAILED = 9
TEST_RUN_EXECUTION_STATUS_ABORT_WITH_LOGS = 10
TEST_RUN_EXECUTION_STATUS_PREPARING = 11

# FALSE FAILURE
TEST_RUN_EXECUTION_STATUS_TIMEDOUT = 12
TEST_RUN_EXECUTION_STATUS_OS_ERROR = 13
TEST_RUN_EXECUTION_STATUS_EXCEPTIONS = 14
TEST_RUN_EXECUTION_STATUS_SSH_FAILURE = 15
TEST_RUN_EXECUTION_STATUS_PROCESS_FAILURE = 16
TEST_RUN_EXECUTION_STATUS_RESCHEDULED = 17

TEST_ACTION_OUTCOME_NOT_EXECUTED = -1
TEST_ACTION_OUTCOME_SUCCESS = 0
TEST_ACTION_OUTCOME_FAILURE = 1
TEST_ACTION_OUTCOME_IN_PROGRESS = 2

# FALSE FAILURE
TEST_ACTION_OUTCOME_TIMEDOUT = 10
TEST_ACTION_OUTCOME_OS_ERROR = 11
TEST_ACTION_OUTCOME_EXCEPTIONS = 12
TEST_ACTION_OUTCOME_SSH_FAILURE = 13
TEST_ACTION_OUTCOME_PROCESS_FAILURE = 14
TEST_ACTION_OUTCOME_OTHER_FAILURES = 15


TEST_STATUS = (
    (TEST_STATUS_RUNNING, 'Running'),
    (TEST_STATUS_FINISHED, 'Finished'),
    (TEST_STATUS_ABORTED, 'Aborted'),
)


class TestRunExecution(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True)
    start_date = models.DateTimeField(default=timezone.now)
    end_date = models.DateTimeField(null=True)
    status = models.IntegerField(default=0, choices=TEST_STATUS)
    expected_end_time = models.IntegerField(default=time.time())
    test_code = models.CharField(max_length=120, blank=True, null=True)

    class Meta:
        verbose_name = "Test Run Execution"
        verbose_name_plural = "Test Runs Executions"


class SingleHopTest(models.Model):
    test_run_execution = (models.ForeignKey(TestRunExecution,
                          on_delete=models.CASCADE, null=True))
    status = models.IntegerField(default=0, choices=TEST_STATUS)
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
