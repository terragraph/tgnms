#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import json
import logging
from typing import Any, Dict, Optional

from api.models import Tests, TrafficDirection
from django.http import HttpResponse
from module.topology_handler import fetch_network_info
from thrift.protocol.TJSONProtocol import TSimpleJSONProtocolFactory
from thrift.transport import TTransport


_log = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)


def parse_received_json_data(received_json_data: Dict[str, Any]) -> Dict[str, Any]:

    test_code = float(received_json_data["test_code"])
    topology_id = int(received_json_data["topology_id"])
    session_duration = int(received_json_data["session_duration"])
    test_push_rate = int(received_json_data["test_push_rate"])
    protocol = str(received_json_data["protocol"])

    # verify that the traffic protocol is valid
    if protocol not in ["UDP", "TCP"]:
        return {
            "error": generate_http_response(
                error=True, msg="Incorrect Protocol. Please choose between UDP and TCP"
            )
        }

    return {
        "test_code": test_code,
        "topology_id": topology_id,
        "session_duration": session_duration,
        "test_push_rate": test_push_rate,
        "protocol": protocol,
    }


def validate_multi_hop_parameters(
    received_json_data: Dict[str, Any], test_code: float
) -> Dict[str, Any]:

    # validate traffic_direction parameter
    traffic_direction = received_json_data.get(
        "traffic_direction", TrafficDirection.BIDIRECTIONAL.value
    )
    valid_traffic_directions = [direction.value for direction in TrafficDirection]
    if (
        traffic_direction not in valid_traffic_directions
        and test_code == Tests.MULTI_HOP_TEST.value
    ):
        return {
            "error": generate_http_response(
                error=True,
                msg="Invalid traffic direction. Options: {}".format(
                    str(valid_traffic_directions)
                ),
            )
        }

    # validate multi_hop_parallel_sessions parameter
    multi_hop_parallel_sessions = received_json_data.get(
        "multi_hop_parallel_sessions",
        3 if test_code == Tests.MULTI_HOP_TEST.value else None,
    )
    if multi_hop_parallel_sessions and multi_hop_parallel_sessions < 1:
        return {
            "error": generate_http_response(
                error=True, msg="multi_hop_parallel_sessions has to be greater than 0."
            )
        }

    # validate multi_hop_session_iteration_count parameter
    multi_hop_session_iteration_count = received_json_data.get(
        "multi_hop_session_iteration_count", None
    )

    # validate pop_to_node_link parameter
    speed_test_pop_to_node_dict = received_json_data.get("pop_to_node_link", None)

    return {
        "traffic_direction": traffic_direction,
        "multi_hop_parallel_sessions": multi_hop_parallel_sessions,
        "multi_hop_session_iteration_count": multi_hop_session_iteration_count,
        "speed_test_pop_to_node_dict": speed_test_pop_to_node_dict,
    }


def fetch_and_parse_network_info(topology_id: int) -> Dict[str, Any]:

    # fetch Controller info and Topology
    try:
        network_info = fetch_network_info(topology_id)
        topology = network_info[topology_id]["topology"]
        topology_name = network_info[topology_id]["topology"]["name"]
        controller_addr = network_info[topology_id]["e2e_ip"]
        controller_port = network_info[topology_id]["e2e_port"]
    except Exception:
        return {
            "error": generate_http_response(
                error=True,
                msg=(
                    "Cannot find the configuration file. Please verify that "
                    + "the Topologies have been correctly added to the DB"
                ),
            )
        }

    # verify that Topology is not None
    if not topology:
        return {
            "error": generate_http_response(
                error=True,
                msg=(
                    "Topology not found. "
                    + "Please verify that it is correctly set in E2E Config."
                ),
            )
        }

    # verify that Controller info is not None
    if not controller_addr or not controller_port:
        return {
            "error": generate_http_response(
                error=True,
                msg=(
                    "Controller IP/Port not found. "
                    + "Please verify that it is correctly set in the DB"
                ),
            )
        }

    return {
        "network_info": network_info,
        "topology_name": topology_name,
        "topology": topology,
        "controller_addr": controller_addr,
        "controller_port": controller_port,
    }


def validate_speed_test_pop_to_node_dict(
    speed_test_pop_to_node_dict: Dict[str, str], topology: Dict[str, Any]
) -> Dict[str, Any]:

    try:
        if speed_test_pop_to_node_dict:
            if not any(
                node["name"] == speed_test_pop_to_node_dict["pop"]
                for node in topology["nodes"]
            ):
                return {
                    "error": generate_http_response(
                        error=True,
                        msg="Speed test POP name does not belong in the Topology.",
                    )
                }
            if not any(
                node["name"] == speed_test_pop_to_node_dict["node"]
                for node in topology["nodes"]
            ):
                return {
                    "error": generate_http_response(
                        error=True,
                        msg="Speed test Node name does not belong in the Topology.",
                    )
                }
    except KeyError as err:
        return {
            "error": generate_http_response(
                error=True,
                msg="KeyError in parsing pop_to_node_link. Error: {}".format(err),
            )
        }
    return {"error": False}


def generate_http_response(
    error: bool, msg: str, id: Optional[int] = None
) -> HttpResponse:
    return HttpResponse(
        json.dumps(
            {"error": error, "msg": msg, "id": id}
            if id
            else {"error": error, "msg": msg}
        ),
        content_type="application/json",
    )


def get_test_run_db_obj_id(test_run_db_queue: Any) -> None:
    try:
        return test_run_db_queue.get(block=True, timeout=10)
    except Exception as e:
        _log.error("\nError getting the test run id from DB: {}".format(e))
        return None


def serialize_to_json(obj: object) -> str:
    trans = TTransport.TMemoryBuffer()
    prot = TSimpleJSONProtocolFactory().getProtocol(trans)
    obj.write(prot)
    return trans.getvalue().decode("utf-8")


# TODO: fix deserialize logic
# def deserialize_json(data):
#     factory = TSimpleJSONProtocolFactory()
#     return Serializer.deserialize(factory, data, network_ttypes.StartTest())

# def _deserialize_json(encoded_json):
#     dt = network_ttypes.StartTest()
#     dt.read(encoded_json)
#     return dt
#     return network_ttypes.StartTest().readFromJson(encoded_json)
