#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import asyncio
import json
import logging

from aiohttp import web

from .clients.prometheus_client import PrometheusClient
from .exceptions import ClientStoppedError
from .utils.dict import deep_update


routes = web.RouteTableDef()


@routes.get("/status")
async def handle_get_status(request: web.Request) -> web.Response:
    """
    ---
    description: Check if the webserver is responsive.
    tags:
    - Health
    produces:
    - text/plain
    responses:
      "200":
        description: Successful operation. Return "Alive" text.
    """
    return web.Response(text="Alive")


@routes.get(r"/metrics/{interval:\d+}s")
async def handle_get_metrics(request: web.Request) -> web.Response:
    """
    ---
    description: Return Prometheus metrics for the specified interval.
    tags:
    - Prometheus
    produces:
    - text/plain
    parameters:
    - in: path
      name: interval
      description: Prometheus scrape metric interval (in seconds).
      required: true
      schema:
        type: integer
    responses:
      "200":
        description: Successful operation.
      "404":
        description: No metrics queue available for the specified interval.
      "500":
        description: Prometheus client is not running.
    """
    interval = int(request.match_info["interval"])

    try:
        metrics = PrometheusClient.poll_metrics(interval)
    except ClientStoppedError as e:
        raise web.HTTPInternalServerError(text=f"{str(e)}")

    if metrics is None:
        raise web.HTTPNotFound(text=f"No metrics queue available for {interval}s")

    # Return a string because Prometheus only accepts a text-based exposition format
    metrics_str = "\n".join(metrics)
    return web.Response(text=metrics_str)


@routes.get("/config")
async def handle_get_config(request: web.Request) -> web.Response:
    """
    ---
    description: Return the current service configuration settings.
    tags:
    - Configuration
    produces:
    - application/json
    responses:
      "200":
        description: Successful operation.
      "500":
        description: Failed to load or parse the configuration file.
    """
    try:
        with open("./service_config.json") as f:
            config = json.load(f)
            return web.json_response(config)
    except json.JSONDecodeError:
        raise web.HTTPInternalServerError(
            text="Existing configuration is not valid JSON"
        )
    except OSError:
        raise web.HTTPInternalServerError(text="Failed to load existing configuration")


@routes.put("/config")
async def handle_set_config(request: web.Request) -> web.Response:
    """
    ---
    description: Completely overwrite the current configuration settings.
    tags:
    - Configuration
    produces:
    - text/plain
    parameters:
    - in: body
      name: config
      description: New service configuration object
      required: true
      schema:
        type: object
        properties:
          config:
            type: object
        required:
        - config
    responses:
      "200":
        description: Successful operation.
      "400":
        description: Missing or invalid 'config' parameter.
      "500":
        description: Failed to overwrite service configuration.
    """
    body = await request.json()

    if "config" not in body:
        raise web.HTTPBadRequest(text="Missing required 'config' param")

    config = body["config"]
    if not isinstance(config, dict):
        raise web.HTTPBadRequest(text="Invalid value for 'config': Not object")

    try:
        with open("./service_config.json", "w") as f:
            json.dump(config, f)

        # Trigger the shutdown event
        request.app["shutdown_event"].set()
        return web.Response(text="Successfully overwrote config")
    except OSError:
        raise web.HTTPInternalServerError(text="Failed to overwrite config")


@routes.patch("/config")
async def handle_update_config(request: web.Request) -> web.Response:
    """
    ---
    description: Partially update the current configuration settings.
    tags:
    - Configuration
    produces:
    - text/plain
    parameters:
    - in: body
      name: config
      description: Partial service configuration object with updated values.
      required: true
      schema:
        type: object
        properties:
          config:
            type: object
        required:
        - config
    responses:
      "200":
        description: Successful operation.
      "400":
        description: Missing or invalid 'config' parameter.
      "500":
        description: Failed to update service configuration.
    """
    body = await request.json()

    if "config" not in body:
        raise web.HTTPBadRequest(text="Missing required 'config' param")

    updates = body["config"]
    if not isinstance(updates, dict):
        raise web.HTTPBadRequest(text="Invalid value for 'config': Not object")

    try:
        with open("./service_config.json", "r+") as f:
            config = json.load(f)
            deep_update(config, updates)

            # Write new config at the beginning of the file and truncate what's left
            f.seek(0)
            json.dump(config, f)
            f.truncate()

        # Trigger the shutdown event
        request.app["shutdown_event"].set()
        return web.Response(text="Successfully updated configuration")
    except json.JSONDecodeError:
        raise web.HTTPInternalServerError(
            text="Existing configuration is not valid JSON"
        )
    except OSError:
        raise web.HTTPInternalServerError(text="Failed to update configuration")


@routes.put(r"/log/{level:[A-Z]+}")
async def handle_set_log_level(request: web.Request) -> web.Response:
    """
    ---
    description: Dynamically set the log level.
    tags:
    - Configuration
    produces:
    - text/plain
    parameters:
    - in: path
      name: level
      description: The new log level.
      required: true
      type: string
      enum: [DEBUG, INFO, WARNING, ERROR, FATAL]
    responses:
      "200":
        description: Successful operation.
      "404":
        description: Invalid log level.
    """
    level = request.match_info["level"]
    prev_level = logging.getLevelName(logging.root.level)

    if level == prev_level:
        return web.Response(text=f"Log level is already {prev_level}")

    try:
        logging.root.setLevel(level)
    except ValueError as e:
        raise web.HTTPNotFound(text=str(e))

    return web.Response(text=f"Log level set to {level} from {prev_level}")
