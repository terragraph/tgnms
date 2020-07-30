#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import enum
import functools
import json
from collections import defaultdict
from datetime import datetime
from typing import Any, Iterable

from aiohttp import web
from croniter import croniter
from tglib.clients import APIServiceClient

from .models import ScanMode, ScanTestStatus, ScanType
from .scan import ScanTest
from .scheduler import Schedule, Scheduler


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
    description: Return all of the scan test schedules and their current params.
    tags:
    - Scan Service
    parameters:
    - in: query
      name: network_name
      description: The name of the network.
      type: string
    - in: query
      name: type
      description: The type of scan.
      type: integer
    - in: query
      name: mode
      description: The mode of scan.
      type: integer
    produces:
    - application/json
    responses:
      "200":
        description: Successful operation.
      "400":
        description: Invalid filter parameters.
    """
    network_name = request.rel_url.query.get("network_name")
    if network_name is None:
        raise web.HTTPBadRequest(text="Missing required 'network_name' param")
    if network_name not in APIServiceClient.network_names():
        raise web.HTTPBadRequest(text=f"Invalid network name: {network_name}")

    type = request.rel_url.query.get("type")
    if type is not None:
        type = int(type)
        if not ScanType.has_value(type):
            raise web.HTTPBadRequest(text=f"Invalid 'type': {type}")
        type = ScanType(type)

    mode = request.rel_url.query.get("mode")
    if mode is not None:
        mode = int(mode)
        if not ScanMode.has_value(mode):
            raise web.HTTPBadRequest(text=f"Invalid 'mode': {mode}")
        mode = ScanMode(mode)

    return web.json_response(
        {
            "schedules": [
                dict(row)
                for row in await Scheduler.list_schedules(network_name, type, mode)
            ]
        },
        dumps=functools.partial(json.dumps, default=custom_serializer),
    )


@routes.get("/schedule/{schedule_id:[0-9]+}")
async def handle_get_schedule(request: web.Request) -> web.Response:
    """
    ---
    description: Return the scan test schedule, params, and execution history for a particular scan test schedule ID.
    tags:
    - Scan Service
    produces:
    - application/json
    parameters:
    - in: path
      name: schedule_id
      description: The database ID of a scan test schedule.
      required: true
      type: integer
    responses:
      "200":
        description: Successful operation.
      "404":
        description: Unknown scan test schedule ID.
    """
    schedule_id = int(request.match_info["schedule_id"])
    schedule_output = await Scheduler.describe_schedule(schedule_id)
    if schedule_output is None:
        raise web.HTTPNotFound(
            text=f"No scan test schedule with ID '{schedule_id}' was found"
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
    description: Add a new scan test schedule.
    tags:
    - Scan Service
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
          network_name:
            type: string
          type:
            type: integer
          mode:
            type: integer
          options:
            type: object
        required:
        - enabled
        - cron_expr
        - network_name
        - mode
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

    network_name = body.get("network_name")
    if network_name is None:
        raise web.HTTPBadRequest(text="Missing required 'network_name' param")
    if network_name not in APIServiceClient.network_names():
        raise web.HTTPBadRequest(text=f"Invalid network name: {network_name}")

    mode = body.get("mode")
    if mode is None:
        raise web.HTTPBadRequest(text="Missing required 'mode' param")
    if not ScanMode.has_value(mode):
        raise web.HTTPBadRequest(text=f"Invalid 'mode': {mode}")
    mode = ScanMode(mode)

    type = body.get("type", 2)
    if not ScanType.has_value(type):
        raise web.HTTPBadRequest(text=f"Invalid 'type': {type}")
    type = ScanType(type)

    options = body.get("options", {})

    schedule = Schedule(enabled, cron_expr)
    test = ScanTest(network_name, type, mode, options)
    schedule_id = await Scheduler.add_schedule(schedule, test)

    return web.Response(text=f"Added scan test schedule with ID: {schedule_id}")


@routes.put("/schedule/{schedule_id:[0-9]+}")
async def handle_modify_schedule(request: web.Request) -> web.Response:
    """
    ---
    description: Modify an existing scan test schedule.
    tags:
    - Scan Service
    produces:
    - text/plain
    parameters:
    - in: path
      name: schedule_id
      description: The database ID of the scan test schedule.
      required: true
      type: integer
    - in: body
      name: schedule
      description: The updated scan test schedule and params
      schema:
        type: object
        properties:
          enabled:
            type: boolean
          cron_expr:
            type: string
          network_name:
            type: string
          type:
            type: integer
          mode:
            type: integer
          options:
            type: object
        required:
        - enabled
        - cron_expr
        - network_name
        - mode
    responses:
      "200":
        description: Successful operation.
      "400":
        description: Invalid or missing parameters.
      "404":
        description: Unknown scan test schedule ID.
      "500":
        description: Failed to modify scan test schedule.
    """
    schedule_id = int(request.match_info["schedule_id"])
    if not Scheduler.has_schedule(schedule_id):
        raise web.HTTPNotFound(
            text=f"No scan test schedule with ID '{schedule_id}' was found"
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

    mode = body.get("mode")
    if mode is None:
        raise web.HTTPBadRequest(text="Missing required 'mode' param")
    if not ScanMode.has_value(mode):
        raise web.HTTPBadRequest(text=f"Invalid 'mode': {mode}")
    mode = ScanMode(mode)

    type = body.get("type", 2)
    if not ScanType.has_value(type):
        raise web.HTTPBadRequest(text=f"Invalid 'type': {type}")
    type = ScanType(type)

    options = body.get("options", {})

    schedule = Schedule(enabled, cron_expr)
    test = ScanTest(network_name, type, mode, options)
    if not await Scheduler.modify_schedule(schedule_id, schedule, test):
        raise web.HTTPInternalServerError(text="Failed to modify scan test schedule")

    return web.Response(text="Successfully updated scan test schedule")


@routes.delete("/schedule/{schedule_id:[0-9]+}")
async def handle_delete_schedule(request: web.Request) -> web.Response:
    """
    ---
    description: Delete an existing scan test schedule.
    tags:
    - Scan Service
    produces:
    - text/plain
    parameters:
    - in: path
      name: schedule_id
      description: The database ID of the scan test schedule.
      required: true
      type: integer
    responses:
      "200":
        description: Successful operation.
      "404":
        description: Unknown scan test schedule ID.
      "500":
        description: Failed to delete scan test schedule.
    """
    schedule_id = int(request.match_info["schedule_id"])
    if not Scheduler.has_schedule(schedule_id):
        raise web.HTTPNotFound(
            text=f"No scan test schedule with ID '{schedule_id}' was found"
        )

    if not await Scheduler.delete_schedule(schedule_id):
        raise web.HTTPInternalServerError(text="Failed to delete scan test schedule")

    return web.Response(text="Successfully deleted scan test schedule")


@routes.get("/execution")
async def handle_get_executions(request: web.Request) -> web.Response:
    """
    ---
    description: Return all of the scan test executions and their params.
    tags:
    - Scan Service
    parameters:
    - in: query
      name: network_name
      description: The name of the network.
      type: string
    - in: query
      name: type
      description: The type of scan test.
      type: integer
    - in: query
      name: mode
      description: The mode of scan test.
      type: integer
    - in: query
      name: status
      description: The status of the execution.
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
    network_name = request.rel_url.query.get("network_name")
    if network_name is None:
        raise web.HTTPBadRequest(text="Missing required 'network_name' param")
    if network_name not in APIServiceClient.network_names():
        raise web.HTTPBadRequest(text=f"Invalid network name: {network_name}")

    type = request.rel_url.query.get("type")
    if type is not None:
        type = int(type)
        if not ScanType.has_value(type):
            raise web.HTTPBadRequest(text=f"Invalid 'type': {type}")
        type = ScanType(type)

    mode = request.rel_url.query.get("mode")
    if mode is not None:
        mode = int(mode)
        if not ScanMode.has_value(mode):
            raise web.HTTPBadRequest(text=f"Invalid 'mode': {mode}")
        mode = ScanMode(mode)

    status = request.rel_url.query.get("status")
    if status is not None:
        if not ScanTestStatus.has_value(status):
            raise web.HTTPBadRequest(text=f"Invalid 'status': {status}")
        status = ScanTestStatus(status)

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
                    network_name, type, mode, status, start_dt
                )
            ]
        },
        dumps=functools.partial(json.dumps, default=custom_serializer),
    )


@routes.get("/execution/{execution_id:[0-9]+}")
async def handle_get_execution(request: web.Request) -> web.Response:
    """
    ---
    description: Return the scan test execution, params, results and response rate for a particular scan test execution ID.
    tags:
    - Scan Service
    produces:
    - application/json
    parameters:
    - in: path
      name: execution_id
      description: The database ID of the scan test execution.
      required: true
      type: integer
    responses:
      "200":
        description: Successful operation.
      "404":
        description: Unknown scan test execution ID.
    """

    def update_results(scan_results: defaultdict, results: Iterable) -> None:
        for row in results:
            scan_results[row.token].update(
                {key: val for key, val in row.items() if key != "token"}
            )

    def update_analysis_results(
        scan_results: defaultdict, results: Iterable, type: str
    ) -> None:
        for row in results:
            name = "aggregated_" + type if row.is_n_day_avg else type
            scan_results[row.token][name].append(
                {
                    key: val
                    for key, val in row.items()
                    if key not in {"token", "group_id"}
                }
            )

    execution_id = int(request.match_info["execution_id"])
    execution_output = await Scheduler.describe_execution(execution_id)
    if execution_output is None:
        raise web.HTTPNotFound(
            text=f"No scan test execution with ID '{execution_id}' was found"
        )

    execution, results, connectivity_results, interference_results = execution_output

    scan_results: defaultdict = defaultdict(lambda: defaultdict(list))
    update_results(scan_results, results)
    update_analysis_results(scan_results, connectivity_results, "connectivity")
    update_analysis_results(scan_results, interference_results, "interference")

    return web.json_response(
        {"execution": dict(execution), "results": scan_results},
        dumps=functools.partial(json.dumps, default=custom_serializer),
    )


@routes.post("/execution")
async def handle_start_execution(request: web.Request) -> web.Response:
    """
    ---
    description: Start a new scan test execution.
    tags:
    - Scan Service
    produces:
    - text/plain
    parameters:
    - in: body
      name: execution
      description: The scan test params of the execution.
      schema:
        type: object
        properties:
          network_name:
            type: string
          type:
            type: integer
          mode:
            type: integer
          options:
            type: object
        required:
        - network_name
        - mode
    responses:
      "200":
        description: Successful operation.
      "400":
        description: Invalid or missing parameters.
    """
    body = await request.json()

    network_name = body.get("network_name")
    if network_name is None:
        raise web.HTTPBadRequest(text="Missing required 'network_name' param")
    if network_name not in APIServiceClient.network_names():
        raise web.HTTPBadRequest(text=f"Invalid 'network_name': {network_name}")

    mode = body.get("mode")
    if mode is None:
        raise web.HTTPBadRequest(text="Missing required 'mode' param")
    if not ScanMode.has_value(mode):
        raise web.HTTPBadRequest(text=f"Invalid 'mode': {mode}")
    mode = ScanMode(mode)

    type = body.get("type", 2)
    if not ScanType.has_value(type):
        raise web.HTTPBadRequest(text=f"Invalid 'type': {type}")
    type = ScanType(type)

    options = body.get("options", {})

    test = ScanTest(network_name, type, mode, options)
    execution_id = await Scheduler.start_execution(test)
    return web.Response(text=f"Started new scan test execution with ID: {execution_id}")
