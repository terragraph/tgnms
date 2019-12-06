#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import asyncio
import json
import logging

from aiohttp import web
from tglib import __version__

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


@routes.get("/health")
async def handle_health_check(request: web.Request) -> web.Response:
    """
    ---
    description: Check if any core application dependencies are unhealthy.
    tags:
    - Health
    produces:
    - text/plain
    responses:
      "200":
        description: Successful operation. All clients are healthy.
      "503":
        description: One or more clients are unhealthy. Return health and reason.
    """
    tasks = [client.health_check() for client in request.app["clients"]]
    health_check_results = await asyncio.gather(*tasks)
    failed = [
        f"{result.client}: {result.msg}"
        for result in health_check_results
        if not result.healthy
    ]

    if failed:
        msg = "\n".join(failed)
        raise web.HTTPServiceUnavailable(text=msg)

    return web.Response(text="All clients are healthy")


@routes.get("/version")
async def handle_get_version(request: web.Request) -> web.Response:
    """
    ---
    description: Get the tglib version.
    tags:
    - Health
    produces:
    - text/plain
    responses:
      "200":
        description: Return tglib version.
    """
    return web.Response(text=__version__)


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
        description: Return list of Prometheus metrics for the specified interval.
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

    metrics_str = "\n".join(metrics)
    return web.Response(text=metrics_str)


@routes.get("/config")
async def handle_get_config(request: web.Request) -> web.Response:
    """
    ---
    description: Return the current configuration settings.
    tags:
    - Configuration
    produces:
    - application/json
    responses:
      "200":
        description: Return current service configuration settings.
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


@routes.post("/config/set")
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
      name: body
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
        description: Successful operation. Overwrote service configuration.
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


@routes.post("/config/update")
async def handle_update_config(request: web.Request) -> web.Response:
    """
    ---
    description: Update the current configuration settings.
    tags:
    - Configuration
    produces:
    - text/plain
    parameters:
    - in: body
      name: body
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
        description: Successful operation. Updated specified service configuration values.
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

            # Write new config at the beginning of the file; truncate what's left
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


@routes.post("/log/level")
async def handle_set_log_level(request: web.Request) -> web.Response:
    """
    ---
    description: Dynamically set the log level.
    tags:
    - Configuration
    produces:
    - text/plain
    parameters:
    - in: body
      name: body
      description: New log level.
      required: true
      schema:
        type: object
        properties:
          level:
            type: string
            enum: ["DEBUG", "INFO", "WARNING", "ERROR", "FATAL"]
        required:
        - level
    responses:
      "200":
        description: Successful operation. Updated logging level.
      "404":
        description: Invalid log level.
    """
    body = await request.json()

    if "level" not in body:
        raise web.HTTPBadRequest(text="Missing required 'level' param")

    level = body["level"]
    prev_level = logging.getLevelName(logging.root.level)

    try:
        logging.root.setLevel(level)
    except ValueError as e:
        raise web.HTTPNotFound(text=str(e))

    return web.Response(text=f"Log level set to {level} from {prev_level}")
