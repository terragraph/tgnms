#!/usr/bin/env python3.6
# Copyright 2004-present Facebook. All Rights Reserved.

from django.http import HttpResponse
from django.db import transaction
from api.models import (
    TestRunExecution,
    SingleHopTest,
    TEST_STATUS_RUNNING,
    TEST_STATUS_ABORTED
)
from api.network_test.test_network import (
    TestNetwork,
    IperfObj,
    PingObj,
)
import json
import sys
import os
import time
from django.views.decorators.csrf import csrf_exempt
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")
                + "/../../"))
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
    test_code = int(request.POST.get('test_code', ''))
    topology_id = int(request.POST.get('topology_id', ''))

    # fetch Controller info and Topology
    network_info = fetch_network_info(topology_id)
    if not network_info:
        error = True
        msg = ("Cannot find the configuration file. Please verify that " +
               "the Topologies have been correctly added to the DB")
        context_data['error'] = error
        context_data['msg'] = msg
        return HttpResponse(json.dumps(context_data),
                            content_type='application/json')

    topology = network_info[topology_id]["topology"]
    controller_addr = network_info[topology_id]["e2e_ip"]
    controller_port = network_info[topology_id]["e2e_port"]

    if not controller_addr or not controller_port:
        error = True
        msg = ("Controller IP/Port is None. " +
               "Please verify that it is correctly set in the DB")
        context_data['error'] = error
        context_data['msg'] = msg
        return HttpResponse(json.dumps(context_data),
                            content_type='application/json')

    # Configure test data using test API based on test_code
    if test_code == 33:
        test_list = test_8_3(topology)

    error = None
    msg = ''

    if test_code:
        try:
            # Parse topology file and get link pairs

            # Check if any stale tests are still running
            test_run_list = TestRunExecution.objects.filter(
                status__in=[
                    TEST_STATUS_RUNNING
                ]
            )
            if test_run_list.count() >= 1:
                for obj in test_run_list:
                    if time.time() > obj.expected_end_time:
                        obj.status = TEST_STATUS_ABORTED
                        obj.save()

            # Check if we are already running the test.
            # If so, ignore this request and return appropriate error
            test_run_list = TestRunExecution.objects.filter(
                status__in=[
                    TEST_STATUS_RUNNING
                ]
            )
            if test_run_list.count() >= 1:
                error = True
                msg = ('This test is already running. ' +
                       'Please wait till it finishes.')
            else:
                error = None
                if not error:
                    # Create the single hop test iperf records
                    with transaction.atomic():
                        test_run = TestRunExecution.objects.create(
                            status=TEST_STATUS_RUNNING,
                            test_code=test_code,
                        )
                        for link in test_list:
                            link_id = SingleHopTest.objects.create(
                                test_run_execution=test_run,
                                status=TEST_STATUS_RUNNING
                            )
                            link['id'] = link_id.id
                    error = False
                    msg = 'Test run execution id : ' + str(test_run.id)

                    parameters = {
                        'controller_addr': controller_addr,
                        'controller_port': controller_port,
                        'network_info': network_info,
                        'test_run_id': test_run.id,
                        'test_list': test_list,
                    }

                    # Create TestNetwork object and kick it off
                    test_nw = TestNetwork(parameters)
                    test_nw.start()

                    msg = "Started iPerf"

        except Exception as e:
            error = True
            msg = str(e)
    else:
        error = True
        msg = 'Test Code is required'
    context_data['error'] = error
    context_data['msg'] = msg
    return HttpResponse(json.dumps(context_data),
                        content_type='application/json')


@csrf_exempt
def stop_test(request):
    """
    This function returns json object which have 'error' and 'msg' key.
    """
    context_data = {}
    test_code = int(request.POST.get('test_code', ''))
    error = None
    msg = ''
    if test_code:
        try:
            # Check if we are already running the test.
            # If so, ignore this request and return appropriate error
            test_run_list = TestRunExecution.objects.filter(
                status__in=[
                    TEST_STATUS_RUNNING
                ]
            )
            if test_run_list.count() == 0:
                error = True
                msg = 'No such test is running'
            else:
                error = None
                if not error:
                    # Update the Test Run Execution object
                    test_run_obj = test_run_list[0]
                    with transaction.atomic():
                        test_run_obj.status = TEST_STATUS_ABORTED
                        test_run_obj.save()
                        error = False
                        msg = ('Test run execution id : ' +
                               str(test_run_obj.id) + ' stopped')
                    # Create TestNetwork object and kick it off
                    parameters = {
                        'test_code': test_code
                    }

        except Exception as e:
            error = True
            msg = str(e)
    else:
        error = True
        msg = 'Test Code is required'
    context_data['error'] = error
    context_data['msg'] = msg
    return HttpResponse(json.dumps(context_data),
                        content_type='application/json')


@csrf_exempt
def test_8_3(topology):
    """
    Test Name: Short Term Parallel Link Healthiness
    Test Objective:  Verify that all links are healthy in the possible presence
                    of self interference
    """
    node_name_to_mac = {n["name"]: n["mac_addr"]
                        for n in topology["nodes"]}
    bidirectional = True
    test_list = []
    for _i, l in enumerate(topology["links"]):
        if l["link_type"] == 1:
            # a -> z direction
            test_dict = {}
            a_node_mac = node_name_to_mac[l["a_node_name"]]
            z_node_mac = node_name_to_mac[l["z_node_name"]]
            iperf_object = IperfObj(
                src_node_id=a_node_mac,
                dst_node_id=z_node_mac,
                bitrate=200000000,
                time_sec=60,
                proto="UDP",
                interval_sec=1,
                window_size=4000000,
                mss=7500,
                no_delay=True,
                omit_sec=0,
                verbose=True,
                json=False,
                buffer_length=7500,
                format=2,
                use_link_local=True
            )
            ping_object = PingObj(
                src_node_id=a_node_mac,
                dst_node_id=z_node_mac,
                count=60,
                interval=1,
                packet_size=64,
                verbose=False,
                deadline=70,
                timeout=1,
                use_link_local=True
            )
            test_dict['src_node_id'] = a_node_mac
            test_dict['dst_node_id'] = z_node_mac
            test_dict['iperf_object'] = iperf_object
            test_dict['ping_object'] = ping_object
            test_dict['start_delay'] = 0
            test_dict['id'] = None
            test_list.append(test_dict)

            if bidirectional:
                # z -> a direction
                test_dict = {}
                iperf_object = IperfObj(
                    src_node_id=z_node_mac,
                    dst_node_id=a_node_mac,
                    bitrate=200000000,
                    time_sec=60,
                    proto="UDP",
                    interval_sec=1,
                    window_size=4000000,
                    mss=7500,
                    no_delay=True,
                    omit_sec=0,
                    verbose=True,
                    json=False,
                    buffer_length=7500,
                    format=2,
                    use_link_local=True
                )
                ping_object = PingObj(
                    src_node_id=z_node_mac,
                    dst_node_id=a_node_mac,
                    count=60,
                    interval=1,
                    packet_size=64,
                    verbose=False,
                    deadline=70,
                    timeout=1,
                    use_link_local=True
                )
                test_dict['src_node_id'] = z_node_mac
                test_dict['dst_node_id'] = a_node_mac
                test_dict['iperf_object'] = iperf_object
                test_dict['ping_object'] = ping_object
                test_dict['start_delay'] = 0
                test_dict['id'] = None
                test_list.append(test_dict)
    return test_list
