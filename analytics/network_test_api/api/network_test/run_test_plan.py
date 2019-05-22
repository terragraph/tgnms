#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import logging
import time
from queue import Queue

from api import base
from api.models import Tests, TestStatus
from api.network_test import (
    run_multi_hop_test_plan,
    run_parallel_test_plan,
    run_sequential_test_plan,
)
from api.network_test.mysql_helper import MySqlHelper
from logger import Logger


_log = Logger(__name__, logging.INFO).get_logger()


def run_test_plan(test_run_execution_id: int, mysql_helper: MySqlHelper) -> None:
    """
    Top level function for running network test.
    It reads necessary parameters and then runs the specified test:
    - sequential
    - parallel
    - multi-hop
    """

    # read from the db
    test_description = mysql_helper.read_test_run_execution(
        id=test_run_execution_id
    )
    if not test_description:
        _log.error(
            "No test defined in TestRunExecution with id {}".format(
                test_run_execution_id
            )
        )
        return

    parsed_json_data, __, multi_hop_parameters = base.parse_received_json_data(
        test_description
    )

    test_code = parsed_json_data["test_code"]
    topology_id = parsed_json_data["topology_id"]
    session_duration = parsed_json_data["session_duration"]
    test_push_rate = parsed_json_data["test_push_rate"]
    protocol = parsed_json_data["protocol"]

    traffic_direction = multi_hop_parameters["traffic_direction"]
    multi_hop_parallel_sessions = multi_hop_parameters[
        "multi_hop_parallel_sessions"
    ]
    multi_hop_session_iteration_count = multi_hop_parameters[
        "multi_hop_session_iteration_count"
    ]
    speed_test_pop_to_node_dict = multi_hop_parameters[
        "speed_test_pop_to_node_dict"
    ]

    # fetch Controller info and Topology
    parsed_network_info = base.fetch_and_parse_network_info(topology_id)
    if parsed_network_info.get("error"):
        _log.error(
            "Unexpected error returned from fetching network info {}".format(
                parsed_network_info.get("error")
            )
        )
        return

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
        _log.error(
            "Unexpected error returned from "
            "validated_speed_test_pop_to_node_dict {}".format(
                validated_speed_test_pop_to_node_dict["error"]
            )
        )
        return

    if not test_code:
        _log.error("No test code")
        return
    else:
        try:
            num_stale_tests = (
                mysql_helper.abort_test_run_execution_stale_aborted()
            )
            if num_stale_tests > 0:
                _log.info(
                    "Deleted {} stale running tests on {}".format(
                        num_stale_tests, topology_name
                    )
                )
            else:
                _log.debug("No stale tests running")

            # check for running tests - should be impossible
            tre = mysql_helper.read_test_run_execution(
                status=TestStatus.RUNNING.value
            )
            if tre:
                _log.error("Attempt to run test while test is running")
                return
            else:
                TEST_CODE_FOR_TEST = 99
                _log.info("test code {}".format(test_code))
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
                test_run_db_queue: Queue = Queue()

                if test_code == Tests.PARALLEL_TEST.value:
                    run_tp = run_parallel_test_plan.RunParallelTestPlan(
                        network_parameters=network_parameters,
                        db_queue=test_run_db_queue,
                    )
                    run_tp.run()
                elif test_code == Tests.SEQUENTIAL_TEST.value:
                    run_tp = run_sequential_test_plan.RunSequentialTestPlan(
                        network_parameters=network_parameters,
                        db_queue=test_run_db_queue,
                    )
                    run_tp.run()
                elif test_code == Tests.MULTI_HOP_TEST.value:
                    run_tp = run_multi_hop_test_plan.RunMultiHopTestPlan(
                        network_parameters=network_parameters,
                        db_queue=test_run_db_queue,
                    )
                    run_tp.run()
                elif test_code == TEST_CODE_FOR_TEST:
                    # to test the scheduler without running a test
                    _log.info(
                        "Debug test code {} received, sleeping {}".format(
                            test_code, session_duration
                        )
                    )
                    mysql_helper.update_test_run_execution(
                        test_run_execution_id,
                        status=TestStatus.RUNNING.value,
                    )
                    time.sleep(session_duration)
                    mysql_helper.update_test_run_execution(
                        test_run_execution_id,
                        status=TestStatus.FINISHED.value,
                    )
        except Exception as e:
            _log.error("Exception running test {}".format(e))
            return

    _log.info(
        "Test completed normally on {}; id = {}".format(
            topology_name, test_run_execution_id
        )
    )
