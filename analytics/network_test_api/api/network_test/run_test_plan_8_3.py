#!/usr/bin/env python3.6
# Copyright 2004-present Facebook. All Rights Reserved.

import logging
import os
import queue
import random
import sys
import time
from datetime import date
from threading import Thread

from api.models import (
    TEST_STATUS_ABORTED,
    TEST_STATUS_RUNNING,
    WIRELESS,
    SingleHopTest,
    TestRunExecution,
)
from api.network_test.test_network import IperfObj, PingObj, TestNetwork
from django.db import transaction
from django.utils import timezone
from module.beringei_time_series import TimeSeries


sys.path.append(
    os.path.abspath(os.path.join(os.path.dirname(__file__), "..") + "/../../")
)
from module.insights import link_health
_log = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)


class RunTestPlan83(Thread):
    def __init__(self, network_parameters):
        Thread.__init__(self)
        self.controller_addr = network_parameters["controller_addr"]
        self.controller_port = network_parameters["controller_port"]
        self.network_info = network_parameters["network_info"]
        self.test_code = network_parameters["test_code"]
        self.topology_id = network_parameters["topology_id"]
        self.topology_name = network_parameters["topology_name"]
        self.topology = network_parameters["topology"]
        self.test_duration = network_parameters["test_duration"]
        self.test_push_rate = network_parameters["test_push_rate"]
        self.protocol = network_parameters["protocol"]
        self.status_error = False
        self.parameters = {}
        self.test_run_obj = None
        self.start_time = time.time()
        self.end_time = time.time() + network_parameters["test_duration"]
        self.test_status = None
        self.received_output = {}
        self.received_output_queue = queue.Queue()
        self.bidirectional = True

    def run(self):

        # Configure test data using test API
        test_list = self._test_8_3(self.topology)

        # Create the single hop test iperf records
        with transaction.atomic():
            test_run = TestRunExecution.objects.create(
                status=TEST_STATUS_RUNNING,
                test_code=self.test_code,
                topology_id=self.topology_id,
                topology_name=self.topology_name,
            )
            for link in test_list:
                link_id = SingleHopTest.objects.create(
                    test_run_execution=test_run, status=TEST_STATUS_RUNNING
                )
                link["id"] = link_id.id

        self.parameters = {
            "controller_addr": self.controller_addr,
            "controller_port": self.controller_port,
            "network_info": self.network_info,
            "test_run_id": test_run.id,
            "test_list": test_list,
        }

        # Create TestNetwork object and kick it off
        test_nw = TestNetwork(self.parameters, self.received_output_queue)
        test_nw.start()

        while test_nw.is_alive():
            if not self.received_output_queue.empty():
                self.received_output = self.received_output_queue.get()

        # wait until the TestNetwork thread ends (blocking call)
        test_nw.join()

        # Mark the end time of the test and get the status of the test from db
        try:
            self.test_run_obj = TestRunExecution.objects.get(
                pk=int(self.parameters["test_run_id"])
            )
            self.test_run_obj.end_date = timezone.now()
            self.test_run_obj.save()
            self.test_status = self.test_run_obj.status
        except Exception as ex:
            _log.error(
                "\nError in getting status of the test: {}".format(ex)
                + "\nSkipping writing Analytics stats to the db"
            )
            self.status_error = True
        if not self.status_error:
            if self.test_status == TEST_STATUS_ABORTED:
                _log.error(
                    "\nTest Aborted by User."
                    + "\nSkipping writing Analytics stats to the db.\n"
                )
            else:
                # get network wide analytics stats for the duration of the test
                _log.info("\nWriting Analytics stats to the db:")
                self._write_analytics_stats_to_db(
                    link_health(
                        links=self._create_time_series_list(),
                        network_info=self.parameters["network_info"],
                    )
                )

    def _create_time_series_list(self):
        time_series_list = []
        links = self.parameters["test_list"]
        direction = 2 if self.bidirectional else 1
        for atoz in range(0, len(links), direction):
            time_series_list.append(
                TimeSeries(
                    name="TEST_PLAN_8_3",
                    topology=self.topology_name,
                    times=[self.start_time, self.end_time],
                    values=[0, 0],
                    src_mac=links[atoz]["src_node_id"],
                    peer_mac=links[atoz]["dst_node_id"],
                )
            )
        return time_series_list

    def _write_analytics_stats_to_db(self, analytics_stats):
        # analytics_stats is list of Beringei TimeSeries objects
        for stats in analytics_stats:
            if stats.name == "link_health":
                link = self._get_link(stats.src_mac, stats.peer_mac)
                if link is not None:
                    link_db_obj = SingleHopTest.objects.filter(id=link["id"]).first()
                    if link_db_obj is not None:
                        with transaction.atomic():
                            link_db_obj.health = stats.values[0]
                            link_db_obj.save()

    def _get_link(self, source_node, destination_node):
        for link in self.parameters["test_list"]:
            if (
                link["src_node_id"] == source_node
                and link["dst_node_id"] == destination_node
            ):
                return link
        return None

    def _test_8_3(self, topology):
        """
        Test Name: Short Term Parallel Link Health
        Test Objective:  Verify that all links are healthy in the possible
                         presence of self interference
        """
        node_name_to_mac = {n["name"]: n["mac_addr"] for n in topology["nodes"]}
        node_mac_to_name = {n["mac_addr"]: n["name"] for n in topology["nodes"]}
        test_list = []
        links = topology["links"]
        for rand_index in random.sample(range(len(links)), len(links)):
            if links[rand_index]["link_type"] == WIRELESS:
                # a -> z direction
                test_dict = {}
                a_node_mac = node_name_to_mac[links[rand_index]["a_node_name"]]
                z_node_mac = node_name_to_mac[links[rand_index]["z_node_name"]]
                link_name = (
                    "link-"
                    + node_mac_to_name[a_node_mac]
                    + "-"
                    + node_mac_to_name[z_node_mac]
                )
                iperf_object = IperfObj(
                    link_name=link_name,
                    src_node_name=node_mac_to_name[a_node_mac],
                    dst_node_name=node_mac_to_name[z_node_mac],
                    src_node_id=a_node_mac,
                    dst_node_id=z_node_mac,
                    bitrate=self.test_push_rate,
                    time_sec=self.test_duration,
                    proto=self.protocol,
                    interval_sec=1,
                    window_size=4000000,
                    mss=7500,
                    no_delay=True,
                    omit_sec=0,
                    verbose=True,
                    json=False,
                    buffer_length=7500,
                    format=2,
                    use_link_local=True,
                )
                ping_object = PingObj(
                    link_name=link_name,
                    src_node_name=node_mac_to_name[a_node_mac],
                    dst_node_name=node_mac_to_name[z_node_mac],
                    src_node_id=a_node_mac,
                    dst_node_id=z_node_mac,
                    count=self.test_duration,
                    interval=1,
                    packet_size=64,
                    verbose=False,
                    deadline=self.test_duration + 10,
                    timeout=1,
                    use_link_local=True,
                )
                test_dict["src_node_id"] = a_node_mac
                test_dict["dst_node_id"] = z_node_mac
                test_dict["iperf_object"] = iperf_object
                test_dict["ping_object"] = ping_object
                test_dict["start_delay"] = 0
                test_dict["id"] = None
                test_list.append(test_dict)

                if self.bidirectional:
                    # z -> a direction
                    test_dict = {}
                    iperf_object = IperfObj(
                        link_name=link_name,
                        src_node_name=node_mac_to_name[z_node_mac],
                        dst_node_name=node_mac_to_name[a_node_mac],
                        src_node_id=z_node_mac,
                        dst_node_id=a_node_mac,
                        bitrate=self.test_push_rate,
                        time_sec=self.test_duration,
                        proto=self.protocol,
                        interval_sec=1,
                        window_size=4000000,
                        mss=7500,
                        no_delay=True,
                        omit_sec=0,
                        verbose=True,
                        json=False,
                        buffer_length=7500,
                        format=2,
                        use_link_local=True,
                    )
                    ping_object = PingObj(
                        link_name=link_name,
                        src_node_name=node_mac_to_name[z_node_mac],
                        dst_node_name=node_mac_to_name[a_node_mac],
                        src_node_id=z_node_mac,
                        dst_node_id=a_node_mac,
                        count=self.test_duration,
                        interval=1,
                        packet_size=64,
                        verbose=False,
                        deadline=self.test_duration + 10,
                        timeout=1,
                        use_link_local=True,
                    )
                    test_dict["src_node_id"] = z_node_mac
                    test_dict["dst_node_id"] = a_node_mac
                    test_dict["iperf_object"] = iperf_object
                    test_dict["ping_object"] = ping_object
                    test_dict["start_delay"] = 0
                    test_dict["id"] = None
                    test_list.append(test_dict)
        return test_list
