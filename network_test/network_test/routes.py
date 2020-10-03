#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import enum
import functools
import json
from datetime import datetime
from typing import Any

from aiohttp import web
from croniter import croniter
from tglib.clients import APIServiceClient

from .models import NetworkTestStatus, NetworkTestType
from .scheduler import Schedule, Scheduler
from .suites import (
    BaseTest,
    ParallelLinkTest,
    ParallelNodeTest,
    SequentialLinkTest,
    SequentialNodeTest,
)


routes = web.RouteTableDef()


def custom_serializer(obj: Any) -> str:
    if isinstance(obj, enum.Enum):
        return obj.name
    elif isinstance(obj, datetime):
        return datetime.isoformat(obj)
    else:
        return str(obj)


@routes.get("/schedule")
async def handle_get_schedules(request: web.Request) -> web.Response:  # noqa: C901
    """
    ---
    description: Return all of the network test schedules and their current params.
    tags:
    - Network Test
    parameters:
    - in: query
      name: test_type
      description: A comma-separated list of network test types.
      type: array
      items:
        type: string
        enum: [parallel_link, parallel_node, sequential_link, sequential_node]
    - in: query
      name: network_name
      description: The name of the network.
      type: string
    - in: query
      name: protocol
      description: A comma-separated list of iperf transport protocols (6=TCP, 17=UDP).
      type: array
      items:
        type: integer
        enum: [6, 17]
    - in: query
      name: partial
      description: If the test is only run on part of the network
      type: boolean
    produces:
    - application/json
    responses:
      "200":
        description: Successful operation.
      "400":
        description: Invalid filter parameters.
    """
    test_type = request.rel_url.query.get("test_type")
    if test_type is not None:
        try:
            test_type = {NetworkTestType(t) for t in test_type.split(",")}
        except ValueError:
            raise web.HTTPBadRequest(
                text="'test_type' must be a comma-separated list of valid test types"
            )

    network_name = request.rel_url.query.get("network_name")

    protocol = request.rel_url.query.get("protocol")
    if protocol is not None:
        try:
            protocol = {int(p) for p in protocol.split(",")}
        except ValueError:
            raise web.HTTPBadRequest(
                text="'protocol' must be a comma-separated list of valid integer values"
            )

    partial = request.rel_url.query.get("partial")
    if partial == "true":
        partial = True
    elif partial == "false":
        partial = False
    elif partial is not None:
        raise web.HTTPBadRequest(text=f"'partial' must be true/false: {partial}")

    return web.json_response(
        {
            "schedules": [
                dict(row)
                for row in await Scheduler.list_schedules(
                    test_type, network_name, protocol, partial
                )
            ]
        },
        dumps=functools.partial(json.dumps, default=custom_serializer),
    )


@routes.get("/schedule/{schedule_id:[0-9]+}")
async def handle_get_schedule(request: web.Request) -> web.Response:
    """
    ---
    description: Return the network test schedule, params, and execution history for a particular network test schedule ID.
    tags:
    - Network Test
    produces:
    - application/json
    parameters:
    - in: path
      name: schedule_id
      description: The database ID of a network test schedule.
      required: true
      type: integer
    responses:
      "200":
        description: Successful operation.
      "404":
        description: Unknown network test schedule ID.
    """
    schedule_id = int(request.match_info["schedule_id"])
    schedule_output = await Scheduler.describe_schedule(schedule_id)
    if schedule_output is None:
        raise web.HTTPNotFound(
            text=f"No network test schedule with ID '{schedule_id}' was found"
        )

    schedule, executions = schedule_output
    return web.json_response(
        {"schedule": dict(schedule), "executions": [dict(row) for row in executions]},
        dumps=functools.partial(json.dumps, default=custom_serializer),
    )


@routes.post("/schedule")
async def handle_add_schedule(request: web.Request) -> web.Response:
    """
    ---
    description: Add a new network test schedule.
    tags:
    - Network Test
    parameters:
    - in: body
      name: schedule
      description: The body and test params of the schedule.
      schema:
        type: object
        properties:
          enabled:
            type: boolean
          cron_expr:
            type: string
          test_type:
            type: string
            enum: [parallel_link, parallel_node, sequential_link, sequential_node]
          network_name:
            type: string
          iperf_options:
            type: object
          whitelist:
            type: array
            items:
              type: string
        required:
        - enabled
        - cron_expr
        - test_type
        - network_name
    produces:
    - application/json
    responses:
      "200":
        description: Successful operation.
      "400":
        description: Invalid or missing parameters.
    """
    body = await request.json()

    enabled = body.get("enabled")
    if enabled is None:
        raise web.HTTPBadRequest(text="Missing required 'enabled' param")

    cron_expr = body.get("cron_expr")
    if cron_expr is None:
        raise web.HTTPBadRequest(text="Missing required 'cron_expr' param")
    if not croniter.is_valid(cron_expr):
        raise web.HTTPBadRequest(text=f"'{cron_expr}' is not a valid cron expression")

    schedule = Schedule(enabled, cron_expr)

    test_type = body.get("test_type")
    if test_type is None:
        raise web.HTTPBadRequest(text="Missing required 'test_type' param")
    if not NetworkTestType.has_value(test_type):
        raise web.HTTPBadRequest(text=f"Invalid 'test_type': {test_type}")
    test_type = NetworkTestType(test_type)

    network_name = body.get("network_name")
    if network_name is None:
        raise web.HTTPBadRequest(text="Missing required 'network_name' param")
    if network_name not in APIServiceClient.network_names():
        raise web.HTTPBadRequest(text=f"Invalid network name: {network_name}")

    iperf_options = body.get("iperf_options", {})
    whitelist = body.get("whitelist", [])

    test: BaseTest
    if test_type == NetworkTestType.PARALLEL_LINK:
        test = ParallelLinkTest(network_name, iperf_options, whitelist)
    elif test_type == NetworkTestType.PARALLEL_NODE:
        test = ParallelNodeTest(network_name, iperf_options, whitelist)
    elif test_type == NetworkTestType.SEQUENTIAL_LINK:
        test = SequentialLinkTest(network_name, iperf_options, whitelist)
    elif test_type == NetworkTestType.SEQUENTIAL_NODE:
        test = SequentialNodeTest(network_name, iperf_options, whitelist)

    schedule_id = await Scheduler.add_schedule(schedule, test)
    return web.json_response(
        {
            "status": "success",
            "message": f"Added network test schedule with ID: {schedule_id}",
            "schedule_id": schedule_id,
        }
    )


@routes.put("/schedule/{schedule_id:[0-9]+}")
async def handle_modify_schedule(request: web.Request) -> web.Response:
    """
    ---
    description: Modify an existing network test schedule.
    tags:
    - Network Test
    produces:
    - application/json
    parameters:
    - in: path
      name: schedule_id
      description: The database ID of the network test schedule.
      required: true
      type: integer
    - in: body
      name: schedule
      description: The updated network test schedule and params
      schema:
        type: object
        properties:
          enabled:
            type: boolean
          cron_expr:
            type: string
          network_name:
            type: string
          iperf_options:
            type: object
          whitelist:
            type: array
            items:
              type: string
        required:
        - enabled
        - cron_expr
        - network_name
    responses:
      "200":
        description: Successful operation.
      "400":
        description: Invalid or missing parameters.
      "404":
        description: Unknown network test schedule ID.
      "500":
        description: Failed to modify network test schedule.
    """
    schedule_id = int(request.match_info["schedule_id"])
    if not Scheduler.has_schedule(schedule_id):
        raise web.HTTPNotFound(
            text=f"No network test schedule with ID '{schedule_id}' was found"
        )

    body = await request.json()

    enabled = body.get("enabled")
    if enabled is None:
        raise web.HTTPBadRequest(text="Missing required 'enabled' param")

    cron_expr = body.get("cron_expr")
    if cron_expr is None:
        raise web.HTTPBadRequest(text="Missing required 'cron_expr' param")
    if not croniter.is_valid(cron_expr):
        raise web.HTTPBadRequest(text=f"'{cron_expr}' is not a valid cron expression")

    network_name = body.get("network_name")
    if network_name is None:
        raise web.HTTPBadRequest(text="Missing required 'network_name' param")
    if network_name not in APIServiceClient.network_names():
        raise web.HTTPBadRequest(text=f"Invalid network name: {network_name}")

    iperf_options = body.get("iperf_options", {})
    whitelist = body.get("whitelist", [])

    if not await Scheduler.modify_schedule(
        schedule_id, enabled, cron_expr, network_name, iperf_options, whitelist
    ):
        raise web.HTTPInternalServerError(text="Failed to modify network test schedule")

    return web.json_response(
        {"status": "success", "message": "Successfully updated network test schedule"}
    )


@routes.delete("/schedule/{schedule_id:[0-9]+}")
async def handle_delete_schedule(request: web.Request) -> web.Response:
    """
    ---
    description: Delete an existing network test schedule.
    tags:
    - Network Test
    produces:
    - application/json
    parameters:
    - in: path
      name: schedule_id
      description: The database ID of the network test schedule.
      required: true
      type: integer
    responses:
      "200":
        description: Successful operation.
      "404":
        description: Unknown network test schedule ID.
      "500":
        description: Failed to delete network test schedule.
    """
    schedule_id = int(request.match_info["schedule_id"])
    if not Scheduler.has_schedule(schedule_id):
        raise web.HTTPNotFound(
            text=f"No network test schedule with ID '{schedule_id}' was found"
        )

    if not await Scheduler.delete_schedule(schedule_id):
        raise web.HTTPInternalServerError(text="Failed to delete network test schedule")

    return web.json_response(
        {"status": "success", "message": "Successfully deleted network test schedule"}
    )


@routes.get("/execution")
async def handle_get_executions(request: web.Request) -> web.Response:  # noqa: C901
    """
    ---
    description: Return all of the network test executions and their params.
    tags:
    - Network Test
    parameters:
    - in: query
      name: test_type
      description: A comma-separated list of network test types.
      type: array
      items:
        type: string
        enum: [parallel_link, parallel_node, sequential_link, sequential_node]
    - in: query
      name: network_name
      description: The name of the network.
      type: string
    - in: query
      name: protocol
      description: A comma-separated list of iperf transport protocols (6=TCP, 17=UDP).
      type: array
      items:
        type: integer
        enum: [6, 17]
    - in: query
      name: partial
      description: If the test is only run on part of the network
      type: boolean
    - in: query
      name: status
      description: A comma-separated list of execution statuses.
      type: array
      items:
        type: string
    - in: query
      name: start_dt
      description: The start UTC offset-naive datetime in ISO 8601 format.
      type: string
    produces:
    - application/json
    responses:
      "200":
        description: Successful operation.
      "400":
        description: Invalid filter parameters.
    """
    test_type = request.rel_url.query.get("test_type")
    if test_type is not None:
        try:
            test_type = {NetworkTestType(t) for t in test_type.split(",")}
        except ValueError:
            raise web.HTTPBadRequest(
                text="'test_type' must be a comma-separated list of valid test types"
            )

    network_name = request.rel_url.query.get("network_name")

    protocol = request.rel_url.query.get("protocol")
    if protocol is not None:
        try:
            protocol = {int(p) for p in protocol.split(",")}
        except ValueError:
            raise web.HTTPBadRequest(
                text="'protocol' must be a comma-separated list of valid integer values"
            )

    partial = request.rel_url.query.get("partial")
    if partial == "true":
        partial = True
    elif partial == "false":
        partial = False
    elif partial is not None:
        raise web.HTTPBadRequest(text=f"'partial' must be true/false: {partial}")

    status = request.rel_url.query.get("status")
    if status is not None:
        try:
            status = {NetworkTestStatus(s) for s in status.split(",")}
        except ValueError:
            raise web.HTTPBadRequest(
                text="'status' must be a comma-separated list of valid test statuses"
            )

    start_dt = request.rel_url.query.get("start_dt")
    if start_dt is not None:
        try:
            start_dt = datetime.fromisoformat(start_dt)
        except ValueError:
            raise web.HTTPBadRequest(
                text=f"'start_dt' must be valid ISO 8601 format: {start_dt}"
            )

    return web.json_response(
        {
            "executions": [
                dict(row)
                for row in await Scheduler.list_executions(
                    test_type, network_name, protocol, partial, status, start_dt
                )
            ]
        },
        dumps=functools.partial(json.dumps, default=custom_serializer),
    )


@routes.get("/execution/{execution_id:[0-9]+}")
async def handle_get_execution(request: web.Request) -> web.Response:
    """
    ---
    description: Return the network test execution, params, and results for a particular network test execution ID.
    tags:
    - Network Test
    produces:
    - application/json
    parameters:
    - in: path
      name: execution_id
      description: The database ID of the network test execution.
      required: true
      type: integer
    responses:
      "200":
        description: Successful operation.
      "404":
        description: Unknown network test execution ID.
    """
    execution_id = int(request.match_info["execution_id"])
    execution_output = await Scheduler.describe_execution(execution_id)
    if execution_output is None:
        raise web.HTTPNotFound(
            text=f"No network test execution with ID '{execution_id}' was found"
        )

    execution, results = execution_output
    return web.json_response(
        {"execution": dict(execution), "results": [dict(row) for row in results]},
        dumps=functools.partial(json.dumps, default=custom_serializer),
    )


@routes.post("/execution")
async def handle_start_execution(request: web.Request) -> web.Response:
    """
    ---
    description: Start a new network test execution.
    tags:
    - Network Test
    produces:
    - application/json
    parameters:
    - in: body
      name: execution
      description: The network test params of the execution.
      schema:
        type: object
        properties:
          test_type:
            type: string
            enum: [parallel_link, parallel_node, sequential_link, sequential_node]
          network_name:
            type: string
          iperf_options:
            type: object
          whitelist:
            type: array
            items:
              type: string
        required:
        - test_type
        - network_name
    responses:
      "200":
        description: Successful operation.
      "400":
        description: Invalid or missing parameters.
      "409":
        description: A network test is already running on the network.
      "500":
        description: Failed to prepare network test assets.
    """
    body = await request.json()

    test_type = body.get("test_type")
    if test_type is None:
        raise web.HTTPBadRequest(text="Missing required 'test_type' param")
    if not NetworkTestType.has_value(test_type):
        raise web.HTTPBadRequest(text=f"Invalid 'test_type': {test_type}")
    test_type = NetworkTestType(test_type)

    network_name = body.get("network_name")
    if network_name is None:
        raise web.HTTPBadRequest(text="Missing required 'network_name' param")
    if network_name not in APIServiceClient.network_names():
        raise web.HTTPBadRequest(text=f"Invalid 'network_name': {network_name}")
    if await Scheduler.is_network_busy(network_name):
        raise web.HTTPConflict(text=f"A test is already running on '{network_name}'")

    iperf_options = body.get("iperf_options", {})
    whitelist = body.get("whitelist", [])

    test: BaseTest
    if test_type == NetworkTestType.PARALLEL_LINK:
        test = ParallelLinkTest(network_name, iperf_options, whitelist)
    elif test_type == NetworkTestType.PARALLEL_NODE:
        test = ParallelNodeTest(network_name, iperf_options, whitelist)
    elif test_type == NetworkTestType.SEQUENTIAL_LINK:
        test = SequentialLinkTest(network_name, iperf_options, whitelist)
    elif test_type == NetworkTestType.SEQUENTIAL_NODE:
        test = SequentialNodeTest(network_name, iperf_options, whitelist)

    if not await test.prepare():
        raise web.HTTPInternalServerError(text="Failed to prepare network test assets")

    execution_id = await Scheduler.start_execution(test)
    return web.json_response(
        {
            "status": "success",
            "message": f"Started new network test execution with ID: {execution_id}",
            "execution_id": execution_id,
        }
    )


@routes.delete("/execution/{execution_id:[0-9]+}")
async def handle_stop_execution(request: web.Request) -> web.Response:
    """
    ---
    description: Stop a running network test execution.
    tags:
    - Network Test
    produces:
    - application/json
    parameters:
    - in: path
      name: execution_id
      description: The database ID of the network test execution.
      required: true
      type: integer
    responses:
      "200":
        description: Successful operation.
      "404":
        description: Unknown network test execution ID.
      "500":
        description: Failed to stop network test execution.
    """
    execution_id = int(request.match_info["execution_id"])
    if not Scheduler.has_execution(execution_id):
        raise web.HTTPNotFound(
            text=f"No running network test execution with ID '{execution_id}' was found"
        )

    if not await Scheduler.stop_execution(execution_id):
        raise web.HTTPInternalServerError(text="Failed to stop network test execution")

    return web.json_response(
        {"status": "success", "message": "Successfully stopped network test execution"}
    )
