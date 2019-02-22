#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import asyncio
import os
import sys
import time
from threading import Thread

from api.models import TestResult, TestRunExecution, Tests
from api.network_test import connect_to_ctrl, listen, run_iperf, run_ping
from django.db import transaction


sys.path.append(
    os.path.abspath(os.path.join(os.path.dirname(__file__), "..") + "/../../")
)
from module.routing import get_routes_for_nodes


class TestNetwork(Thread):
    """
        * received_output_queue: Queue share between threads to keep track of
                                 the links for which we have received the
                                 iperf/ping responses.
        * controller_addr: IP address of the E2E Controller
        * controller_port: Port address of the E2E Controller
        * test_list: list of links on which iPerf/ping is to be started.
    """

    def __init__(self, parameters, received_output_queue):
        Thread.__init__(self)
        self.parameters = parameters
        self.received_output_queue = received_output_queue
        self.controller_addr = parameters["controller_addr"]
        self.controller_port = parameters["controller_port"]
        self.test_list = parameters["test_list"]
        self.session_duration = parameters["session_duration"]
        self.topology = parameters["topology"]
        self.recv_timeout = 0
        self.number_of_iperf_object = 0
        self.number_of_ping_object = 0
        self.expected_number_of_responses = 0
        self.socket = None
        self.zmq_identifier = None
        self.iperf_obj = None
        self.ping_obj = None
        self.num_sent_req = 0
        self.test_start_time = time.time()
        self.current_second = 0
        self.polling_delay = 5

    def run(self):
        self._test_network()

    def _myget(self, link_dict, obj):
        try:
            if obj == "iperf_object":
                return link_dict[obj].time_sec
            elif obj == "ping_object":
                return link_dict[obj].deadline
        except Exception:
            return 0

    def _test_network(self):

        # connect to controller
        get_socket = connect_to_ctrl.ConnectToController(
            self.controller_addr, self.controller_port
        )
        self.socket, self.zmq_identifier = get_socket._connect_to_controller()

        # Set the expected_number_of_responses based on contents of test API
        # 5 responses are expected per (iperf + ping) request
        # ping requests will return an ack from the controller and a response
        # iperf requests will return an ack from the controller and 2 responses
        for link in self.test_list:
            if link.get("iperf_object"):
                self.number_of_iperf_object += 1
            if link.get("ping_object"):
                self.number_of_ping_object += 1
        self.expected_number_of_responses = (
            3 * self.number_of_iperf_object + 2 * self.number_of_ping_object
        )
        # Set the recv_timeout = max(endtime), where for each item on the list,
        # the endtime is start_delay + max(iperf/ping duration)
        self.recv_timeout = (
            max(
                x["start_delay"]
                + max(self._myget(x, "iperf_object"), self._myget(x, "ping_object"))
                for x in self.test_list
            )
            + 15
        )
        # start a thread to listen on the socket
        self.listen_obj = listen.Listen(
            self.socket,
            self.zmq_identifier,
            self.expected_number_of_responses,
            self.recv_timeout,
            self.parameters,
            self.received_output_queue,
        )
        self.listen_obj.start()

        # Mark the expected end time of the test in db
        try:
            test_run_obj = TestRunExecution.objects.get(
                pk=int(self.parameters["test_run_id"])
            )
            test_run_obj.expected_end_time = self.test_start_time + self.recv_timeout
            test_run_obj.save()
        except Exception as ex:
            self._my_exit(False, error_msg=ex)

        # send iperf and ping requests to the Ctrl
        self.iperf_obj = run_iperf.RunIperf(self.socket, self.zmq_identifier)
        self.ping_obj = run_ping.RunPing(self.socket, self.zmq_identifier)
        node_mac_to_name = {n["mac_addr"]: n["name"] for n in self.topology["nodes"]}
        asyncio.set_event_loop(asyncio.new_event_loop())
        while (
            self.num_sent_req <= len(self.test_list)
            and time.time() < (self.test_start_time + self.recv_timeout)
            and self.listen_obj.is_alive()
        ):
            for link in self.test_list:
                if (
                    time.time() >= (self.test_start_time + link["start_delay"])
                    and not link["iperf_object"].request_sent
                    and not link["ping_object"].request_sent
                ):
                    if link.get("iperf_object"):
                        if not link["iperf_object"].request_sent:
                            self.iperf_obj._config_iperf(
                                link["iperf_object"].src_node_id,
                                link["iperf_object"].dst_node_id,
                                link["iperf_object"].bitrate,
                                link["iperf_object"].time_sec,
                                link["iperf_object"].proto,
                                link["iperf_object"].interval_sec,
                                link["iperf_object"].window_size,
                                link["iperf_object"].mss,
                                link["iperf_object"].no_delay,
                                link["iperf_object"].omit_sec,
                                link["iperf_object"].verbose,
                                link["iperf_object"].json,
                                link["iperf_object"].buffer_length,
                                link["iperf_object"].format,
                                link["iperf_object"].use_link_local,
                            )
                            link["iperf_object"].request_sent = True
                            link["iperf_object"].end_time = (
                                time.time() + self.session_duration
                            )
                    if link.get("ping_object"):
                        if not link["ping_object"].request_sent:
                            self.ping_obj._config_ping(
                                link["ping_object"].src_node_id,
                                link["ping_object"].dst_node_id,
                                link["ping_object"].count,
                                link["ping_object"].interval,
                                link["ping_object"].packet_size,
                                link["ping_object"].verbose,
                                link["ping_object"].deadline,
                                link["ping_object"].timeout,
                                link["ping_object"].use_link_local,
                            )
                            link["ping_object"].request_sent = True
                            link["ping_object"].end_time = (
                                time.time() + self.session_duration
                            )
                    self.num_sent_req += 1
            # poll for route integrity in every polling_delay seconds
            if self.parameters["test_code"] == Tests.MULTI_HOP_TEST.value:
                if not (self.current_second % self.polling_delay):
                    for link in self.test_list:
                        if (
                            link["iperf_object"].request_sent
                            and link["ping_object"].request_sent
                            and time.time() <= link["iperf_object"].end_time
                            and time.time() <= link["ping_object"].end_time
                        ):
                            if link["route"] is None:
                                link["route"] = get_routes_for_nodes(
                                    network_info=self.parameters["network_info"][
                                        self.parameters["topology_id"]
                                    ],
                                    node_filter_set={
                                        node_mac_to_name[link["dst_node_id"]]
                                    },
                                )
                            else:
                                current_route = get_routes_for_nodes(
                                    network_info=self.parameters["network_info"][
                                        self.parameters["topology_id"]
                                    ],
                                    node_filter_set={
                                        node_mac_to_name[link["dst_node_id"]]
                                    },
                                )
                                if not (current_route == link["route"]):
                                    link["route_changed_count"] += 1
                                    link["route"] = current_route
            time.sleep(1)
            self.current_second += 1
        # wait for listen thread to finish
        self.listen_obj.join()

        # write route_changed_count of all links to db
        if self.parameters["test_code"] == Tests.MULTI_HOP_TEST.value:
            for link in self.test_list:
                link_db_obj = TestResult.objects.filter(id=link["id"]).first()
                if link_db_obj is not None:
                    with transaction.atomic():
                        link_db_obj.route_changed_count = link["route_changed_count"]
                        link_db_obj.save()


class IperfObj:
    def __init__(
        self,
        link_name,
        src_node_name,
        dst_node_name,
        src_node_id,
        dst_node_id,
        bitrate,
        time_sec,
        proto,
        interval_sec,
        window_size,
        mss,
        no_delay,
        omit_sec,
        verbose,
        json,
        buffer_length,
        format,
        use_link_local,
    ):
        self.link_name = link_name
        self.src_node_name = src_node_name
        self.dst_node_name = dst_node_name
        self.src_node_id = src_node_id
        self.dst_node_id = dst_node_id
        self.bitrate = bitrate
        self.time_sec = time_sec
        self.proto = proto
        self.interval_sec = interval_sec
        self.window_size = window_size
        self.mss = mss
        self.no_delay = no_delay
        self.omit_sec = omit_sec
        self.verbose = verbose
        self.json = json
        self.buffer_length = buffer_length
        self.format = format
        self.use_link_local = use_link_local
        self.request_sent = False
        self.end_time = None


class PingObj:
    def __init__(
        self,
        link_name,
        src_node_name,
        dst_node_name,
        src_node_id,
        dst_node_id,
        count,
        interval,
        packet_size,
        verbose,
        deadline,
        timeout,
        use_link_local,
    ):
        self.link_name = link_name
        self.src_node_name = src_node_name
        self.dst_node_name = dst_node_name
        self.src_node_id = src_node_id
        self.dst_node_id = dst_node_id
        self.count = count
        self.interval = interval
        self.packet_size = packet_size
        self.verbose = verbose
        self.deadline = deadline
        self.timeout = timeout
        self.use_link_local = use_link_local
        self.request_sent = False
        self.end_time = None
