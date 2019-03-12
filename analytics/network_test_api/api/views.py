#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import json
import queue
import time

from api import base
from api.models import TestRunExecution, Tests, TestStatus, TrafficDirection
from api.network_test import (
    run_multi_hop_test_plan,
    run_parallel_test_plan,
    run_sequential_test_plan,
)
from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt
from module.mysql_db_access import MySqlDbAccess
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
    try:
        received_json_data = json.loads(request.body.decode("utf-8"))
    except Exception:
        return base.generate_http_response(
            error=True, msg="Invalid Content-Type, please format the request as JSON."
        )

    # parse received_json_data
    parsed_json_data = base.parse_received_json_data(received_json_data)
    if parsed_json_data.get("error"):
        return parsed_json_data["error"]
    test_code = parsed_json_data["test_code"]
    topology_id = parsed_json_data["topology_id"]
    session_duration = parsed_json_data["session_duration"]
    test_push_rate = parsed_json_data["test_push_rate"]
    protocol = parsed_json_data["protocol"]

    # parse and validate multi-hop test parameters
    multi_hop_parameters = base.validate_multi_hop_parameters(
        received_json_data, test_code
    )
    if multi_hop_parameters.get("error"):
        return multi_hop_parameters["error"]
    traffic_direction = multi_hop_parameters["traffic_direction"]
    multi_hop_parallel_sessions = multi_hop_parameters["multi_hop_parallel_sessions"]
    multi_hop_session_iteration_count = multi_hop_parameters[
        "multi_hop_session_iteration_count"
    ]
    speed_test_pop_to_node_dict = multi_hop_parameters["speed_test_pop_to_node_dict"]

    # fetch Controller info and Topology
    parsed_network_info = base.fetch_and_parse_network_info(topology_id)
    if parsed_network_info.get("error"):
        return parsed_network_info["error"]
    network_info = parsed_network_info["network_info"]
    topology = parsed_network_info["topology"]
    topology_name = parsed_network_info["topology_name"]
    controller_addr = parsed_network_info["controller_addr"]
    controller_port = parsed_network_info["controller_port"]

    # verify that speed_test_pop_to_node_dict is valid
    validated_speed_test_pop_to_node_dict = base.validate_speed_test_pop_to_node_dict(
        speed_test_pop_to_node_dict, topology
    )
    if validated_speed_test_pop_to_node_dict.get("error"):
        return validated_speed_test_pop_to_node_dict["error"]

    if not test_code:
        return base.generate_http_response(error=True, msg="Test Code is required")
    else:
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
                return base.generate_http_response(
                    error=True,
                    msg=(
                        "There is a test running on the network. "
                        + "Please wait until it finishes."
                    ),
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
                    "speed_test_pop_to_node_dict": speed_test_pop_to_node_dict,
                }
                # Run the test plan
                test_run_db_queue = queue.Queue()
                if test_code == Tests.PARALLEL_TEST.value:
                    run_tp = run_parallel_test_plan.RunParallelTestPlan(
                        network_parameters=network_parameters,
                        db_queue=test_run_db_queue,
                    )
                    run_tp.start()
                    test_run_db_obj_id = base.get_test_run_db_obj_id(test_run_db_queue)
                    return base.generate_http_response(
                        error=False,
                        msg="Started Short Term Parallel Link Health Test Plan.",
                        id=test_run_db_obj_id,
                    )
                elif test_code == Tests.SEQUENTIAL_TEST.value:
                    run_tp = run_sequential_test_plan.RunSequentialTestPlan(
                        network_parameters=network_parameters,
                        db_queue=test_run_db_queue,
                    )
                    run_tp.start()
                    test_run_db_obj_id = base.get_test_run_db_obj_id(test_run_db_queue)
                    return base.generate_http_response(
                        error=False,
                        msg="Started Short Term Sequential Link Health Test Plan.",
                        id=test_run_db_obj_id,
                    )
                elif test_code == Tests.MULTI_HOP_TEST.value:
                    run_tp = run_multi_hop_test_plan.RunMultiHopTestPlan(
                        network_parameters=network_parameters,
                        db_queue=test_run_db_queue,
                    )
                    run_tp.start()
                    test_run_db_obj_id = base.get_test_run_db_obj_id(test_run_db_queue)
                    msg = (
                        "Started Speed Test."
                        if speed_test_pop_to_node_dict
                        else "Started Multi-hop Network Health Test Plan."
                    )
                    return base.generate_http_response(
                        error=False, msg=msg, id=test_run_db_obj_id
                    )
                else:
                    return base.generate_http_response(
                        error=True, msg="Incorrect test_code.", id=test_run_db_obj_id
                    )
        except Exception as e:
            return base.generate_http_response(error=True, msg=str(e))


@csrf_exempt
def stop_test(request):
    """
    This function returns json object which have 'error' and 'msg' key.
    """
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
                msg += "Test run execution stopped."
            return base.generate_http_response(error=False, msg=msg, id=obj.id)
        else:
            return base.generate_http_response(
                error=True, msg="No test is currently running"
            )
    except Exception as e:
        return base.generate_http_response(error=True, msg=str(e))


@csrf_exempt
def help(request):
    """
    This function returns json object which has the Network Test API information
    """
    start_test_url_ext = "/api/start_test/"
    stop_test_url_ext = "/api/stop_test/"

    # thrift help info for topology_id
    api_services = MySqlDbAccess().read_api_service_setting(use_primary_controller=True)
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

    # thrift help for pop_to_node_link
    pop_to_node_link_info = network_ttypes.PopToNodeLink(pop="", node="")
    pop_to_node_link_meta = network_ttypes.Meta(
        pop_to_node_link=pop_to_node_link_info,
        ui_type="pop_to_node_link",
        unit="",
        type="dict",
    )
    pop_to_node_link = network_ttypes.Parameter(
        label="Speed Test", key="pop_to_node_link", value="", meta=pop_to_node_link_meta
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
        pop_to_node_link,
    ]

    sequential_test_plan = network_ttypes.StartTest(
        label="Sequential Link Test",
        test_code=Tests.SEQUENTIAL_TEST.value,
        url_ext=start_test_url_ext,
        parameters=sequential_test_plan_parameters,
    )
    parallel_test_plan = network_ttypes.StartTest(
        label="Parallel Link Test",
        test_code=Tests.PARALLEL_TEST.value,
        url_ext=start_test_url_ext,
        parameters=parallel_test_plan_parameters,
    )
    multi_hop_test_plan = network_ttypes.StartTest(
        label="Multi-hop Test",
        test_code=Tests.MULTI_HOP_TEST.value,
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
        base.serialize_to_json(context_data), content_type="application/json"
    )
