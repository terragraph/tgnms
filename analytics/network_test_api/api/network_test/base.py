#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import logging
import sys

import zmq
from api.models import TestResult, TestRunExecution, TestStatus, TrafficDirection
from django.db import transaction
from django.utils import timezone
from module.beringei_time_series import TimeSeries
from module.insights import link_health
from terragraph_thrift.Controller import ttypes as ctrl_types
from thrift.protocol.TCompactProtocol import TCompactProtocolAcceleratedFactory
from thrift.TSerialization import deserialize, serialize


_log = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)


class Base:
    def __init__(self, _ctrl_sock, zmq_identifier):
        self._ctrl_sock = _ctrl_sock
        self._TRAFFIC_APP_CTRL_ID = "ctrl-app-TRAFFIC_APP"
        self._MYID = zmq_identifier

    def _deserialize(self, in_byte_array, out_thrift_struct):
        deserialize(
            out_thrift_struct, in_byte_array, TCompactProtocolAcceleratedFactory()
        )

    def _serialize(self, in_thrift_struct):
        return serialize(in_thrift_struct, TCompactProtocolAcceleratedFactory())

    def _send_to_ctrl(self, msg_type, msg_data, receiver_app, type, minion=""):
        _log.info("\nSending {} request...".format(type))
        msg_type_str = ctrl_types.MessageType._VALUES_TO_NAMES.get(msg_type, "UNKNOWN")

        # prepare message
        data = self._serialize(ctrl_types.Message(msg_type, self._serialize(msg_data)))
        # send message
        try:
            self._ctrl_sock.send(str(minion).encode("ascii"), zmq.SNDMORE)
            self._ctrl_sock.send(str(receiver_app).encode("ascii"), zmq.SNDMORE)
            self._ctrl_sock.send(str(self._MYID).encode("ascii"), zmq.SNDMORE)
            self._ctrl_sock.send(data)
        except Exception as ex:
            self._my_exit(False, "Failed to send {}; {}".format(msg_type_str, ex))

    def _my_exit(self, success, error_msg="", operation=None, test_aborted=False):
        # Mark the test as finished as all iPerf sessions are over
        try:
            test_run_obj = TestRunExecution.objects.get(
                pk=int(self.parameters["test_run_id"])
            )
            if not test_aborted:
                test_run_obj.status = TestStatus.FINISHED.value
            else:
                pass
            test_run_obj.save()
        except Exception as ex:
            _log.error("\nWrite to db failed: {}".format(ex))
            success = False

        # close ZMQ Socket
        _log.warning("\nClosing Socket.")
        self._ctrl_sock.close()

        if not operation:
            operation = type(self).__name__
        if success:
            _log.warning("\n{} succeeded. {}\n".format(operation, error_msg))
            sys.exit(0)
        else:
            _log.error("\n{} failed. {}\n".format(operation, error_msg))
            sys.exit(1)


class RunTestGetStats:
    def __init__(
        self,
        test_name,
        test_nw_thread_obj,
        topology_name,
        parameters,
        direction,
        received_output_queue,
        start_time,
        session_duration,
    ):
        self.test_name = test_name
        self.test_nw_thread_obj = test_nw_thread_obj
        self.topology_name = topology_name
        self.parameters = parameters
        self.direction = direction
        self.received_output_queue = received_output_queue
        self.start_time = start_time
        self.session_duration = session_duration
        self.links = []

    def start(self):

        # get analytics stats for links whose iperf data is received from the controller
        self._log_stats_for_received_links(test_nw=self.test_nw_thread_obj)

        # wait until the TestNetwork thread ends (blocking call)
        self.test_nw_thread_obj.join()

        # get analytics stats for remaining links
        if self.links:
            for links in self.links:
                self._db_stats_wrapper(rcvd_src_node=links[0], rcvd_dest_node=links[1])

        # Mark the end time of the test in db
        self._log_test_end_time()

    def _log_stats_for_received_links(self, test_nw):
        while test_nw.is_alive():
            if not self.received_output_queue.empty():
                received_output = self.received_output_queue.get()
                if received_output["traffic_type"] == "IPERF_OUTPUT":
                    rcvd_src_node = received_output["source_node"]
                    rcvd_dest_node = received_output["destination_node"]
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

    def _db_stats_wrapper(self, rcvd_src_node, rcvd_dest_node):
        _log.info("\nWriting Analytics stats to the db:")
        link = self._get_link(rcvd_src_node, rcvd_dest_node)
        link_start_time = self.start_time + link["start_delay"]
        link_end_time = link_start_time + self.session_duration
        self._write_analytics_stats_to_db(
            link_health(
                links=self._create_time_series_list(
                    start_time=link_start_time, end_time=link_end_time, link=link
                ),
                network_info=self.parameters["network_info"],
            )
        )

    def _create_time_series_list(self, start_time, end_time, link):
        time_series_list = []
        # for link in self.parameters['test_list']:
        time_series_list.append(
            TimeSeries(
                name=self.test_name,
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
            link = self._get_link(stats.src_mac, stats.peer_mac)
            if link is not None:
                link_db_obj = TestResult.objects.filter(id=link["id"]).first()
                if link_db_obj is not None:
                    with transaction.atomic():
                        setattr(link_db_obj, stats.name, stats.values[0])
                        link_db_obj.save()

    def _get_link(self, source_node, destination_node):
        for link in self.parameters["test_list"]:
            if (
                link["src_node_id"] == source_node
                and link["dst_node_id"] == destination_node
            ):
                return link
        return None

    def _log_test_end_time(self):
        try:
            test_run_obj = TestRunExecution.objects.get(
                pk=int(self.parameters["test_run_id"])
            )
            test_run_obj.end_date_utc = timezone.now()
            test_run_obj.save()

            if self.test_name == "PARALLEL_LINK_TEST":
                return test_run_obj
        except Exception as ex:
            _log.error("\nError setting end_date of the test: {}".format(ex))


# functions common across tests #


def _create_db_test_records(test_code, topology_id, topology_name, test_list):
    with transaction.atomic():
        test_run_db_obj = TestRunExecution.objects.create(
            status=TestStatus.RUNNING.value,
            test_code=test_code,
            topology_id=topology_id,
            topology_name=topology_name,
        )
        for link in test_list:
            link_id = TestResult.objects.create(
                test_run_execution=test_run_db_obj, status=TestStatus.RUNNING.value
            )
            link["id"] = link_id.id
        return test_run_db_obj


def _get_mac_list(direction, a_node_mac, z_node_mac):
    if direction == TrafficDirection.BIDIRECTIONAL.value:
        mac_list = [
            {"src_node_mac": a_node_mac, "dst_node_mac": z_node_mac},
            {"src_node_mac": z_node_mac, "dst_node_mac": a_node_mac},
        ]
    elif direction == TrafficDirection.SOUTHBOUND.value:
        mac_list = [
            {"src_node_mac": a_node_mac, "dst_node_mac": z_node_mac}
        ]
    elif direction == TrafficDirection.NORTHBOUND.value:
        mac_list = [
            {"src_node_mac": z_node_mac, "dst_node_mac": a_node_mac}
        ]
    return mac_list
