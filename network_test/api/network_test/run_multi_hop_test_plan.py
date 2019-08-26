#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import random
import time
from queue import Queue
from typing import List, Optional

from api.alias import (
    NetworkParametersType,
    ParametersType,
    PopToNodeLinksType,
    TestLinksDictType,
    TopologyType,
)
from api.network_test import base
from api.network_test.iperf import IperfObj
from api.network_test.ping import PingObj
from api.network_test.test_network import TestNetwork
from module.routing import RoutesForNode, get_routes_for_nodes


class RunMultiHopTestPlan:
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
        * session_duration {sec}: Duration of each iperf/ping session.
                               Specified by User (UI)
        * test_push_rate {bps}: Throughput push rate for iPerf.
                                Specified by User (UI)
        * protocol {TCP/UDP}: iPerf traffic protocol. Specified by User (UI)
        * multi_hop_parallel_sessions: Number of iperf/ping sessions to run in
                                       parallel (default is 3).
                                       Specified by User (UI)
        * multi_hop_session_iteration_count: Number of parallel iperf/ping sessions to
                                       run (will stop once entire network is traversed
                                       if multi_hop_session_iteration_count is larger
                                       than entire network)
        * direction: one of: bidirectional, POP -> node, node -> POP
"""

    def __init__(
        self,
        test_run_execution_id: int,
        network_parameters: NetworkParametersType,
        db_queue: Queue,
    ) -> None:
        self.db_queue: Queue = db_queue
        self.network_parameters: NetworkParametersType = network_parameters
        self.parameters: ParametersType = {}
        self.start_time: int = time.time()
        self.received_output_queue: Queue = Queue()
        self.links: List = []
        self.network_hop_info: Optional[List[RoutesForNode]] = None
        self.interval_sec: int = 1
        self.test_run_execution_id = test_run_execution_id

    def run(self) -> None:

        # Get Network Hop information
        self.network_hop_info = get_routes_for_nodes(
            self.network_parameters["network_info"][
                self.network_parameters["topology_id"]
            ]
        )

        # Calculate pop to node links based on number of hops
        pop_to_node_links = self._get_pop_to_node_links(self.network_hop_info)

        # Configure test data using test API
        test_links_dict = self._multi_hop_test(
            self.network_parameters["topology"], pop_to_node_links
        )

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
            network_hop_info=self.network_hop_info,
        )

        # Create TestNetwork object and kick it off
        test_nw_thread_obj = TestNetwork(self.parameters, self.received_output_queue)
        test_nw_thread_obj.start()

        # wait for and log results/stats
        run_test_get_stats = base.RunTestGetStats(
            test_name="MULTI_HOP_TEST",
            test_nw_thread_obj=test_nw_thread_obj,
            topology_name=self.network_parameters["topology_name"],
            parameters=self.parameters,
            received_output_queue=self.received_output_queue,
            start_time=self.start_time,
            session_duration=self.network_parameters["session_duration"],
        )
        run_test_get_stats.start()

    def _get_pop_to_node_links(
        self, network_hop_info: List[RoutesForNode]
    ) -> PopToNodeLinksType:
        pop_to_node_links = []
        parallel_sessions_count = 0
        start_delay = 0
        if not self.network_parameters["speed_test_pop_to_node_dict"]:
            random.shuffle(network_hop_info)
            for node in network_hop_info:
                if node.num_hops:
                    for route in node.routes:
                        pop_node_desc = {}
                        pop_node_desc["pop_name"] = route.pop_name
                        pop_node_desc["node_name"] = node.name
                        pop_node_desc["start_delay"] = start_delay
                        pop_node_desc["ecmp"] = route.ecmp
                        pop_to_node_links.append(pop_node_desc)
                        parallel_sessions_count += 1
                        if (
                            parallel_sessions_count
                            == self.network_parameters["multi_hop_parallel_sessions"]
                        ):
                            start_delay += self.network_parameters["session_duration"]
                            parallel_sessions_count = 0
        else:
            pop_node_desc = {}
            pop_node_desc["pop_name"] = self.network_parameters[
                "speed_test_pop_to_node_dict"
            ]["pop"]
            pop_node_desc["node_name"] = self.network_parameters[
                "speed_test_pop_to_node_dict"
            ]["node"]
            pop_node_desc["start_delay"] = start_delay
            pop_node_desc["ecmp"] = False
            pop_to_node_links.append(pop_node_desc)
        return pop_to_node_links

    def _multi_hop_test(
        self, topology: TopologyType, pop_to_node_links: PopToNodeLinksType
    ) -> TestLinksDictType:
        """
        Test Name: Multi-hop Network Health
        Test Objective: Verify that all multi-hop routes are healthy
        """
        node_name_to_mac = {n["name"]: n["mac_addr"] for n in topology["nodes"]}
        node_mac_to_name = {n["mac_addr"]: n["name"] for n in topology["nodes"]}
        test_links_dict = {}
        session_count = 0
        if self.network_parameters["multi_hop_session_iteration_count"] is not None:
            session_limit_count = (
                self.network_parameters["multi_hop_session_iteration_count"]
                * self.network_parameters["multi_hop_parallel_sessions"]
            )
        else:
            session_limit_count = len(pop_to_node_links)
        for pop_to_node_link in pop_to_node_links:
            pop_node_mac = node_name_to_mac[pop_to_node_link["pop_name"]]
            dst_node_mac = node_name_to_mac[pop_to_node_link["node_name"]]
            link_name = (
                "link-"
                + node_mac_to_name[pop_node_mac]
                + "-"
                + node_mac_to_name[dst_node_mac]
            )
            mac_list = base._get_mac_list(
                self.network_parameters["direction"], pop_node_mac, dst_node_mac
            )
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
                    use_link_local=False,
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
                    use_link_local=False,
                )
                # populate link info in link_dict
                link_dict["src_node_id"] = mac_addr["src_node_mac"]
                link_dict["dst_node_id"] = mac_addr["dst_node_mac"]
                link_dict["iperf_object"] = iperf_object
                link_dict["ping_object"] = ping_object
                link_dict["start_delay"] = pop_to_node_link["start_delay"]
                link_dict["ecmp"] = pop_to_node_link["ecmp"]
                link_dict["id"] = None
                link_dict["route"] = None
                link_dict["route_changed_count"] = 0
                link_dict["link_name"] = link_name
                link_dict["direction"] = "does not apply"

                # each link is identified using the link_tuple
                link_tuple = (mac_addr["src_node_mac"], mac_addr["dst_node_mac"])
                # map link info to corresponding link_tuple
                test_links_dict[link_tuple] = link_dict

            session_count += 1
            if session_count == session_limit_count:
                break
        return test_links_dict
