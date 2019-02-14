#!/usr/bin/env python3
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
    SingleHopTest,
    TestRunExecution,
    Tests,
    TestStatus,
    TrafficDirection,
)
from api.network_test.test_network import IperfObj, PingObj, TestNetwork
from django.db import transaction
from django.utils import timezone


sys.path.append(
    os.path.abspath(os.path.join(os.path.dirname(__file__), "..") + "/../../")
)
from module.beringei_time_series import TimeSeries
from module.insights import link_health

_log = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)


class RunSequentialTestPlan(Thread):
    """
        * controller_addr: IP address of the E2E Controller
        * controller_port: Port address of the E2E Controller
        * network_info: Contains Network information (controller and topology)
            of the topology_id specified by User (UI)
        * test_code {8.2/8.3/8.9}: ID corresponding to the Test Plan.
                                   Specified by User (UI)
        * topology_id: ID corresponding to the Topology. Specified by User (UI)
        * topology_name: Name of selected Topology
        * topology: Topology information extracted from network_info
        * session_duration {seconds}: Duration of each iperf/ping session.
                               Specified by User (UI)
        * test_push_rate {bps}: Throughput push rate for iPerf.
                                Specified by User (UI)
        * protocol {TCP/UDP}: iPerf traffic protocol. Specified by User (UI)
    """

    def __init__(self, network_parameters):
        Thread.__init__(self)
        self.controller_addr = network_parameters["controller_addr"]
        self.controller_port = network_parameters["controller_port"]
        self.network_info = network_parameters["network_info"]
        self.test_code = network_parameters["test_code"]
        self.topology_id = network_parameters["topology_id"]
        self.topology_name = network_parameters["topology_name"]
        self.topology = network_parameters["topology"]
        self.session_duration = network_parameters["session_duration"]
        self.test_push_rate = network_parameters["test_push_rate"]
        self.protocol = network_parameters["protocol"]
        self.direction = TrafficDirection.BIDIRECTIONAL.value
        self.parameters = {}
        self.test_run_obj = None
        self.start_time = time.time()
        self.received_output = {}
        self.received_output_queue = queue.Queue()
        self.links = []
        self.interval_sec = 1

    def run(self):

        # Configure test data using test API
        test_list = self._sequential_test(self.topology)

        # Create the single hop test iperf records
        with transaction.atomic():
            test_run = TestRunExecution.objects.create(
                status=TestStatus.RUNNING.value,
                test_code=self.test_code,
                topology_id=self.topology_id,
                topology_name=self.topology_name,
            )
            for link in test_list:
                link_id = SingleHopTest.objects.create(test_run_execution=test_run)
                link["id"] = link_id.id

        self.parameters = {
            "controller_addr": self.controller_addr,
            "controller_port": self.controller_port,
            "network_info": self.network_info,
            "test_run_id": test_run.id,
            "test_list": test_list,
            "session_duration": self.session_duration,
            "expected_num_of_intervals": self.session_duration * self.interval_sec,
            "topology": self.topology,
            "test_code": self.test_code,
        }

        # Create TestNetwork object and kick it off
        test_nw = TestNetwork(self.parameters, self.received_output_queue)
        test_nw.start()

        while test_nw.is_alive():
            if not self.received_output_queue.empty():
                self.received_output = self.received_output_queue.get()
                if self.received_output["traffic_type"] == "IPERF_OUTPUT":
                    rcvd_src_node = self.received_output["source_node"]
                    rcvd_dest_node = self.received_output["destination_node"]
                    if self.direction == TrafficDirection.BIDIRECTIONAL.value:
                        if (rcvd_src_node, rcvd_dest_node) not in self.links and (
                            rcvd_dest_node,
                            rcvd_src_node,
                        ) not in self.links:
                            self.links.append((rcvd_src_node, rcvd_dest_node))
                        else:
                            try:
                                self.links.remove((rcvd_src_node, rcvd_dest_node))
                            except ValueError:
                                self.links.remove((rcvd_dest_node, rcvd_src_node))
                            # get analytics stats for both drections
                            self._db_stats_wrapper(rcvd_src_node, rcvd_dest_node)
                    else:
                        # get analytics stats for one drection
                        self._db_stats_wrapper(rcvd_src_node, rcvd_dest_node)

        # wait until the TestNetwork thread ends (blocking call)
        test_nw.join()

        # get analytics stats for remaining links
        if self.links:
            for links in self.links:
                self._db_stats_wrapper(links[0], links[1])

        # Mark the end time of the test in db
        try:
            self.test_run_obj = TestRunExecution.objects.get(
                pk=int(self.parameters["test_run_id"])
            )
            self.test_run_obj.end_date_utc = timezone.now()
            self.test_run_obj.save()
        except Exception as ex:
            _log.error("\nError setting end_date of the test: {}".format(ex))

    def _db_stats_wrapper(self, rcvd_src_node, rcvd_dest_node):
        _log.info("\nWriting Analytics stats to the db:")
        link = self._get_link(rcvd_src_node, rcvd_dest_node)
        link_start_time = self.start_time + link["start_delay"]
        link_end_time = link_start_time + self.session_duration
        self._write_analytics_stats_to_db(
            link_health(
                links=self._create_time_series_list(
                    link=link, start_time=link_start_time, end_time=link_end_time
                ),
                network_info=self.parameters["network_info"],
            )
        )

    def _create_time_series_list(self, link, start_time, end_time):
        time_series_list = []
        # for link in self.parameters['test_list']:
        time_series_list.append(
            TimeSeries(
                name="SEQUENTIAL_TEST_PLAN",
                topology=self.topology_name,
                times=[start_time, end_time],
                values=[0, 0],
                src_mac=link["src_node_id"],
                peer_mac=link["dst_node_id"],
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

    def _sequential_test(self, topology):
        """
        Test Name: Short Term Sequential Link Health
        Test Objective:  Verify link health in the absence of self interference
        """
        node_name_to_mac = {n["name"]: n["mac_addr"] for n in topology["nodes"]}
        node_mac_to_name = {n["mac_addr"]: n["name"] for n in topology["nodes"]}
        test_list = []
        start_delay = 0
        random.shuffle(topology["links"])
        for link in topology["links"]:
            if link["link_type"] == Tests.WIRELESS.value:
                a_node_mac = node_name_to_mac[link["a_node_name"]]
                z_node_mac = node_name_to_mac[link["z_node_name"]]
                link_name = (
                    "link-"
                    + node_mac_to_name[a_node_mac]
                    + "-"
                    + node_mac_to_name[z_node_mac]
                )
                if self.direction == TrafficDirection.BIDIRECTIONAL.value:
                    mac_list = [
                        {"src_node_mac": a_node_mac, "dst_node_mac": z_node_mac},
                        {"src_node_mac": z_node_mac, "dst_node_mac": a_node_mac},
                    ]
                elif self.direction == TrafficDirection.SOUTHBOUND.value:
                    mac_list = [
                        {"src_node_mac": a_node_mac, "dst_node_mac": z_node_mac}
                    ]
                elif self.direction == TrafficDirection.NORTHBOUND.value:
                    mac_list = [
                        {"src_node_mac": z_node_mac, "dst_node_mac": a_node_mac}
                    ]
                for mac_addr in mac_list:
                    test_dict = {}
                    iperf_object = IperfObj(
                        link_name=link_name,
                        src_node_name=node_mac_to_name[mac_addr["src_node_mac"]],
                        dst_node_name=node_mac_to_name[mac_addr["dst_node_mac"]],
                        src_node_id=mac_addr["src_node_mac"],
                        dst_node_id=mac_addr["dst_node_mac"],
                        bitrate=self.test_push_rate,
                        time_sec=self.session_duration,
                        proto=self.protocol,
                        interval_sec=self.interval_sec,
                        window_size=4000000,
                        mss=7500,
                        no_delay=True,
                        omit_sec=0,
                        verbose=True,
                        json=True,
                        buffer_length=7500,
                        format=2,
                        use_link_local=True,
                    )
                    ping_object = PingObj(
                        link_name=link_name,
                        src_node_name=node_mac_to_name[mac_addr["src_node_mac"]],
                        dst_node_name=node_mac_to_name[mac_addr["dst_node_mac"]],
                        src_node_id=mac_addr["src_node_mac"],
                        dst_node_id=mac_addr["dst_node_mac"],
                        count=self.session_duration,
                        interval=self.interval_sec,
                        packet_size=64,
                        verbose=False,
                        deadline=self.session_duration + 10,
                        timeout=1,
                        use_link_local=True,
                    )
                    test_dict["src_node_id"] = mac_addr["src_node_mac"]
                    test_dict["dst_node_id"] = mac_addr["dst_node_mac"]
                    test_dict["iperf_object"] = iperf_object
                    test_dict["ping_object"] = ping_object
                    test_dict["start_delay"] = start_delay
                    test_dict["id"] = None
                    test_list.append(test_dict)
                start_delay += self.session_duration
        return test_list
