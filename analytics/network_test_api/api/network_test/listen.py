#!/usr/bin/env python3.6
# Copyright 2004-present Facebook. All Rights Reserved.

import os
import zmq
import sys
import time
import logging
from threading import Thread
from api.network_test import base
from django.db import transaction
from django.utils import timezone
from api.models import (TestRunExecution, SingleHopTest)
from api.iperf_ping_analyze import (parse_and_pack_iperf_data,
                                    get_ping_statistics)
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")
                + "/../../"))
from module.insights import link_health
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")
                + "/../../interface/gen-py"))
from terragraph_thrift.Controller import ttypes as ctrl_types
_log = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)


class RecvFromCtrl(base.Base):

    def __init__(
        self,
        _ctrl_sock,
        zmq_identifier,
        expected_number_of_responses,
        recv_timeout,
        parameters
    ):
        super().__init__(_ctrl_sock, zmq_identifier)
        self.recv_timeout = time.time() + recv_timeout
        self.expected_number_of_responses = expected_number_of_responses
        self.number_of_responses = 0
        self.parameters = parameters
        self.start_iperf_ids = []
        self.start_ping_ids = []
        self.parsed_iperf_client_data = ""
        self.parsed_iperf_server_data = ""
        self.parsed_ping_data = ""

    def _get_recv_obj(self, msg_type, actual_sender_app):
        msg_type_str = ctrl_types.MessageType._VALUES_TO_NAMES\
                                 .get(msg_type, "UNKNOWN")
        if msg_type == ctrl_types.MessageType.START_PING_RESP:
            _log.info("\nReceived {} from : {}".format(msg_type_str,
                                                       actual_sender_app))
            _log.info("\nWaiting for PING_OUTPUT...")
            return ctrl_types.StartPingResp()
        elif msg_type == ctrl_types.MessageType.PING_OUTPUT:
            _log.info("\n... Receiving {} from : {}".format(msg_type_str,
                                                            actual_sender_app))
            return ctrl_types.PingOutput()
        elif msg_type == ctrl_types.MessageType.START_IPERF_RESP:
            _log.info("\nReceived {} from : {}".format(msg_type_str,
                                                       actual_sender_app))
            _log.info("\nWaiting for IPERF_OUTPUT...")
            return ctrl_types.StartIperfResp()
        elif msg_type == ctrl_types.MessageType.IPERF_OUTPUT:
            _log.info("\nReceived {} from : {}".format(msg_type_str,
                                                       actual_sender_app))
            return ctrl_types.IperfOutput()
        elif msg_type == ctrl_types.MessageType.E2E_ACK:
            _log.info("\nReceived {} from : {}".format(msg_type_str,
                                                       actual_sender_app))
            return ctrl_types.E2EAck()
        else:
            _log.info("\nReceived {} from : {}".format(msg_type_str,
                                                       actual_sender_app))
            self._my_exit(False, error_msg="Unexpected response from Ctrl")

    def _process_output(self, msg_type, msg_data):
        if msg_type == ctrl_types.MessageType.PING_OUTPUT:
            _log.info("\nReceived output:\n{}".format(msg_data.output))
            self.parsed_ping_data = msg_data.output.strip()
            self._log_to_mysql(
                source_node=msg_data.startPing.pingConfig.srcNodeId,
                destination_node=msg_data.startPing.pingConfig.dstNodeId,
                is_iperf=False
            )
        elif msg_type == ctrl_types.MessageType.IPERF_OUTPUT:
            _log.info("\nReceived output from {}:\n{}".format(
                "server" if msg_data.isServer else "client",
                msg_data.output))
            if (not msg_data.isServer):
                self.parsed_iperf_client_data = self._strip_iperf_output(
                                                    msg_data.output.strip())
            else:
                self.parsed_iperf_server_data = self._strip_iperf_output(
                                                msg_data.output.strip())
                self._log_to_mysql(
                    source_node=msg_data.startIperf.iperfConfig.srcNodeId,
                    destination_node=msg_data.startIperf.iperfConfig.dstNodeId,
                    is_iperf=True,
                )

        elif msg_type == ctrl_types.MessageType.START_PING_RESP:
            self.start_ping_ids.append(msg_data.id)
        elif msg_type == ctrl_types.MessageType.START_IPERF_RESP:
            self.start_iperf_ids.append(msg_data.id)
        elif msg_type == ctrl_types.MessageType.E2E_ACK:
            _log.info("\nReceived output from E2E_ACK:\n{}".format(
                                                msg_data.message))

    def _strip_iperf_output(self, iperf_output):
        strip_before = "[ ID] Interval"
        strip_after = "receiver"
        try:
            iperf_output = iperf_output[iperf_output.index(strip_before):
                                        iperf_output.index(strip_after) + 8]
            return iperf_output
        except Exception as ex:
            self.expected_number_of_responses -= 1
            pass

    def _get_link(self, source_node, destination_node):
        for link in self.parameters['test_list']:
            if (
                link['src_node_id'] == source_node and
                link['dst_node_id'] == destination_node
            ):
                return link

        return None

    def _log_to_mysql(
            self,
            source_node,
            destination_node,
            is_iperf
    ):
        if is_iperf:
            stats = parse_and_pack_iperf_data(self.parsed_iperf_server_data)
            link = self._get_link(
                source_node,
                destination_node,
            )
            if link is not None:
                link_db_obj = SingleHopTest.objects.filter(
                    id=link['id']
                ).first()
                if link_db_obj is not None:
                    with transaction.atomic():
                        link_db_obj.origin_node = source_node
                        link_db_obj.peer_node = destination_node
                        link_db_obj.link_name = (source_node + " -- "
                                                 + destination_node)
                        link_db_obj.iperf_throughput_min = (
                                            stats['throughput']['min'])
                        link_db_obj.iperf_throughput_max = (
                                            stats['throughput']['max'])
                        link_db_obj.iperf_throughput_mean = (
                                            stats['throughput']['mean'])
                        link_db_obj.iperf_throughput_std = (
                                            stats['throughput']['std'])
                        link_db_obj.iperf_link_error_min = (
                                            stats['link_errors']['min'])
                        link_db_obj.iperf_link_error_max = (
                                            stats['link_errors']['max'])
                        link_db_obj.iperf_link_error_mean = (
                                            stats['link_errors']['mean'])
                        link_db_obj.iperf_link_error_std = (
                                            stats['link_errors']['std'])
                        link_db_obj.iperf_jitter_min = (
                                            stats['jitter']['min'])
                        link_db_obj.iperf_jitter_max = (
                                            stats['jitter']['max'])
                        link_db_obj.iperf_jitter_mean = (
                                            stats['jitter']['mean'])
                        link_db_obj.iperf_jitter_std = (
                                            stats['jitter']['std'])
                        link_db_obj.iperf_lost_datagram_min = (
                                            stats['lost_datagram']['min'])
                        link_db_obj.iperf_lost_datagram_max = (
                                            stats['lost_datagram']['max'])
                        link_db_obj.iperf_lost_datagram_mean = (
                                            stats['lost_datagram']['mean'])
                        link_db_obj.iperf_lost_datagram_std = (
                                            stats['lost_datagram']['std'])
                        link_db_obj.iperf_udp_flag = (
                                            link['iperf_object'].proto
                                            == 'UDP')
                        link_db_obj.iperf_client_blob = (
                                            self.parsed_iperf_client_data)
                        link_db_obj.iperf_server_blob = (
                                            self.parsed_iperf_server_data)
                        link_db_obj.save()
        else:
            stats = get_ping_statistics(self.parsed_ping_data)
            link = self._get_link(
                source_node,
                destination_node
            )
            if link is not None:
                link_db_obj = SingleHopTest.objects.filter(
                    id=link['id']
                ).first()
                if link_db_obj is not None:
                    with transaction.atomic():
                        link_db_obj.origin_node = source_node
                        link_db_obj.peer_node = destination_node
                        link_db_obj.link_name = (source_node + " -- "
                                                 + destination_node)
                        link_db_obj.ping_max_latency = stats['max']
                        link_db_obj.ping_min_latency = stats['min']
                        link_db_obj.ping_avg_latency = stats['mean']
                        link_db_obj.ping_output_blob = self.parsed_ping_data
                        link_db_obj.save()

    def _write_analytics_stats_to_db(self, analytics_stats):
        # analytics_stats is list of Beringei TimeSeries objects
        for stats in analytics_stats:
            if stats.name == 'link_health':
                link = self._get_link(stats.src_mac, stats.peer_mac)
                if link is not None:
                    link_db_obj = SingleHopTest.objects.filter(
                        id=link['id']
                    ).first()
                    if link_db_obj is not None:
                        with transaction.atomic():
                            link_db_obj.health = stats.values[0]
                            link_db_obj.save()

    def _listen_on_socket(self):
        while ((self.number_of_responses != self.expected_number_of_responses)
                and (time.time() < self.recv_timeout)):
            # 3 messages are expected per response
            # First one is a blank response, followed by the ID of the app
            # for whom this response is for, followed by the response data
            try:
                self._ctrl_sock.recv(flags=zmq.NOBLOCK)
                actual_sender_app = self._ctrl_sock.recv(flags=zmq.NOBLOCK)\
                                                   .decode('utf-8')
                ser_msg = self._ctrl_sock.recv(flags=zmq.NOBLOCK)
                self.number_of_responses += 1
            except zmq.Again:
                continue
            except Exception as ex:
                _log.error("\nError receiving response: {}".format(ex))
                _log.info(
                    "Note: Specify correct controller ip and port wih "
                    + "-c/--controller_ip and -p/--controller_port options, "
                    + "and make sure that Controller is running on the host "
                    + "or ports are open on that server for network "
                    + "communication.")
                self._my_exit(False)

            # deserialize message
            deser_msg = ctrl_types.Message()
            try:
                self._deserialize(ser_msg, deser_msg)
                msg_data = self._get_recv_obj(deser_msg.mType,
                                              actual_sender_app)
                self._deserialize(deser_msg.value, msg_data)
                self._process_output(deser_msg.mType, msg_data)
            except Exception as ex:
                _log.error("\nError reading response: {}".format(ex))
                _log.info(
                    "Note: Specify correct controller ip and port with "
                    + "-c/--controller_ip and -p/--controller_port options, "
                    + "and make sure that Controller is running on the host "
                    + "or ports are open on that server for network "
                    + "communication.")
                self._my_exit(False)

        self.test_end_time = time.time()
        # Mark the end time of the test in db
        try:
            test_run_obj = TestRunExecution.objects.get(pk=int(
                                            self.parameters['test_run_id']))
            test_run_obj.end_date = timezone.now()
            test_run_obj.save()
            # get start date and the end date of the test
            start_time = int(test_run_obj.start_date.strftime('%s'))
            end_time = int(test_run_obj.end_date.strftime('%s'))
        except Exception as ex:
            self._my_exit(False, error_msg=ex)

        # get analytics stats of the network for the duration of the test
        self._write_analytics_stats_to_db(link_health(
                start_time,
                end_time,
                self.parameters['network_info']
            )
        )
        if self.test_end_time > self.recv_timeout:
            self._my_exit(False, error_msg="Did not receive all responses "
                                           + "in time.")
        else:
            # clean exit
            self._my_exit(True)


class Listen(Thread):

    def __init__(
        self,
        socket,
        zmq_identifier,
        expt_num_of_resp,
        duration,
        parameters
    ):
        Thread.__init__(self)
        self.socket = socket
        self.zmq_identifier = zmq_identifier
        self.expt_num_of_resp = expt_num_of_resp
        self.duration = duration
        self.parameters = parameters

    def run(self):
        listen_obj = RecvFromCtrl(self.socket,
                                  self.zmq_identifier,
                                  self.expt_num_of_resp,
                                  self.duration,
                                  self.parameters)
        listen_obj._listen_on_socket()
