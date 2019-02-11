#!/usr/bin/env python3.6
# Copyright 2004-present Facebook. All Rights Reserved.

import json
import os
import sys
import time

from api.models import TestRunExecution, Tests, TestStatus, TrafficDirection
from api.network_test import (
    run_multi_hop_test_plan,
    run_parallel_test_plan,
    run_sequential_test_plan,
)
from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt
from thrift.protocol.TJSONProtocol import TSimpleJSONProtocolFactory
from thrift.transport import TTransport


sys.path.append(
    os.path.abspath(os.path.join(os.path.dirname(__file__), "..") + "/../../")
)
from module.mysql_db_access import MySqlDbAccess
from module.topology_handler import fetch_network_info

sys.path.append(
    os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..") + "/../../interface/gen-py"
    )
)
from terragraph_thrift.network_test import ttypes as network_ttypes


@csrf_exempt
def start_test(request):
    """
    This function returns json object which have 'error' and 'msg' key.
    If the test is already running or any exception occurred then the
    'error' key will return true and the 'msg' key return the error
    reason. otherwise, The error is false and the msg will return test
    run execution id
    """
    context_data = {}
    try:
        received_json_data = json.loads(request.body.decode("utf-8"))
    except Exception:
        msg = "Invalid Content-Type, please format the request as JSON."
        context_data["error"] = True
        context_data["msg"] = msg
        return HttpResponse(json.dumps(context_data), content_type="application/json")
    test_code = float(received_json_data["test_code"])
    topology_id = int(received_json_data["topology_id"])
    session_duration = int(received_json_data["session_duration"])
    test_push_rate = int(received_json_data["test_push_rate"])
    protocol = str(received_json_data["protocol"])
    traffic_direction = TrafficDirection.BIDIRECTIONAL.value
    multi_hop_parallel_sessions = 3
    multi_hop_session_iteration_count = None

    if test_code == Tests.MULTI_HOP_TEST.value:
        try:
            traffic_direction = int(received_json_data["traffic_direction"])
            if traffic_direction not in [
                TrafficDirection.BIDIRECTIONAL.value,
                TrafficDirection.SOUTHBOUND.value,
                TrafficDirection.NORTHBOUND.value,
            ]:
                msg = "Incorrect traffic_direction value. Options: {}/{}/{}".format(
                    TrafficDirection.BIDIRECTIONAL.value,
                    TrafficDirection.SOUTHBOUND.value,
                    TrafficDirection.NORTHBOUND.value,
                )
                context_data["error"] = True
                context_data["msg"] = msg
                return HttpResponse(
                    json.dumps(context_data), content_type="application/json"
                )
        except Exception:
            pass
        try:
            multi_hop_parallel_sessions = int(
                received_json_data["multi_hop_parallel_sessions"]
            )
            if multi_hop_parallel_sessions < 1:
                msg = "multi_hop_parallel_sessions has to be greater than 0"
                context_data["error"] = True
                context_data["msg"] = msg
                return HttpResponse(
                    json.dumps(context_data), content_type="application/json"
                )
        except Exception:
            pass
        try:
            multi_hop_session_iteration_count = int(
                received_json_data["multi_hop_session_iteration_count"]
            )
        except Exception:
            pass

    # fetch Controller info and Topology
    try:
        network_info = fetch_network_info(topology_id)
        topology = network_info[topology_id]["topology"]
        topology_name = network_info[topology_id]["topology"]["name"]
        controller_addr = network_info[topology_id]["e2e_ip"]
        controller_port = network_info[topology_id]["e2e_port"]
    except Exception:
        msg = (
            "Cannot find the configuration file. Please verify that "
            + "the Topologies have been correctly added to the DB"
        )
        context_data["error"] = True
        context_data["msg"] = msg
        return HttpResponse(json.dumps(context_data), content_type="application/json")

    # verify that Topology is not None
    if not topology:
        msg = "Topology is None. Please verify that it is correctly set in E2E Config."
        context_data["error"] = True
        context_data["msg"] = msg
        return HttpResponse(json.dumps(context_data), content_type="application/json")

    # verify that Controller info is not None
    if not controller_addr or not controller_port:
        msg = (
            "Controller IP/Port is None. "
            + "Please verify that it is correctly set in the DB"
        )
        context_data["error"] = True
        context_data["msg"] = msg
        return HttpResponse(json.dumps(context_data), content_type="application/json")

    # verify that the traffic protocol is valid
    if protocol not in ["UDP", "TCP"]:
        msg = "Incorrect Protocol. Please choose between UDP and TCP"
        context_data["error"] = True
        context_data["msg"] = msg
        return HttpResponse(json.dumps(context_data), content_type="application/json")

    error = None
    msg = ""

    if test_code:
        try:
            # Check if any stale tests are still running
            test_run_list = TestRunExecution.objects.filter(
                status__in=[TestStatus.RUNNING.value]
            )
            if test_run_list.count() >= 1:
                for obj in test_run_list:
                    if time.time() > obj.expected_end_time:
                        obj.status = TestStatus.ABORTED.value
                        obj.save()

            # Check if we are already running the test.
            # If so, ignore this request and return appropriate error
            test_run_list = TestRunExecution.objects.filter(
                status__in=[TestStatus.RUNNING.value]
            )
            if test_run_list.count() >= 1:
                error = True
                msg = (
                    "There is a test running on the network. "
                    + "Please wait until it finishes."
                )
            else:
                network_parameters = {
                    "controller_addr": controller_addr,
                    "controller_port": controller_port,
                    "network_info": network_info,
                    "test_code": test_code,
                    "topology_id": topology_id,
                    "topology_name": topology_name,
                    "topology": topology,
                    "session_duration": session_duration,
                    "test_push_rate": test_push_rate,
                    "protocol": protocol,
                    "multi_hop_parallel_sessions": multi_hop_parallel_sessions,
                    "multi_hop_session_iteration_count": multi_hop_session_iteration_count,
                    "direction": traffic_direction,
                }
                # Run the test plan
                if test_code == Tests.PARALLEL_TEST.value:
                    run_tp = run_parallel_test_plan.RunParallelTestPlan(
                        network_parameters=network_parameters
                    )
                    run_tp.start()
                    error = False
                    msg = "Started Short Term Parallel Link Health Test Plan."
                elif test_code == Tests.SEQUENTIAL_TEST.value:
                    run_tp = run_sequential_test_plan.RunSequentialTestPlan(
                        network_parameters=network_parameters
                    )
                    run_tp.start()
                    error = False
                    msg = "Started Short Term Sequential Link Health Test Plan."
                elif test_code == Tests.MULTI_HOP_TEST.value:
                    run_tp = run_multi_hop_test_plan.RunMultiHopTestPlan(
                        network_parameters=network_parameters
                    )
                    run_tp.start()
                    error = False
                    msg = "Started Multi-hop Network Health Test Plan."
                else:
                    error = True
                    msg = "Incorrect test_code."
        except Exception as e:
            error = True
            msg = str(e)
    else:
        error = True
        msg = "Test Code is required"
    context_data["error"] = error
    context_data["msg"] = msg
    return HttpResponse(json.dumps(context_data), content_type="application/json")


@csrf_exempt
def stop_test(request):
    """
    This function returns json object which have 'error' and 'msg' key.
    """
    context_data = {}
    error = None
    msg = ""
    try:
        # Check if we are already running the test.
        test_run_list = TestRunExecution.objects.filter(
            status__in=[TestStatus.RUNNING.value]
        )
        if test_run_list.count() >= 1:
            for obj in test_run_list:
                obj.status = TestStatus.ABORTED.value
                obj.save()
                msg += "Test run execution id : " + str(obj.id) + " stopped. "
            error = False
        else:
            error = True
            msg = "No test is currently running"
    except Exception as e:
        error = True
        msg = str(e)
    context_data["error"] = error
    context_data["msg"] = msg
    return HttpResponse(json.dumps(context_data), content_type="application/json")


@csrf_exempt
def help(request):
    """
    This function returns json object which has the Network Test API information
    """
    start_test_url_ext = "/api/start_test/"
    stop_test_url_ext = "/api/stop_test/"

    # thrift help info for topology_id
    api_services = MySqlDbAccess().read_api_service_setting()
    try:
        topology_id_dropdown = [
            network_ttypes.DropDown(label=str(cfg["name"]), value=str(cfg["id"]))
            for _name, cfg in api_services.items()
        ]
    except Exception:
        topology_id_dropdown = []
    topology_id_meta = network_ttypes.Meta(
        dropdown=topology_id_dropdown, ui_type="dropdown", unit="", type="int"
    )
    topology_id = network_ttypes.Parameter(
        label="Topology ID", key="topology_id", value="1", meta=topology_id_meta
    )

    # thrift help info for session_duration
    session_duration_min = 10
    session_duration_box = network_ttypes.Box(min_value=session_duration_min)
    session_duration_meta = network_ttypes.Meta(
        range=session_duration_box, ui_type="range", unit="seconds", type="int"
    )
    session_duration = network_ttypes.Parameter(
        label="Single iPerf Session Duration",
        key="session_duration",
        value="60",
        meta=session_duration_meta,
    )

    # thrift help info for test_push_rate
    test_push_rate_min = 5000000
    test_push_rate_max = 2000000000
    test_push_rate_box = network_ttypes.Box(
        min_value=test_push_rate_min, max_value=test_push_rate_max
    )
    test_push_rate_meta = network_ttypes.Meta(
        range=test_push_rate_box, ui_type="range", unit="bits/sec", type="int"
    )
    test_push_rate = network_ttypes.Parameter(
        label="Test Push Rate",
        key="test_push_rate",
        value="200000000",
        meta=test_push_rate_meta,
    )

    # thrift help info for protocol
    UDP_protocol = network_ttypes.DropDown(label="UDP", value="UDP")
    TCP_protocol = network_ttypes.DropDown(label="TCP", value="TCP")
    protocol_dropdown = [UDP_protocol, TCP_protocol]
    protocol_meta = network_ttypes.Meta(
        dropdown=protocol_dropdown, ui_type="dropdown", unit="", type="str"
    )
    protocol = network_ttypes.Parameter(
        label="iPerf Traffic Protocol", key="protocol", value="UDP", meta=protocol_meta
    )

    # thrift help info for traffic_direction
    bidirectional = network_ttypes.DropDown(
        label=str(TrafficDirection.BIDIRECTIONAL.name),
        value=str(TrafficDirection.BIDIRECTIONAL.value),
    )
    southbound = network_ttypes.DropDown(
        label=str(TrafficDirection.SOUTHBOUND.name),
        value=str(TrafficDirection.SOUTHBOUND.value),
    )
    northbound = network_ttypes.DropDown(
        label=str(TrafficDirection.NORTHBOUND.name),
        value=str(TrafficDirection.NORTHBOUND.value),
    )
    traffic_direction_dropdown = [bidirectional, southbound, northbound]
    traffic_direction_meta = network_ttypes.Meta(
        dropdown=traffic_direction_dropdown, ui_type="dropdown", unit="", type="int"
    )
    traffic_direction = network_ttypes.Parameter(
        label="iPerf Traffic Direction",
        key="traffic_direction",
        value=str(TrafficDirection.BIDIRECTIONAL.value),
        meta=traffic_direction_meta,
    )

    # thrift help info for multi_hop_parallel_sessions
    one = network_ttypes.DropDown(label="1", value="1")
    two = network_ttypes.DropDown(label="2", value="2")
    three = network_ttypes.DropDown(label="3", value="3")
    four = network_ttypes.DropDown(label="4", value="4")
    five = network_ttypes.DropDown(label="5", value="5")
    multi_hop_parallel_sessions_dropdown = [one, two, three, four, five]
    multi_hop_parallel_sessions_meta = network_ttypes.Meta(
        dropdown=multi_hop_parallel_sessions_dropdown,
        ui_type="dropdown",
        unit="",
        type="int",
    )
    multi_hop_parallel_sessions = network_ttypes.Parameter(
        label="Number of multi-hop sessions to run in parallel",
        key="multi_hop_parallel_sessions",
        value="3",
        meta=multi_hop_parallel_sessions_meta,
    )

    # thrift help info for multi_hop_session_iteration_count
    multi_hop_session_iteration_count_min = 1
    multi_hop_session_iteration_count_box = network_ttypes.Box(
        min_value=multi_hop_session_iteration_count_min
    )
    multi_hop_session_iteration_count_meta = network_ttypes.Meta(
        range=multi_hop_session_iteration_count_box,
        ui_type="range",
        unit="",
        type="int",
    )
    multi_hop_session_iteration_count = network_ttypes.Parameter(
        label="Number of sequential multi-hop sessions",
        key="multi_hop_session_iteration_count",
        value="",
        meta=multi_hop_session_iteration_count_meta,
    )

    sequential_test_plan_parameters = [
        topology_id,
        session_duration,
        test_push_rate,
        protocol,
    ]
    parallel_test_plan_parameters = [
        topology_id,
        session_duration,
        test_push_rate,
        protocol,
    ]
    multi_hop_test_plan_parameters = [
        topology_id,
        session_duration,
        test_push_rate,
        protocol,
        traffic_direction,
        multi_hop_parallel_sessions,
        multi_hop_session_iteration_count,
    ]

    sequential_test_plan = network_ttypes.StartTest(
        label="Sequential Link Test",
        test_code="8.2",
        url_ext=start_test_url_ext,
        parameters=sequential_test_plan_parameters,
    )
    parallel_test_plan = network_ttypes.StartTest(
        label="Parallel Link Test",
        test_code="8.3",
        url_ext=start_test_url_ext,
        parameters=parallel_test_plan_parameters,
    )
    multi_hop_test_plan = network_ttypes.StartTest(
        label="Multi-hop Test",
        test_code="8.9",
        url_ext=start_test_url_ext,
        parameters=multi_hop_test_plan_parameters,
    )

    supported_test_plans = [
        sequential_test_plan,
        parallel_test_plan,
        multi_hop_test_plan,
    ]
    stop_test_info = network_ttypes.StopTest(url_ext=stop_test_url_ext)

    context_data = network_ttypes.Help(
        start_test=supported_test_plans, stop_test=stop_test_info
    )

    return HttpResponse(
        _serialize_to_json(context_data), content_type="application/json"
    )


# TODO: fix deserialize logic
# def deserialize_json(data):
#     factory = TSimpleJSONProtocolFactory()
#     return Serializer.deserialize(factory, data, network_ttypes.StartTest())

# def _deserialize_json(encoded_json):
#     dt = network_ttypes.StartTest()
#     dt.read(encoded_json)
#     return dt
#     return network_ttypes.StartTest().readFromJson(encoded_json)


def _serialize_to_json(obj) -> str:
    trans = TTransport.TMemoryBuffer()
    prot = TSimpleJSONProtocolFactory().getProtocol(trans)
    obj.write(prot)
    return trans.getvalue().decode("utf-8")
