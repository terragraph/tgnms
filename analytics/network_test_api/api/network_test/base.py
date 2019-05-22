#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import logging
import sys
from queue import Queue
from typing import Any, Dict, List, Optional, Tuple

import zmq
from api.alias import (
    NetworkParametersType,
    ParametersType,
    RcvdStatsType,
    ScheduleParametersType,
    TestLinksDictType,
)
from api.models import (
    TestResult,
    TestRunExecution,
    TestSchedule,
    TestStatus,
    TrafficDirection,
)
from django.db import transaction
from django.utils import timezone
from logger import Logger
from module.beringei_time_series import TimeSeries
from module.insights import get_test_links_metrics
from module.routing import RoutesForNode
from terragraph_thrift.Controller import ttypes as ctrl_types
from thrift.protocol.TCompactProtocol import TCompactProtocolAcceleratedFactory
from thrift.TSerialization import deserialize, serialize
from zmq.sugar.socket import Socket


_log = Logger(__name__, logging.INFO).get_logger()


class Base:
    def __init__(self, _ctrl_sock: Socket, zmq_identifier: str) -> None:
        self._ctrl_sock: Socket = _ctrl_sock
        self._TRAFFIC_APP_CTRL_ID: str = "ctrl-app-TRAFFIC_APP"
        self._MYID: str = zmq_identifier

    def _deserialize(self, in_byte_array: object, out_thrift_struct: object) -> None:
        deserialize(
            out_thrift_struct, in_byte_array, TCompactProtocolAcceleratedFactory()
        )

    def _serialize(self, in_thrift_struct: object) -> bytes:
        return serialize(in_thrift_struct, TCompactProtocolAcceleratedFactory())

    def _send_to_ctrl(
        self,
        msg_type: int,
        msg_data: object,
        receiver_app: str,
        type: str,
        minion: Optional[str] = "",
    ) -> None:
        _log.info("Sending {} request...".format(type))
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

    def _my_exit(
        self,
        success: bool,
        error_msg: Optional[str] = "",
        operation: Optional[Any] = None,
        test_aborted: Optional[bool] = False,
    ) -> None:
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
            _log.error("Write to db failed: {}".format(ex))
            success = False

        # close ZMQ Socket
        _log.warning("Closing Socket.")
        self._ctrl_sock.close()

        if not operation:
            operation = type(self).__name__
        if success:
            _log.warning("{} succeeded. {}".format(operation, error_msg))
            sys.exit(0)
        else:
            _log.error("{} failed. {}".format(operation, error_msg))
            sys.exit(1)


class RunTestGetStats:
    def __init__(
        self,
        test_name: str,
        test_nw_thread_obj: object,
        topology_name: str,
        parameters: ParametersType,
        received_output_queue: Queue,
        start_time: int,
        session_duration: int,
    ) -> None:
        self.test_name = test_name
        self.test_nw_thread_obj = test_nw_thread_obj
        self.topology_name = topology_name
        self.parameters = parameters
        self.received_output_queue = received_output_queue
        self.start_time = start_time
        self.session_duration = session_duration

    def start(self) -> None:
        # get analytics stats for links whose iperf data is received from the controller
        self._log_stats_for_received_links(test_nw=self.test_nw_thread_obj)

        # wait until the TestNetwork thread ends (blocking call)
        self.test_nw_thread_obj.join()

        # Mark the end time of the test in db
        self._log_test_end_time()

    def _log_stats_for_received_links(self, test_nw: object) -> None:
        while test_nw.is_alive():
            if not self.received_output_queue.empty():
                received_output = self.received_output_queue.get()
                if received_output["traffic_type"] == "IPERF_OUTPUT":
                    rcvd_src_node = received_output["source_node"]
                    rcvd_dest_node = received_output["destination_node"]
                    rcvd_stats = received_output["stats"]

                    # mark the end of the test for the link
                    self._log_test_end_time_for_link(
                        source_node=rcvd_src_node, destination_node=rcvd_dest_node
                    )

                    # get analytics stats
                    self._db_stats_wrapper(rcvd_src_node, rcvd_dest_node, rcvd_stats)

    def _db_stats_wrapper(
        self, rcvd_src_node: str, rcvd_dest_node: str, rcvd_stats: RcvdStatsType
    ) -> None:
        _log.info("Writing Analytics stats to the db:")
        link = self._get_link(rcvd_src_node, rcvd_dest_node)
        link_start_time = self.start_time + link["start_delay"]
        link_end_time = link_start_time + self.session_duration
        links_time_series_list, iperf_time_series_list = self._time_series_lists(
            src_node_id=rcvd_src_node,
            dst_node_id=rcvd_dest_node,
            start_time=link_start_time,
            end_time=link_end_time,
            iperf_throughput_mean=rcvd_stats["throughput"]["mean"],
        )
        self._write_analytics_stats_to_db(
            get_test_links_metrics(
                links=links_time_series_list,
                network_info=self.parameters["network_info"],
                iperf_stats=iperf_time_series_list,
            )
        )

    def _time_series_lists(
        self,
        src_node_id: str,
        dst_node_id: str,
        start_time: int,
        end_time: int,
        iperf_throughput_mean: int,
    ) -> Tuple[List[TimeSeries], List[TimeSeries]]:
        links_time_series_list = []
        iperf_time_series_list = []

        # get link
        link = self._get_link(source_node=src_node_id, destination_node=dst_node_id)

        if link is not None:
            # populate links_time_series_list
            links_time_series_list = [
                TimeSeries(
                    name=self.test_name,
                    topology=self.topology_name,
                    times=[start_time, end_time],
                    values=[0, 0],
                    src_mac=link["src_node_id"],
                    peer_mac=link["dst_node_id"],
                )
            ]

            # populate iperf_time_series_list
            iperf_time_series_list = [
                # add entry for iperf_requested_rate
                TimeSeries(
                    name="iperf_requested_rate",
                    topology=self.topology_name,
                    times=[end_time],
                    values=[link["iperf_object"].bitrate],
                    src_mac=link["src_node_id"],
                    peer_mac=link["dst_node_id"],
                ),
                # add entry for iperf_actual_rate
                TimeSeries(
                    name="iperf_actual_rate",
                    topology=self.topology_name,
                    times=[end_time],
                    values=[iperf_throughput_mean],
                    src_mac=link["src_node_id"],
                    peer_mac=link["dst_node_id"],
                ),
            ]
        return links_time_series_list, iperf_time_series_list

    def _write_analytics_stats_to_db(self, analytics_stats: List[TimeSeries]) -> None:
        # analytics_stats is list of Beringei TimeSeries objects
        for stats in analytics_stats:
            link = self._get_link(stats.src_mac, stats.peer_mac)
            if link is not None:
                link_db_obj = TestResult.objects.filter(id=link["id"]).first()
                if link_db_obj is not None:
                    with transaction.atomic():
                        setattr(link_db_obj, stats.name, stats.values[0])
                        link_db_obj.save()

    def _get_link(self, source_node: str, destination_node: str) -> Optional[Dict]:
        return self.parameters["test_links_dict"].get(
            (source_node, destination_node), None
        )

    def _log_test_end_time(self) -> TestRunExecution:
        try:
            test_run_obj = TestRunExecution.objects.get(
                pk=int(self.parameters["test_run_id"])
            )
            test_run_obj.end_date_utc = timezone.now()
            test_run_obj.save()

            if self.test_name == "PARALLEL_LINK_TEST":
                for src_node_id, dst_node_id in self.parameters["test_links_dict"]:
                    self._log_test_end_time_for_link(
                        source_node=src_node_id, destination_node=dst_node_id
                    )
                return test_run_obj
        except Exception as ex:
            _log.error("Error setting end_date of the test: {}".format(ex))

    def _log_test_end_time_for_link(
        self, source_node: str, destination_node: str
    ) -> None:
        link = self._get_link(source_node, destination_node)
        if link is not None:
            link_db_obj = TestResult.objects.filter(id=link["id"]).first()
            if link_db_obj is not None:
                with transaction.atomic():
                    link_db_obj.end_date_utc = timezone.now()
                    link_db_obj.save()


# functions common across tests #


# add entries in TestResult
def _create_db_test_records(
    test_links_dict: TestLinksDictType, db_queue: Queue, id: int
) -> TestRunExecution:
    with transaction.atomic():
        test_run_db_obj = TestRunExecution.objects.filter(id=id)
        for obj in test_run_db_obj:
            obj.status = TestStatus.RUNNING.value
            obj.save()
        db_queue.put(test_run_db_obj.id)
        for link in test_links_dict.values():
            link_id = TestResult.objects.create(
                test_run_execution=test_run_db_obj,
                status=TestStatus.RUNNING.value,
                link_name=link["iperf_object"].link_name,
                origin_node=link["iperf_object"].src_node_name,
                peer_node=link["iperf_object"].dst_node_name,
            )
            link["id"] = link_id.id
        return test_run_db_obj


def _get_mac_list(
    direction: int, a_node_mac: str, z_node_mac: str
) -> List[Dict[str, str]]:
    if direction == TrafficDirection.BIDIRECTIONAL.value:
        mac_list = [
            {"src_node_mac": a_node_mac, "dst_node_mac": z_node_mac},
            {"src_node_mac": z_node_mac, "dst_node_mac": a_node_mac},
        ]
    elif direction == TrafficDirection.SOUTHBOUND.value:
        mac_list = [{"src_node_mac": a_node_mac, "dst_node_mac": z_node_mac}]
    elif direction == TrafficDirection.NORTHBOUND.value:
        mac_list = [{"src_node_mac": z_node_mac, "dst_node_mac": a_node_mac}]
    return mac_list


def _get_parameters(
    network_parameters: NetworkParametersType,
    test_run_db_obj: TestRunExecution,
    test_links_dict: TestLinksDictType,
    interval_sec: int,
    network_hop_info: Optional[List[RoutesForNode]] = None,
) -> ParametersType:
    return {
        "controller_addr": network_parameters["controller_addr"],
        "controller_port": network_parameters["controller_port"],
        "network_info": network_parameters["network_info"],
        "test_run_id": test_run_db_obj.id,
        "session_duration": network_parameters["session_duration"],
        "topology": network_parameters["topology"],
        "test_code": network_parameters["test_code"],
        "expected_num_of_intervals": (
            network_parameters["session_duration"] * interval_sec
        ),
        "topology_id": network_parameters["topology_id"],
        "test_links_dict": test_links_dict,
        "network_hop_info": network_hop_info if network_hop_info else None,
    }
