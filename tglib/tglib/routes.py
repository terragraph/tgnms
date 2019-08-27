#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import asyncio
import json
import logging

from aiohttp import web

from tglib import __version__
from .clients.prometheus_client import PrometheusClient


routes = web.RouteTableDef()


@routes.get("/status")
async def handle_get_status(request: web.Request) -> web.Response:
    """Check if the webserver is responsive."""
    return web.Response(text="Alive")


@routes.get("/health")
async def handle_health_check(request: web.Request) -> web.Response:
    """Check if any core application dependencies are unhealthy."""
    tasks = [client.health for client in request.app["clients"]]
    health_list = await asyncio.gather(*tasks)
    failed = [msg for health, msg in health_list if not health]

    if failed:
        msg = "\n".join(failed)
        raise web.HTTPServiceUnavailable(text=msg)

    return web.Response(text="All clients are healthy")


@routes.get("/version")
async def handle_get_version(request: web.Request) -> web.Response:
    """Get the tglib version."""
    return web.Response(text=__version__)


@routes.get(r"/metrics/{interval:\d+}s")
async def handle_get_metrics(request: web.Request) -> web.Response:
    """Return Prometheus metrics for the specified interval (404 if not available)."""
    interval = int(request.match_info["interval"])
    metrics = PrometheusClient.get_instance().poll_metrics(interval)

    if metrics is None:
        raise web.HTTPNotFound(text=f"No metrics queue available for {interval}s")

    metrics_str = "\n".join(metrics)
    return web.Response(text=metrics_str)


@routes.get("/config")
async def handle_get_config(request: web.Request) -> web.Response:
    """Return the current configuration settings."""
    try:
        with open("./service_config.json") as f:
            config = json.load(f)
            return web.json_response(config)
    except OSError:
        raise web.HTTPInternalServerError(text="Failed to load config file")


@routes.post("/config")
async def handle_set_config(request: web.Request) -> web.Response:
    """Completely overwrite the current configuration settings."""
    body = await request.json()

    if "config" not in body:
        raise web.HTTPBadRequest(text="Missing required 'config' param")

    config = body["config"]
    if not isinstance(config, dict):
        raise web.HTTPBadRequest(text="Invalid value for 'config': Not object")

    try:
        with open("./service_config.json", "w") as f:
            f.write(json.dumps(config))

        # Trigger the shutdown event
        request.app["shutdown_event"].set()
        return web.Response(text="Successfully overwrote config")
    except OSError:
        raise web.HTTPInternalServerError(text="Failed to overwrite config")


@routes.post("/log/level")
async def handle_set_log_level(request: web.Request) -> web.Response:
    """Dynamically set the log level."""
    body = await request.json()

    if "level" not in body:
        raise web.HTTPBadRequest(text="Missing required 'level' param")

    level = body["level"]
    prev_level = logging.getLevelName(logging.root.level)

    try:
        # Level can be any of ["DEBUG", "INFO", "WARNING", "ERROR", "FATAL"]
        logging.root.setLevel(level)
    except ValueError as e:
        raise web.HTTPNotFound(text=str(e))

    return web.Response(text=f"Log level set to {level} from {prev_level}")
