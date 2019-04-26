#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import json
import logging
import time
from queue import Queue
from threading import Thread, currentThread
from typing import Dict, List, Optional, Union

import zmq
from api.alias import IperfPingStatsType, ParametersType
from api.models import TestResult, TestRunExecution, TestStatus
from api.network_test import iperf, iperf_ping_analyze, ping
from api.network_test.base import Base
from django.db import transaction
from logger import Logger
from terragraph_thrift.Controller import ttypes as ctrl_types
from zmq.sugar.socket import Socket


_log = Logger(__name__, logging.INFO).get_logger()


class RecvFromCtrl(Base):
    """
        * ctrl_sock: ZMQ Socket handle used to communicate with the controller
        * zmq_identifier: Identifier associated with the ZMQ Socket
        * recv_timeout {seconds}: Timeout before which all responses have to be
                                  received
        * expected_number_of_responses: Total number of expected responses
        * received_output_queue: Queue share between threads to keep track of
                                 the links for which we have received the
                                 iperf/ping responses.
    """

    def __init__(
        self,
        _ctrl_sock: Socket,
        zmq_identifier: str,
        expected_number_of_responses: int,
        recv_timeout: int,
        parameters: ParametersType,
        received_output_queue: Queue,
    ) -> None:
        super().__init__(_ctrl_sock, zmq_identifier)
        self.ctrl_sock: Socket = _ctrl_sock
        self.zmq_identifier: str = zmq_identifier
        self.recv_timeout: int = time.time() + recv_timeout
        self.expected_number_of_responses: int = expected_number_of_responses
        self.parameters: ParametersType = parameters
        self.received_output_queue: Queue = received_output_queue
        self.number_of_responses: int = 0
        self.start_iperf_ids: List = []
        self.start_ping_ids: List = []
        self.parsed_iperf_data: str = ""
        self.parsed_iperf_client_data: str = ""
        self.parsed_iperf_server_data: str = ""
        self.parsed_ping_data: str = ""
        self.test_aborted: bool = False
        self.test_aborted_queue: Queue = Queue()

    def _get_recv_obj(self, msg_type: int, actual_sender_app: str) -> object:
        msg_type_str = ctrl_types.MessageType._VALUES_TO_NAMES.get(msg_type, "UNKNOWN")
        if msg_type == ctrl_types.MessageType.START_PING_RESP:
            _log.info("\nReceived {} from : {}".format(msg_type_str, actual_sender_app))
            _log.info("\nWaiting for PING_OUTPUT...")
            return ctrl_types.StartPingResp()
        elif msg_type == ctrl_types.MessageType.PING_OUTPUT:
            _log.info(
                "\n... Receiving {} from : {}".format(msg_type_str, actual_sender_app)
            )
            return ctrl_types.PingOutput()
        elif msg_type == ctrl_types.MessageType.START_IPERF_RESP:
            _log.info("\nReceived {} from : {}".format(msg_type_str, actual_sender_app))
            _log.info("\nWaiting for IPERF_OUTPUT...")
            return ctrl_types.StartIperfResp()
        elif msg_type == ctrl_types.MessageType.IPERF_OUTPUT:
            _log.info("\nReceived {} from : {}".format(msg_type_str, actual_sender_app))
            return ctrl_types.IperfOutput()
        elif msg_type == ctrl_types.MessageType.E2E_ACK:
            _log.info("\nReceived {} from : {}".format(msg_type_str, actual_sender_app))
            return ctrl_types.E2EAck()
        else:
            _log.info("\nReceived {} from : {}".format(msg_type_str, actual_sender_app))
            self._my_exit(False, error_msg="Unexpected response from Ctrl")

    def _process_output(self, msg_type: int, msg_data: object) -> None:
        if msg_type == ctrl_types.MessageType.PING_OUTPUT:
            _log.debug("Received output:\n{}".format(msg_data.output))
            source_node = msg_data.startPing.pingConfig.srcNodeId
            destination_node = msg_data.startPing.pingConfig.dstNodeId
            # remove start_ping_id for the link from the list
            try:
                self.start_ping_ids.remove(msg_data.startPing.id)
            except ValueError:
                pass
            self.parsed_ping_data = self._strip_ping_output(msg_data.output.strip())
            ping_stats = iperf_ping_analyze.get_ping_statistics(self.parsed_ping_data)
            self._log_to_mysql(
                source_node=source_node,
                destination_node=destination_node,
                stats=ping_stats,
                is_iperf=False,
            )
            received_output_dict = {
                "source_node": source_node,
                "destination_node": destination_node,
                "traffic_type": "PING_OUTPUT",
                "stats": ping_stats,
            }
            self.received_output_queue.put(received_output_dict)
        elif msg_type == ctrl_types.MessageType.IPERF_OUTPUT:
            _log.debug(
                "Received output from {}:\n{}".format(
                    "server" if msg_data.isServer else "client", msg_data.output
                )
            )
            source_node = msg_data.startIperf.iperfConfig.srcNodeId
            destination_node = msg_data.startIperf.iperfConfig.dstNodeId
            self.parsed_iperf_data = self._parse_iperf_output(msg_data.output.strip())
            if not self.parsed_iperf_data:
                self._log_failed_iperf_to_mysql(
                    source_node=source_node,
                    destination_node=destination_node,
                    iperf_data=msg_data,
                )
            else:
                if not msg_data.isServer:
                    self.parsed_iperf_client_data = self.parsed_iperf_data
                else:
                    # remove start_iperf_id for the link from the list
                    try:
                        self.start_iperf_ids.remove(msg_data.startIperf.id)
                    except ValueError:
                        pass
                    self.parsed_iperf_server_data = self.parsed_iperf_data
                    iperf_stats = iperf_ping_analyze.parse_and_pack_iperf_data(
                        self.parsed_iperf_server_data,
                        self.parameters["expected_num_of_intervals"],
                    )
                    self._log_to_mysql(
                        source_node=source_node,
                        destination_node=destination_node,
                        stats=iperf_stats,
                        is_iperf=True,
                    )
                    received_output_dict = {
                        "source_node": source_node,
                        "destination_node": destination_node,
                        "traffic_type": "IPERF_OUTPUT",
                        "stats": iperf_stats,
                    }
                    self.received_output_queue.put(received_output_dict)
        elif msg_type == ctrl_types.MessageType.START_PING_RESP:
            self.start_ping_ids.append(msg_data.id)
        elif msg_type == ctrl_types.MessageType.START_IPERF_RESP:
            self.start_iperf_ids.append(msg_data.id)
        elif msg_type == ctrl_types.MessageType.E2E_ACK:
            _log.info("\nReceived output from E2E_ACK:\n{}".format(msg_data.message))

    def _log_failed_iperf_to_mysql(
        self, source_node: str, destination_node: str, iperf_data: object
    ) -> None:
        _log.info("Failed iperf on link {} -> {}".format(source_node, destination_node))
        # remove start_iperf_id for the failed link from the list
        try:
            self.start_iperf_ids.remove(iperf_data.startIperf.id)
        except ValueError:
            pass
        link = self._get_link(source_node, destination_node)
        if link is not None:
            if iperf_data.isServer:
                TestResult.objects.filter(id=link["id"]).update(
                    iperf_server_blob=iperf_data.output, status=TestStatus.FAILED.value
                )
            else:
                TestResult.objects.filter(id=link["id"]).update(
                    iperf_client_blob=iperf_data.output, status=TestStatus.FAILED.value
                )

    def _strip_ping_output(self, ping_output: str) -> str:
        if "Address unreachable" in ping_output:
            return ""
        else:
            return ping_output

    def _parse_iperf_output(
        self, iperf_output: str
    ) -> Union[Dict[str, Union[str, Dict]], str]:
        try:
            parsed_iperf_output_dict = json.loads(iperf_output)
        except json.decoder.JSONDecodeError:
            # Remove first line of iperf_output
            try:
                end_of_first_line_index = iperf_output.index("\n")
            except ValueError:
                _log.info(
                    "ValueError parsing iperf output (no newline): {}".format(
                        iperf_output
                    )
                )
                return ""
            iperf_output = iperf_output[end_of_first_line_index + 1 :]
            parsed_iperf_output_dict = json.loads(iperf_output)
        if parsed_iperf_output_dict.get("error"):
            if "error" in parsed_iperf_output_dict["error"]:
                self.expected_number_of_responses -= 1
                return ""
            else:
                return parsed_iperf_output_dict
        else:
            return parsed_iperf_output_dict

    def _get_link(self, source_node: str, destination_node: str) -> Optional[Dict]:
        return self.parameters["test_links_dict"].get(
            (source_node, destination_node), None
        )

    def _log_to_mysql(
        self,
        source_node: str,
        destination_node: str,
        stats: IperfPingStatsType,
        is_iperf: bool,
    ) -> None:
        if is_iperf:
            link = self._get_link(source_node, destination_node)
            if link is not None and stats:
                TestResult.objects.filter(id=link["id"]).update(
                    status=TestStatus.FINISHED.value,
                    iperf_pushed_throughput=link["iperf_object"].bitrate,
                    iperf_throughput_min=stats["throughput"]["min"],
                    iperf_throughput_max=stats["throughput"]["max"],
                    iperf_throughput_mean=stats["throughput"]["mean"],
                    iperf_throughput_std=stats["throughput"]["std"],
                    iperf_link_error_min=stats["link_errors"]["min"],
                    iperf_link_error_max=stats["link_errors"]["max"],
                    iperf_link_error_mean=stats["link_errors"]["mean"],
                    iperf_link_error_std=stats["link_errors"]["std"],
                    iperf_jitter_min=stats["jitter"]["min"],
                    iperf_jitter_max=stats["jitter"]["max"],
                    iperf_jitter_mean=stats["jitter"]["mean"],
                    iperf_jitter_std=stats["jitter"]["std"],
                    iperf_lost_datagram_min=stats["lost_datagram"]["min"],
                    iperf_lost_datagram_max=stats["lost_datagram"]["max"],
                    iperf_lost_datagram_mean=stats["lost_datagram"]["mean"],
                    iperf_lost_datagram_std=stats["lost_datagram"]["std"],
                    iperf_udp_flag=link["iperf_object"].proto == "UDP",
                    # iperf_client_blob=self.parsed_iperf_client_data,
                    # iperf_server_blob=self.parsed_iperf_server_data,
                )
        else:
            link = self._get_link(source_node, destination_node)
            if link is not None:
                TestResult.objects.filter(id=link["id"]).update(
                    ping_max_latency=stats["max"],
                    ping_min_latency=stats["min"],
                    ping_avg_latency=stats["mean"],
                    # ping_output_blob=self.parsed_ping_data,
                )

    def _stop_iperf_ping(self) -> None:
        self.iperf_obj = iperf.RunIperf(self.ctrl_sock, self.zmq_identifier)
        self.ping_obj = ping.RunPing(self.ctrl_sock, self.zmq_identifier)
        # send stop iperf requests to the Ctrl
        for iperf_id in self.start_iperf_ids:
            self.iperf_obj._stop_iperf(iperf_id)
        # send stop ping requests to the Ctrl
        for ping_id in self.start_ping_ids:
            self.ping_obj._stop_ping(ping_id)

    def _listen_on_socket(self) -> None:

        # spawn a thread to check if test is aborted
        test_aborted_obj = CheckAbortStatus(
            test_aborted_queue=self.test_aborted_queue,
            recv_timeout=self.recv_timeout,
            parameters=self.parameters,
            listen_thread=currentThread(),
        )
        test_aborted_obj.start()

        # start listening on Socket
        zmq_queue_not_empty: bool = True
        while (
            (self.number_of_responses != self.expected_number_of_responses)
            and (time.time() < self.recv_timeout or zmq_queue_not_empty)
            and not self.test_aborted
        ):
            if self.test_aborted_queue.empty():
                # 3 messages are expected per response
                # First one is a blank response, followed by the ID of the app
                # for whom this response is for, followed by the response data
                try:
                    self._ctrl_sock.recv(flags=zmq.NOBLOCK)
                    actual_sender_app = self._ctrl_sock.recv(flags=zmq.NOBLOCK).decode(
                        "utf-8"
                    )
                    ser_msg = self._ctrl_sock.recv(flags=zmq.NOBLOCK)
                    self.number_of_responses += 1
                    zmq_queue_not_empty = True
                    _log.info(
                        "ZMQ message received, number received so far {}".format(
                            self.number_of_responses
                        )
                    )
                except zmq.Again:
                    zmq_queue_not_empty = False
                    time.sleep(1)
                    continue
                except Exception as ex:
                    _log.error("\nError receiving response: {}".format(ex))
                    _log.info(
                        "Note: Specify correct controller ip and port with "
                        + "-c/--controller_ip and -p/--controller_port "
                        + "options, and make sure that Controller is running "
                        + "on the host or ports are open on that server "
                        + "for network communication."
                    )
                    self._my_exit(False)

                # deserialize message
                deser_msg = ctrl_types.Message()
                try:
                    self._deserialize(ser_msg, deser_msg)
                    msg_data = self._get_recv_obj(deser_msg.mType, actual_sender_app)
                    self._deserialize(deser_msg.value, msg_data)
                    self._process_output(deser_msg.mType, msg_data)
                except Exception as ex:
                    _log.error("\nError reading response: {}".format(ex))
                    _log.info(
                        "Note: Specify correct controller ip and port with "
                        + "-c/--controller_ip and -p/--controller_port "
                        + "options, and make sure that Controller is running "
                        + "on the host or ports are open on that server "
                        + "for network communication."
                    )
                    self._my_exit(False)
            else:
                self.test_aborted = self.test_aborted_queue.get()

        # check if test was Aborted by user
        if self.test_aborted:
            self._stop_iperf_ping()
            self._my_exit(False, error_msg="Test Aborted by User", test_aborted=True)

        # check if test ended before receiving all responses in time
        self.test_end_time = time.time()
        if self.test_end_time > self.recv_timeout:
            self._my_exit(
                False, error_msg="Did not receive all responses " + "in time."
            )
        else:
            # clean exit
            self._my_exit(
                True, error_msg="Received all expected responses in " + "time."
            )


class Listen(Thread):
    def __init__(
        self,
        socket: Socket,
        zmq_identifier: str,
        expt_num_of_resp: int,
        duration: int,
        parameters: ParametersType,
        received_output_queue: Queue,
    ) -> None:
        Thread.__init__(self)
        self.socket = socket
        self.zmq_identifier = zmq_identifier
        self.expt_num_of_resp = expt_num_of_resp
        self.duration = duration
        self.parameters = parameters
        self.received_output_queue = received_output_queue

    def run(self) -> None:
        listen_obj = RecvFromCtrl(
            self.socket,
            self.zmq_identifier,
            self.expt_num_of_resp,
            self.duration,
            self.parameters,
            self.received_output_queue,
        )
        listen_obj._listen_on_socket()


class CheckAbortStatus(Thread):
    def __init__(
        self,
        test_aborted_queue: Queue,
        recv_timeout: int,
        parameters: ParametersType,
        listen_thread: Listen,
    ) -> None:
        Thread.__init__(self)
        self.test_aborted_queue = test_aborted_queue
        self.recv_timeout = recv_timeout
        self.parameters = parameters
        self.listen_thread = listen_thread
        self.db_fail_count: int = 0

    def run(self) -> None:
        # check if test is aborted in db

        while time.time() < self.recv_timeout and self.listen_thread.is_alive():
            try:
                test_run_obj = TestRunExecution.objects.get(
                    pk=int(self.parameters["test_run_id"])
                )
                if test_run_obj.status == TestStatus.ABORTED.value:
                    self.test_aborted_queue.put(True)
                    break
                elif test_run_obj.status == TestStatus.FINISHED.value:
                    break
                else:
                    time.sleep(5)
            except Exception as ex:
                self.db_fail_count += 1
                if self.db_fail_count == 5:
                    self._my_exit(
                        False,
                        error_msg="Failed to get db object "
                        + "{} times: {}".format(self.db_fail_count, ex),
                    )
                pass
