#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import logging
from queue import Queue
from typing import Any, Dict, Optional, Tuple, Union

from api.alias import (
    ParsedNetworkInfoType,
    ParsedReceivedJsonDataType,
    ParsedSchedulerDataType,
    ReceivedJsonDataType,
    ValidatedMultiHopParametersType,
)
from api.models import Tests, TrafficDirection
from logger import Logger
from module.topology_handler import fetch_network_info
from terragraph_thrift.network_test.ttypes import Help
from thrift.protocol.TJSONProtocol import TSimpleJSONProtocolFactory
from thrift.transport import TTransport


_log = Logger(__name__, logging.DEBUG).get_logger()
DEFAULT_ACCESS_ORIGIN = {"Access-Control-Allow-Origin": "*"}
DEFAULT_PARALLEL_SESSIONS = 3


def parse_received_json_data(
    received_json_data: ReceivedJsonDataType
) -> Tuple[
    ParsedReceivedJsonDataType, ParsedSchedulerDataType, ValidatedMultiHopParametersType
]:

    protocol = str(received_json_data.get("protocol", "UDP")).upper()
    # verify that the traffic protocol is valid
    if protocol not in ["UDP", "TCP"]:
        return (
            {
                "error": {
                    "error": True,
                    "msg": "Incorrect Protocol. Please choose between UDP and TCP",
                }
            },
            {},
            {},
        )

    test_code = float(received_json_data.get("test_code", 0))
    parsed_json_data: ParsedReceivedJsonDataType = {
        "test_code": test_code,
        "topology_id": int(received_json_data.get("topology_id", 0)),
        "session_duration": int(received_json_data.get("session_duration", 0)),
        "test_push_rate": int(received_json_data.get("test_push_rate", 0)),
        "protocol": protocol,
    }

    parsed_scheduler_data: ParsedSchedulerDataType = {
        "cron_minute": str(received_json_data.get("cron_minute", "*")),
        "cron_hour": str(received_json_data.get("cron_hour", "*")),
        "cron_day_of_month": str(received_json_data.get("cron_day_of_month", "*")),
        "cron_month": str(received_json_data.get("cron_month", "*")),
        "cron_day_of_week": str(received_json_data.get("cron_day_of_week", "*")),
        "priority": int(received_json_data.get("priority", 1)),
        "asap": bool(int(received_json_data.get("asap", 1))),
    }

    # parse and validate multi-hop test parameters
    multi_hop_parameters: ValidatedMultiHopParametersType = _validate_multi_hop_parameters(
        received_json_data, test_code
    )
    if multi_hop_parameters.get("error"):
        return multi_hop_parameters["error"], {}, {}

    return parsed_json_data, parsed_scheduler_data, multi_hop_parameters


def _validate_multi_hop_parameters(
    received_json_data: ReceivedJsonDataType, test_code: float
) -> ValidatedMultiHopParametersType:

    # validate traffic_direction parameter
    traffic_direction = int(
        received_json_data.get(
            "traffic_direction", TrafficDirection.BIDIRECTIONAL.value
        )
    )
    valid_traffic_directions = [direction.value for direction in TrafficDirection]
    if (
        traffic_direction not in valid_traffic_directions
        and test_code == Tests.MULTI_HOP_TEST.value
    ):
        return {
            "error": {
                "error": True,
                "msg": "Invalid traffic direction. Options: {}".format(
                    valid_traffic_directions
                ),
            }
        }

    # validate multi_hop_parallel_sessions parameter
    try:
        multi_hop_parallel_sessions = int(
            received_json_data.get(
                "multi_hop_parallel_sessions", DEFAULT_PARALLEL_SESSIONS
            )
        )
        if test_code == Tests.MULTI_HOP_TEST.value and multi_hop_parallel_sessions < 1:
            return {
                "error": {
                    "error": True,
                    "msg": "multi_hop_parallel_sessions has to be greater than 0.",
                }
            }

        # validate multi_hop_session_iteration_count parameter
        multi_hop_session_iteration_count = int(
            received_json_data.get("multi_hop_session_iteration_count", 0)
        )
    except Exception as e:
        return {
            "error": {
                "error": True,
                "msg": "multi_hop configuration error {}".format(e),
            }
        }

    # validate pop_to_node_link parameter
    speed_test_pop_to_node_dict = received_json_data.get("pop_to_node_link", {})

    return {
        "traffic_direction": traffic_direction,
        "multi_hop_parallel_sessions": multi_hop_parallel_sessions,
        "multi_hop_session_iteration_count": multi_hop_session_iteration_count,
        "speed_test_pop_to_node_dict": speed_test_pop_to_node_dict,
    }


def fetch_and_parse_network_info(topology_id: int) -> ParsedNetworkInfoType:

    # fetch Controller info and Topology
    try:
        network_info = fetch_network_info(topology_id)
        _log.debug(
            "fetch_network_info returned with {} results".format(len(network_info))
        )
        topology = network_info[topology_id]["topology"]
        topology_name = network_info[topology_id]["topology"]["name"]
        controller_addr = network_info[topology_id]["e2e_ip"]
        controller_port = network_info[topology_id]["e2e_port"]
    except Exception as e:
        _log.error("Error fetching topology {}".format(e))
        return {
            "error": {
                "error": True,
                "msg": (
                    "Cannot find the configuration file. Please verify that "
                    + "the Topologies have been correctly added to the DB"
                ),
            }
        }

    # verify that Topology is not None
    if not topology:
        _log.error("Topology is empty")
        return {
            "error": {
                "error": True,
                "msg": (
                    "Topology not found. "
                    + "Please verify that it is correctly set in E2E Config."
                ),
            }
        }

    # verify that Controller info is not None
    if not controller_addr or not controller_port:
        return {
            "error": {
                "error": True,
                "msg": (
                    "Controller IP/Port not found. "
                    + "Please verify that it is correctly set in the DB"
                ),
            }
        }

    return {
        "network_info": network_info,
        "topology_name": topology_name,
        "topology": topology,
        "controller_addr": controller_addr,
        "controller_port": controller_port,
    }


def validate_speed_test_pop_to_node_dict(
    speed_test_pop_to_node_dict: Dict[str, str], topology: Dict[str, Dict]
) -> Dict[str, Union[Dict, bool]]:

    try:
        if speed_test_pop_to_node_dict:
            if not any(
                node["name"] == speed_test_pop_to_node_dict["pop"]
                for node in topology["nodes"]
            ):
                return {
                    "error": {
                        "error": True,
                        "msg": "Speed test POP name does not belong in the Topology.",
                    }
                }
            if not any(
                node["name"] == speed_test_pop_to_node_dict["node"]
                for node in topology["nodes"]
            ):
                return {
                    "error": {
                        "error": True,
                        "msg": "Speed test Node name does not belong in the Topology.",
                    }
                }
    except KeyError as err:
        return {
            "error": {
                "error": True,
                "msg": "KeyError in parsing pop_to_node_link. Error: {}".format(err),
            }
        }
    return {"error": False}


def get_test_run_db_obj_id(test_run_db_queue: Queue) -> None:
    try:
        return test_run_db_queue.get(block=True, timeout=10)
    except Exception as e:
        _log.error("\nError getting the test run id from DB: {}".format(e))
        return None


def serialize_to_json(obj: Help) -> str:
    trans = TTransport.TMemoryBuffer()
    prot = TSimpleJSONProtocolFactory().getProtocol(trans)
    obj.write(prot)
    return trans.getvalue().decode("utf-8")
