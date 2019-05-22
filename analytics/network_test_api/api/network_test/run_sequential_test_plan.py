#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import random
import time
from queue import Queue
from typing import Dict, List

from api.alias import (
    NetworkParametersType,
    ParametersType,
    TestLinksDictType,
    TopologyType,
)
from api.models import Tests, TrafficDirection
from api.network_test import base
from api.network_test.iperf import IperfObj
from api.network_test.ping import PingObj
from api.network_test.test_network import TestNetwork


class RunSequentialTestPlan:
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
        self,
        test_run_execution_id: int,
        network_parameters: NetworkParametersType,
        db_queue: Queue,
    ) -> None:
        self.db_queue: Queue = db_queue
        self.network_parameters: NetworkParametersType = network_parameters
        self.direction: int = TrafficDirection.BIDIRECTIONAL.value
        self.parameters: ParametersType = {}
        self.start_time: int = time.time()
        self.received_output_queue: Queue = Queue()
        self.links: List = []
        self.interval_sec: int = 1
        self.test_run_execution_id = test_run_execution_id

    def run(self) -> None:

        # Configure test data using test API
        test_links_dict = self._sequential_test(self.network_parameters["topology"])

        # Create the single hop test iperf records
        test_run_db_obj = base._create_db_test_records(
            id=self.test_run_execution_id,
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

        # wait for and log results/stats
        run_test_get_stats = base.RunTestGetStats(
            test_name="SEQUENTIAL_LINK_TEST",
            test_nw_thread_obj=test_nw_thread_obj,
            topology_name=self.network_parameters["topology_name"],
            parameters=self.parameters,
            received_output_queue=self.received_output_queue,
            start_time=self.start_time,
            session_duration=self.network_parameters["session_duration"],
        )
        run_test_get_stats.start()

    def _sequential_test(self, topology: TopologyType) -> TestLinksDictType:
        """
        Test Name: Short Term Sequential Link Health
        Test Objective:  Verify link health in the absence of self interference
        """
        node_name_to_mac = {n["name"]: n["mac_addr"] for n in topology["nodes"]}
        node_mac_to_name = {n["mac_addr"]: n["name"] for n in topology["nodes"]}
        test_links_dict: Dict = {}
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
                mac_list = base._get_mac_list(self.direction, a_node_mac, z_node_mac)
                for mac_addr in mac_list:
                    link_dict = {}
                    iperf_object = IperfObj(
                        link_name=link_name,
                        src_node_name=node_mac_to_name[mac_addr["src_node_mac"]],
                        dst_node_name=node_mac_to_name[mac_addr["dst_node_mac"]],
                        src_node_id=mac_addr["src_node_mac"],
                        dst_node_id=mac_addr["dst_node_mac"],
                        bitrate=self.network_parameters["test_push_rate"],
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
                    link_dict["start_delay"] = start_delay
                    link_dict["id"] = None
                    # each link is identified using the link_tuple
                    link_tuple = (mac_addr["src_node_mac"], mac_addr["dst_node_mac"])
                    # map link info to corresponding link_tuple
                    test_links_dict[link_tuple] = link_dict

                start_delay += self.network_parameters["session_duration"]
        return test_links_dict
