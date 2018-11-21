#!/usr/bin/env python3.6
# Copyright 2004-present Facebook. All Rights Reserved.

import json
import os
import sys
import time

from api.models import TEST_STATUS_ABORTED, TEST_STATUS_RUNNING, TestRunExecution
from api.network_test import run_test_plan_8_2, run_test_plan_8_3
from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt


sys.path.append(
    os.path.abspath(os.path.join(os.path.dirname(__file__), "..") + "/../../")
)
from module.topology_handler import fetch_network_info


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
    received_json_data = json.loads(request.body.decode("utf-8"))
    test_code = float(received_json_data["test_code"])
    topology_id = int(received_json_data["topology_id"])
    test_duration = int(received_json_data["test_duration"])
    test_push_rate = int(received_json_data["test_push_rate"])
    protocol = str(received_json_data["protocol"])

    # fetch Controller info and Topology
    network_info = fetch_network_info(topology_id)
    if not network_info:
        error = True
        msg = (
            "Cannot find the configuration file. Please verify that "
            + "the Topologies have been correctly added to the DB"
        )
        context_data["error"] = error
        context_data["msg"] = msg
        return HttpResponse(json.dumps(context_data), content_type="application/json")

    topology = network_info[topology_id]["topology"]
    topology_name = network_info[topology_id]["topology"]["name"]
    controller_addr = network_info[topology_id]["e2e_ip"]
    controller_port = network_info[topology_id]["e2e_port"]

    if not controller_addr or not controller_port:
        error = True
        msg = (
            "Controller IP/Port is None. "
            + "Please verify that it is correctly set in the DB"
        )
        context_data["error"] = error
        context_data["msg"] = msg
        return HttpResponse(json.dumps(context_data), content_type="application/json")

    if protocol not in ["UDP", "TCP"]:
        error = True
        msg = "Incorrect Protocol. Please choose between UDP and TCP"
        context_data["error"] = error
        context_data["msg"] = msg
        return HttpResponse(json.dumps(context_data), content_type="application/json")

    error = None
    msg = ""

    if test_code:
        try:
            # Check if any stale tests are still running
            test_run_list = TestRunExecution.objects.filter(
                status__in=[TEST_STATUS_RUNNING]
            )
            if test_run_list.count() >= 1:
                for obj in test_run_list:
                    if time.time() > obj.expected_end_time:
                        obj.status = TEST_STATUS_ABORTED
                        obj.save()

            # Check if we are already running the test.
            # If so, ignore this request and return appropriate error
            test_run_list = TestRunExecution.objects.filter(
                status__in=[TEST_STATUS_RUNNING]
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
                    "test_duration": test_duration,
                    "test_push_rate": test_push_rate,
                    "protocol": protocol,
                }
                # Run the test plan
                if test_code == 8.3:
                    run_tp = run_test_plan_8_3.RunTestPlan83(
                        network_parameters=network_parameters
                    )
                    run_tp.start()
                    error = False
                    msg = "Started Short Term Parallel Link Health Test Plan."
                elif test_code == 8.2:
                    run_tp = run_test_plan_8_2.RunTestPlan82(
                        network_parameters=network_parameters
                    )
                    run_tp.start()
                    error = False
                    msg = "Started Short Term Sequential Link Health Test Plan."
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
            status__in=[TEST_STATUS_RUNNING]
        )
        if test_run_list.count() >= 1:
            for obj in test_run_list:
                obj.status = TEST_STATUS_ABORTED
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
