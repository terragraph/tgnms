#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import json
import logging
from threading import Event
from typing import Dict, Tuple

from api import base
from api.models import TestRunExecution, Tests, TestStatus, TrafficDirection
from api.network_test import scheduler
from api.network_test.mysql_helper import MySqlHelper, read_test_schedule_topology_ids
from flask import Flask, jsonify, request
from logger import Logger
from module.mysql_db_access import MySqlDbAccess
from terragraph_thrift.network_test import ttypes as network_ttypes


app = Flask("Network Test")
sched_event: Dict = {}
mysql_helper: Dict = {}

_log = Logger(__name__, logging.DEBUG).get_logger()


def flask_view(host: str, port: int) -> None:
    global sched_event
    global mysql_helper

    # start scheduler thread for existing scheduled jobs
    # this allows schedule to survive restart
    tsobjs = read_test_schedule_topology_ids()
    if tsobjs:
        for tsobj in tsobjs:
            topology_id = tsobj["test_run_execution__topology_id"]
            _log.debug(
                "There are {} scheduled jobs for topology id {}".format(
                    tsobj["tid_count"], topology_id
                )
            )
            mysql_helper[topology_id]: MySqlHelper = MySqlHelper(topology_id)
            parsed_network_info = base.fetch_and_parse_network_info(topology_id)
            if parsed_network_info.get("error"):
                _log.error(
                    "fetch_and_parse_network_info returned error {}".format(
                        parsed_network_info["error"]
                    )
                )
                continue
            topology_name = parsed_network_info["topology_name"]

            _log.info("Starting scheduler thread for {} ...".format(topology_name))
            mysql_helper[topology_id]: MySqlHelper = MySqlHelper(topology_id)
            sched_event[topology_id]: Event = Event()
            scheduler_obj = scheduler.Scheduler(
                sched_event=sched_event[topology_id],
                thread_id=topology_id,
                thread_name=topology_name,
                mysql_helper=mysql_helper[topology_id],
            )
            scheduler_obj.start()

    app.run(host=host, port=port)


@app.route("/")
def hello() -> Tuple[str,int,Dict]:
    return base.generate_http_response(error=False, msg="Success")


# end-point for test only - creates test scheduler thread if not already
# created and sends it an event
@app.route("/api/test_scheduler/", methods=["GET"])
def test_scheduler() -> Tuple[str,int,Dict]:
    global sched_event
    global mysql_helper

    topology_id = 0
    topology_name = "test scheduler thread"
    if topology_id not in sched_event:
        _log.info("Starting test scheduler and test plan threads")
        mysql_helper[topology_id]: MySqlHelper = MySqlHelper(topology_id)
        sched_event[topology_id]: Event = Event()
        scheduler_obj = scheduler.Scheduler(
            sched_event=sched_event[topology_id],
            thread_id=topology_id,
            thread_name=topology_name,
            mysql_helper=mysql_helper[topology_id],
        )
        scheduler_obj.start()
    else:
        _log.info("Test scheduler and test plan threads already started")

    _log.info("Sending event to test scheduler thread")
    sched_event[topology_id].set()
    return base.generate_http_response(error=False, msg="testing scheduler!")


@app.route("/api/start_test/", methods=["POST"])
def start_test() -> Tuple[str,int,Dict]:
    """
    This function returns json object which have 'error' and 'msg' key.
    If the test is already running or any exception occurred then the
    'error' key will return true and the 'msg' key return the error
    reason. otherwise, The error is false and the msg will return test
    run execution id
    """
    global sched_event
    global mysql_helper

    try:
        if not request.method == "POST":
            return jsonify({"err": "wrong method"}), 400, base.DEFAULT_ACCESS_ORIGIN
        received_json_data = request.get_json(force=True)
    except Exception:
        return base.generate_http_response(
            error=True, msg="Invalid Content-Type, please format the request as JSON."
        )

    # parse received_json_data
    parsed_json_data, parsed_scheduler_data, multi_hop_parameters = base.parse_received_json_data(
        received_json_data
    )

    if parsed_json_data.get("error"):
        return parsed_json_data["error"]
    topology_id = parsed_json_data["topology_id"]

    err = scheduler.validate_schedule_parameters(parsed_scheduler_data)
    if err:
        return err

    # don't allow another ASAP job to be scheduled if there are queued tests.
    # this prevents a user from piling on ASAP tests without knowing.
    if parsed_scheduler_data["asap"] and (topology_id in mysql_helper):
        tsp = mysql_helper[topology_id].read_test_schedule(asap=1)
        if tsp:
            _log.info(
                "There is already an ASAP test scheduled for topology id {}. "
                "Returning ...".format(topology_id)
            )
            return base.generate_http_response(
                error=True, msg="There is already an ASAP test scheduled."
            )

    parsed_network_info = base.fetch_and_parse_network_info(topology_id)
    if parsed_network_info.get("error"):
        return parsed_network_info["error"]
    topology_name = parsed_network_info["topology_name"]

    # start the scheduler thread if not already started
    # there is one scheduler thread per network
    if topology_id not in sched_event:
        _log.info("Starting scheduler thread for {} ...".format(topology_name))
        mysql_helper[topology_id]: MySqlHelper = MySqlHelper(topology_id)
        sched_event[topology_id]: Event = Event()
        scheduler_obj = scheduler.Scheduler(
            sched_event=sched_event[topology_id],
            thread_id=topology_id,
            thread_name=topology_name,
            mysql_helper=mysql_helper[topology_id],
        )
        scheduler_obj.start()
    else:
        _log.debug(
            "Scheduler and test plan thread for {} already started".format(
                topology_name
            )
        )

    if topology_id not in mysql_helper:
        _log.critical("MySqlHelper not setup for topology_id {}".format(topology_id))
    else:
        tre_id = mysql_helper[topology_id].create_test_run_execution_test_schedule(
            parsed_json_data=parsed_json_data,
            multi_hop_parameters=multi_hop_parameters,
            parsed_network_info=parsed_network_info,
            parsed_scheduler_data=parsed_scheduler_data,
        )

    # send event to scheduler - tells scheduler to read the db and
    # schedule the test
    _log.info("Sending event to Scheduler for {}".format(topology_name))
    sched_event[topology_id].set()

    return base.generate_http_response(error=False, msg="Scheduled test", id=tre_id)


# !!!! TODO - this needs a topology id
@app.route("/api/stop_test/", methods=["GET"])
def stop_test() -> Tuple[str,int,Dict]:
    """
    This function returns json object which have 'error' and 'msg' key along
    with 'id' of the stopped test.
    """
    msg = ""
    try:
        # Check if we are already running the test.
        test_run_list = TestRunExecution.objects.filter(
            status__in=[TestStatus.RUNNING.value]
        )
        if test_run_list.count() >= 1:
            for obj in test_run_list:
                _log.debug("Aborting test {}".format(obj.id))
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


@app.route("/api/help/", methods=["GET"])
def help() -> Tuple[str,int,Dict]:
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

    resp: str = base.serialize_to_json(context_data)

    return resp, 200, base.DEFAULT_ACCESS_ORIGIN
