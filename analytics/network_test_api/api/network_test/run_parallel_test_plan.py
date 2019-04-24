#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import logging
from logger import Logger
import random
import time
from collections import defaultdict
from queue import Queue
from threading import Thread
from typing import Dict, List, Optional, Tuple

from api.alias import (
    NetworkParametersType,
    ParametersType,
    TestLinksDictType,
    TopologyType,
)
from api.models import Tests, TestStatus, TrafficDirection
from api.network_test import base
from api.network_test.iperf import IperfObj
from api.network_test.ping import PingObj
from api.network_test.test_network import TestNetwork
from module.beringei_time_series import TimeSeries
from module.insights import get_test_links_metrics


_log = Logger(__name__, logging.INFO).get_logger()


class RunParallelTestPlan(Thread):
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

    def __init__(
        self, network_parameters: NetworkParametersType, db_queue: Queue
    ) -> None:
        Thread.__init__(self)
        self.db_queue: Queue = db_queue
        self.network_parameters: NetworkParametersType = network_parameters
        self.direction: int = TrafficDirection.BIDIRECTIONAL.value
        self.status_error: bool = False
        self.parameters: ParametersType = {}
        self.run_test_get_stats: Optional[base.RunTestGetStats] = None
        self.start_time: int = time.time()
        self.end_time: int = time.time() + network_parameters["session_duration"]
        self.test_status: Optional[int] = None
        self.received_output_queue: Queue = Queue()
        self.topology_sector_info: Dict = defaultdict(int)
        self.interval_sec: int = 1

    def run(self) -> None:

        # get topology sector information
        self._get_topology_sector_info()

        # Configure test data using test API
        test_links_dict = self._parallel_test(self.network_parameters["topology"])

        # Create the single hop test iperf records
        test_run_db_obj = base._create_db_test_records(
            network_parameters=self.network_parameters,
            test_links_dict=test_links_dict,
            db_queue=self.db_queue,
        )

        self.parameters = base._get_parameters(
            network_parameters=self.network_parameters,
            test_run_db_obj=test_run_db_obj,
            test_links_dict=test_links_dict,
            interval_sec=self.interval_sec,
        )

        # Create TestNetwork object and kick it off
        test_nw_thread_obj = TestNetwork(self.parameters, self.received_output_queue)
        test_nw_thread_obj.start()

        # create object of RunTestGetStats
        self.run_test_get_stats = base.RunTestGetStats(
            test_name="PARALLEL_LINK_TEST",
            test_nw_thread_obj=test_nw_thread_obj,
            topology_name=self.network_parameters["topology_name"],
            parameters=self.parameters,
            received_output_queue=self.received_output_queue,
            start_time=self.start_time,
            session_duration=self.network_parameters["session_duration"],
        )

        # wait for test to finish and get iperf stats
        while test_nw_thread_obj.is_alive():
            if not self.received_output_queue.empty():
                received_output = self.received_output_queue.get()
                if received_output["traffic_type"] == "IPERF_OUTPUT":
                    link = self.run_test_get_stats._get_link(
                        source_node=received_output["source_node"],
                        destination_node=received_output["destination_node"],
                    )
                    if link:
                        link["iperf_throughput_mean"] = received_output["stats"][
                            "throughput"
                        ]["mean"]

        # wait until the TestNetwork thread ends (blocking call)
        test_nw_thread_obj.join()

        # Mark the end time of the test and get the status of the test from db
        try:
            test_run_obj = self.run_test_get_stats._log_test_end_time()
            self.test_status = test_run_obj.status
        except Exception as ex:
            _log.error(
                "\nError in getting status of the test: {}".format(ex)
                + "\nSkipping writing Analytics stats to the db"
            )
            self.status_error = True
        if not self.status_error:
            if self.test_status == TestStatus.ABORTED.value:
                _log.error(
                    "\nTest Aborted by User."
                    + "\nSkipping writing Analytics stats to the db.\n"
                )
            else:
                # get network wide analytics stats for the duration of the test
                _log.info("\nWriting Analytics stats to the db:")
                links_time_series_list, iperf_time_series_list = (
                    self._get_time_series_lists()
                )
                self.run_test_get_stats._write_analytics_stats_to_db(
                    get_test_links_metrics(
                        links=links_time_series_list,
                        network_info=self.parameters["network_info"],
                        iperf_stats=iperf_time_series_list,
                    )
                )

    def _get_time_series_lists(self) -> Tuple[List[TimeSeries], List[TimeSeries]]:
        links_time_series: List = []
        iperf_time_series: List = []

        for src_node_id, dst_node_id in self.parameters["test_links_dict"]:
            # get link
            link = self.run_test_get_stats._get_link(
                source_node=src_node_id, destination_node=dst_node_id
            )
            if link is not None:
                # get link and iperf TimeSeries objects
                links_ts, iperf_ts = self.run_test_get_stats._time_series_lists(
                    src_node_id=src_node_id,
                    dst_node_id=dst_node_id,
                    start_time=self.start_time,
                    end_time=self.end_time,
                    iperf_throughput_mean=link["iperf_throughput_mean"],
                )

                # append received object to links_time_series list
                links_time_series += links_ts

                # append received object to iperf_time_series list
                iperf_time_series += iperf_ts

        return links_time_series, iperf_time_series

    def _get_topology_sector_info(self) -> None:
        for link in self.network_parameters["topology"]["links"]:
            if link["link_type"] == Tests.WIRELESS.value:
                self.topology_sector_info[link["a_node_mac"]] += 1
                self.topology_sector_info[link["z_node_mac"]] += 1

    def _get_bitrate(
        self, test_push_rate: int, src_node_mac: str, dst_node_mac: str
    ) -> int:

        src_node_num_linked_nodes = self.topology_sector_info[src_node_mac]
        dst_node_num_linked_nodes = self.topology_sector_info[dst_node_mac]
        try:
            return int(
                test_push_rate
                / max(src_node_num_linked_nodes, dst_node_num_linked_nodes)
            )
        except ZeroDivisionError:
            return test_push_rate

    def _parallel_test(self, topology: TopologyType) -> TestLinksDictType:
        """
        Test Name: Short Term Parallel Link Health
        Test Objective:  Verify that all links are healthy in the possible
                         presence of self interference
        """
        node_name_to_mac = {n["name"]: n["mac_addr"] for n in topology["nodes"]}
        node_mac_to_name = {n["mac_addr"]: n["name"] for n in topology["nodes"]}
        test_links_dict: Dict = {}
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
                bitrate = self._get_bitrate(
                    self.network_parameters["test_push_rate"], a_node_mac, z_node_mac
                )
                mac_list = base._get_mac_list(self.direction, a_node_mac, z_node_mac)
                for mac_addr in mac_list:
                    link_dict = {}
                    iperf_object = IperfObj(
                        link_name=link_name,
                        src_node_name=node_mac_to_name[mac_addr["src_node_mac"]],
                        dst_node_name=node_mac_to_name[mac_addr["dst_node_mac"]],
                        src_node_id=mac_addr["src_node_mac"],
                        dst_node_id=mac_addr["dst_node_mac"],
                        bitrate=bitrate,
                        time_sec=self.network_parameters["session_duration"],
                        proto=self.network_parameters["protocol"],
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
                        count=self.network_parameters["session_duration"],
                        interval=self.interval_sec,
                        packet_size=64,
                        verbose=False,
                        deadline=self.network_parameters["session_duration"] + 10,
                        timeout=1,
                        use_link_local=True,
                    )
                    # populate link info in link_dict
                    link_dict["src_node_id"] = mac_addr["src_node_mac"]
                    link_dict["dst_node_id"] = mac_addr["dst_node_mac"]
                    link_dict["iperf_object"] = iperf_object
                    link_dict["ping_object"] = ping_object
                    link_dict["start_delay"] = 0
                    link_dict["id"] = None
                    link_dict["iperf_throughput_mean"] = None
                    # each link is identified using the link_tuple
                    link_tuple = (mac_addr["src_node_mac"], mac_addr["dst_node_mac"])
                    # map link info to corresponding link_tuple
                    test_links_dict[link_tuple] = link_dict
        return test_links_dict
