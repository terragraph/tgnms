#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import enum
import json
from datetime import datetime
from functools import partial
from typing import Any

from aiohttp import web
from croniter import croniter

from .models import NetworkTestType
from .scheduler import Schedule, Scheduler
from .suites import BaseTest, Multihop, Parallel, Sequential


routes = web.RouteTableDef()


def custom_serializer(obj: Any) -> str:
    if isinstance(obj, enum.Enum):
        return obj.name
    elif isinstance(obj, datetime):
        return datetime.isoformat(obj)
    else:
        return str(obj)


@routes.get("/schedule")
async def handle_get_schedules(request: web.Request) -> web.Response:
    """
    ---
    description: Return all of the network test schedules and their current params.
    tags:
    - Network Test
    produces:
    - application/json
    responses:
      "200":
        description: Successful operation.
    """
    return web.json_response(
        {"schedules": [dict(row) for row in await Scheduler.list_schedules()]},
        dumps=partial(json.dumps, default=custom_serializer),
    )


@routes.get("/schedule/{schedule_id:[0-9]+}")
async def handle_get_schedule(request: web.Request) -> web.Response:
    """
    ---
    description: Return the network test schedule and params for a particular network test schedule ID.
    tags:
    - Network Test
    produces:
    - application/json
    parameters:
    - in: path
      name: schedule_id
      description: The database ID of a network test schedule.
      required: true
      schema:
        type: integer
    responses:
      "200":
        description: Successful operation.
      "404":
        description: Unknown network test schedule ID.
    """
    schedule_id = int(request.match_info["schedule_id"])
    schedule = await Scheduler.list_schedules(schedule_id)
    if not schedule:
        raise web.HTTPNotFound(
            text=f"No network test schedule with ID '{schedule_id}' was found"
        )

    return web.json_response(
        {"schedule": dict(schedule)},
        dumps=partial(json.dumps, default=custom_serializer),
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
          network_name:
            type: string
          iperf_options:
            type: object
          whitelist:
            type: array
        required:
        - enabled
        - cron_expr
        - test_type
        - network_name
    produces:
    - text/plain
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
    if not NetworkTestType.has_value(test_type):
        raise web.HTTPBadRequest(
            text=f"No network test type for '{test_type}' was found"
        )
    test_type = NetworkTestType(test_type)

    network_name = body.get("network_name")
    if network_name is None:
        raise web.HTTPBadRequest(text="Missing required 'network_name' param")

    iperf_options = body.get("iperf_options", {})
    whitelist = body.get("whitelist", [])

    test: BaseTest
    if test_type == NetworkTestType.MULTIHOP:
        test = Multihop(network_name, iperf_options, whitelist)
    elif test_type == NetworkTestType.PARALLEL:
        test = Parallel(network_name, iperf_options, whitelist)
    elif test_type == NetworkTestType.SEQUENTIAL:
        test = Sequential(network_name, iperf_options, whitelist)

    schedule_id = await Scheduler.add_schedule(schedule, test, test_type)
    return web.Response(text=f"Added network test schedule with ID: {schedule_id}")


@routes.put("/schedule/{schedule_id:[0-9]+}")
async def handle_modify_schedule(request: web.Request) -> web.Response:
    """
    ---
    description: Modify an existing network test schedule.
    tags:
    - Network Test
    produces:
    - text/plain
    parameters:
    - in: path
      name: schedule_id
      description: The database ID of the network test schedule.
      required: true
      schema:
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
          test_type:
            type: string
          network_name:
            type: string
          iperf_options:
            type: object
          whitelist:
            type: array
        required:
        - enabled
        - cron_expr
        - test_type
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

    schedule = Schedule(enabled, cron_expr)

    test_type = body.get("test_type")
    if not NetworkTestType.has_value(test_type):
        raise web.HTTPBadRequest(
            text=f"No network test type for '{test_type}' was found"
        )
    test_type = NetworkTestType(test_type)

    network_name = body.get("network_name")
    if network_name is None:
        raise web.HTTPBadRequest(text="Missing required 'network_name' param")

    iperf_options = body.get("iperf_options", {})
    whitelist = body.get("whitelist", [])

    test: BaseTest
    if test_type == NetworkTestType.MULTIHOP:
        test = Multihop(network_name, iperf_options, whitelist)
    elif test_type == NetworkTestType.PARALLEL:
        test = Parallel(network_name, iperf_options, whitelist)
    elif test_type == NetworkTestType.SEQUENTIAL:
        test = Sequential(network_name, iperf_options, whitelist)

    if not await Scheduler.modify_schedule(schedule_id, schedule, test, test_type):
        raise web.HTTPInternalServerError(text="Failed to modify network test schedule")

    return web.Response(text="Successfully updated network test schedule")


@routes.delete("/schedule/{schedule_id:[0-9]+}")
async def handle_delete_schedule(request: web.Request) -> web.Response:
    """
    ---
    description: Delete an existing network test schedule.
    tags:
    - Network Test
    produces:
    - text/plain
    parameters:
    - in: path
      name: schedule_id
      description: The database ID of the network test schedule.
      required: true
      schema:
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

    return web.Response(text=f"Successfully deleted network test schedule")


@routes.get("/execution")
async def handle_get_executions(request: web.Request) -> web.Response:
    """
    ---
    description: Return all of the network test executions and their params.
    tags:
    - Network Test
    produces:
    - application/json
    responses:
      "200":
        description: Successful operation.
    """
    return web.json_response(
        {"executions": [dict(row) for row in await Scheduler.list_executions()]},
        dumps=partial(json.dumps, default=custom_serializer),
    )


@routes.get("/execution/{execution_id:[0-9]+}")
async def handle_get_execution(request: web.Request) -> web.Response:
    """
    ---
    description: Return the network test execution, params, results for a particular network test execution ID.
    tags:
    - Network Test
    produces:
    - application/json
    parameters:
    - in: path
      name: execution_id
      description: The database ID of the network test execution.
      required: true
      schema:
        type: integer
    responses:
      "200":
        description: Successful operation.
      "404":
        description: Unknown network test execution ID.
    """
    execution_id = int(request.match_info["execution_id"])
    execution = await Scheduler.list_executions(execution_id)
    if not execution:
        raise web.HTTPNotFound(
            text=f"No network test execution with ID '{execution_id}' was found"
        )

    results = await Scheduler.list_results(execution_id)
    return web.json_response(
        {"execution": dict(execution), "results": [dict(row) for row in results]},
        dumps=partial(json.dumps, default=custom_serializer),
    )


@routes.post("/execution")
async def handle_start_execution(request: web.Request) -> web.Response:
    """
    ---
    description: Start a new network test execution.
    tags:
    - Network Test
    produces:
    - text/plain
    parameters:
    - in: body
      name: execution
      description: The network test params of the execution.
      schema:
        type: object
        properties:
          test_type:
            type: string
          network_name:
            type: string
          iperf_options:
            type: object
          whitelist:
            type: array
        required:
        - test_type
        - network_name
    responses:
      "200":
        description: Successful operation.
      "400":
        description: Invalid or missing parameters.
      "404":
        description: Whitelist yielded no matching test assets.
      "409":
        description: A network test is already running on the network.
      "500":
        description: Failed to prepare network test assets.
    """
    body = await request.json()

    test_type = body.get("test_type")
    if not NetworkTestType.has_value(test_type):
        raise web.HTTPBadRequest(
            text=f"No network test type for '{test_type}' was found"
        )
    test_type = NetworkTestType(test_type)

    network_name = body.get("network_name")
    if network_name is None:
        raise web.HTTPBadRequest(text="Missing required 'network_name' param")
    if await Scheduler.is_network_busy(network_name):
        raise web.HTTPConflict(text=f"A test is already running on '{network_name}'")

    iperf_options = body.get("iperf_options", {})
    whitelist = body.get("whitelist", [])

    test: BaseTest
    if test_type == NetworkTestType.MULTIHOP:
        test = Multihop(network_name, iperf_options, whitelist)
    elif test_type == NetworkTestType.PARALLEL:
        test = Parallel(network_name, iperf_options, whitelist)
    elif test_type == NetworkTestType.SEQUENTIAL:
        test = Sequential(network_name, iperf_options, whitelist)

    prepare_output = await test.prepare()
    if prepare_output is None:
        raise web.HTTPInternalServerError(text="Failed to prepare network test assets")
    test_assets, _ = prepare_output
    if whitelist and not test_assets:
        raise web.HTTPNotFound(text=f"No test assets matched whitelist: {whitelist}")

    execution_id = await Scheduler.start_execution(test, test_type, prepare_output)
    return web.Response(
        text=f"Started new network test execution with ID: {execution_id}"
    )


@routes.delete("/execution/{execution_id:[0-9]+}")
async def handle_stop_execution(request: web.Request) -> web.Response:
    """
    ---
    description: Stop a running network test execution.
    tags:
    - Network Test
    produces:
    - text/plain
    parameters:
    - in: path
      name: execution_id
      description: The database ID of the network test execution.
      required: true
      schema:
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

    return web.Response(text="Successfully stopped network test execution")
