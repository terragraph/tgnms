#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import asyncio
import json
import logging

from aiohttp import web

from .clients.prometheus_client import PrometheusClient
from .exceptions import ClientStoppedError
from .utils.dict import deep_update


try:
    import yaml
    from importlib import util

    _SWAGGER_ENABLED = bool(util.find_spec("aiohttp_swagger"))
except ImportError:
    _SWAGGER_ENABLED = False


routes = web.RouteTableDef()


@routes.get("/health")
async def handle_get_health(request: web.Request) -> web.Response:
    """Check the health of all the running clients.

    Args:
        request: Request context injected by :mod:`aiohttp`.

    Returns:
        JSON response with client health information.

    Example:
        ::

            # curl -i http://localhost:8080/health
            HTTP/1.1 200 OK
            Content-Type: application/json; charset=utf-8
            Content-Length: 135
            Date: Fri, 23 Oct 2020 20:34:56 GMT
            Server: Python/3.8 aiohttp/3.6.2

            {"success": false, "healthy": ["KafkaConsumer", "KafkaProducer", "MySQLClient", "PrometheusClient"], "unhealthy": ["APIServiceClient"]}

    ---
    description: Check the health of all the running clients.
    tags:
    - Health
    produces:
    - application/json
    responses:
      "200":
        description: Successful operation. Return health of all running clients.
    """
    coros = [client.healthcheck() for client in request.app["clients"]]

    good, bad = [], []
    for client, healthy in zip(request.app["clients"], await asyncio.gather(*coros)):
        if healthy:
            good.append(client.__name__)
        else:
            bad.append(client.__name__)

    return web.json_response({"success": not bad, "healthy": good, "unhealthy": bad})


@routes.get("/status")
async def handle_get_status(request: web.Request) -> web.Response:
    """Check if the webserver is responsive.

    Args:
        request: Request context injected by :mod:`aiohttp`.

    Returns:
        "Alive" text indicating that the webserver is healthy.

    Example:
        ::

            # curl -i http://localhost:8080/status
            HTTP/1.1 200 OK
            Content-Type: text/plain; charset=utf-8
            Content-Length: 5
            Date: Tue, 12 May 2020 18:57:45 GMT
            Server: Python/3.8 aiohttp/3.6.2

            Alive

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


@routes.get("/docs")
async def handle_get_swagger_docs(request: web.Request) -> web.Response:
    """Fetch the Swagger documentation in JSON.

    Args:
        request: Request context injected by :mod:`aiohttp`.

    Returns:
        Swagger JSON documentation for the service's API endpoints.

    Raises:
        web.HTTPServiceUnavailable: Documentation dependencies are missing.

    Example:
        ::

            # curl -i http://localhost:8080/docs
            HTTP/1.1 200 OK
            Content-Type: application/json; charset=utf-8
            Content-Length: 13832
            Date: Fri, 02 Oct 2020 19:19:15 GMT
            Server: Python/3.8 aiohttp/3.6.2

            {"swagger": "2.0", "info": {"description": "Swagger API definition\\n", "version": "1.0.0", ...

    ---
    description: Fetch the Swagger documentation in JSON.
    tags:
    - Documentation
    produces:
    - application/json
    responses:
      "200":
        description: Successful operation.
      "503":
        description: Documentation dependencies are missing.
    """
    if not _SWAGGER_ENABLED or "SWAGGER_DEF_CONTENT" not in request.app:
        raise web.HTTPServiceUnavailable(text="Documentation dependencies are missing")
    return web.json_response(json.loads(request.app["SWAGGER_DEF_CONTENT"]))


@routes.get("/docs.yml")
async def handle_get_swagger_docs_yml(request: web.Request) -> web.Response:
    """Fetch the raw Swagger YAML documentation.

    Args:
        request: Request context injected by :mod:`aiohttp`.

    Returns:
        Swagger YAML documentation for the service's API endpoints.

    Raises:
        web.HTTPServiceUnavailable: Documentation dependencies are missing.

    Example:
        ::

            # curl -i http://localhost:8080/docs.yml
            HTTP/1.1 200 OK
            Content-Type: text/plain; charset=utf-8
            Content-Length: 3729
            Date: Fri, 26 Jun 2020 21:52:11 GMT
            Server: Python/3.8 aiohttp/3.6.2

            basePath: /
            info:
              description: 'Swagger API definition'
              title: Swagger API
              version: 1.0.0
            ...

    ---
    description: Fetch the raw Swagger YAML documentation.
    tags:
    - Documentation
    produces:
    - text/plain
    responses:
      "200":
        description: Successful operation.
      "503":
        description: Documentation dependencies are missing.
    """
    if not _SWAGGER_ENABLED or "SWAGGER_DEF_CONTENT" not in request.app:
        raise web.HTTPServiceUnavailable(text="Documentation dependencies are missing")
    return web.Response(text=yaml.dump(json.loads(request.app["SWAGGER_DEF_CONTENT"])))


@routes.get("/metrics")
async def handle_get_metrics(request: web.Request) -> web.Response:
    """Scrape the Prometheus metrics cache.

    Args:
        request: Request context injected by :mod:`aiohttp`.

    Returns:
        Prometheus metrics in PromQL form joined with new line characters.

    Raises:
        web.HTTPInternalServerError: The PrometheusClient is not running

    Example:
        ::

            # curl -i http://localhost:8080/metrics
            HTTP/1.1 200 OK
            Content-Type: text/plain; charset=utf-8
            Content-Length: 14161
            Date: Tue, 12 May 2020 18:58:37 GMT
            Server: Python/3.8 aiohttp/3.6.2

            topology_link_is_online{network="Fremont F0 A",linkName="link_terra114_f1_terra123_f1",cn="false"} 1 1589483730560
            topology_link_attempts{network="Fremont F0 A",linkName="link_terra114_f1_terra123_f1",cn="false"} 3 1589483730560
            topology_link_distance_meters{network="Fremont F0 A",linkName="link_terra114_f1_terra123_f1",cn="false"} 7.009682947243152 1589483730560
            ...

    ---
    description: Scrape the Prometheus metrics cache.
    tags:
    - Prometheus
    produces:
    - text/plain
    responses:
      "200":
        description: Successful operation.
      "500":
        description: Prometheus client is not running.
    """
    try:
        metrics = PrometheusClient.poll_metrics()
    except ClientStoppedError:
        raise web.HTTPInternalServerError(text="The Prometheus client is not running")

    # Return a string because Prometheus only accepts a text-based exposition format
    metrics_str = "\n".join(metrics)
    return web.Response(text=metrics_str)


@routes.get("/config")
async def handle_get_config(request: web.Request) -> web.Response:
    """Return the current service configuration settings.

    Args:
        request: Request context injected by :mod:`aiohttp`.

    Returns:
        The service's current configuration settings.

    Raises:
        web.HTTPInternalServerError: Failed to load or parse the configuration file.

    Example:
        ::

            # curl -i http://localhost:8080/config
            HTTP/1.1 200 OK
            Content-Type: application/json; charset=utf-8
            Content-Length: 56
            Date: Tue, 12 May 2020 18:59:12 GMT
            Server: Python/3.8 aiohttp/3.6.2

            {"topics": ["iperf_results"], "execution_timeout_s": 15}

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
    """Completely overwrite the service's configuration settings.

    Args:
        request: Request context injected by :mod:`aiohttp`.

    Returns:
        The overwritten configuration settings.

    Raises:
        web.HTTPBadRequest: Missing or invalid input ``config`` parameter.
        web.HTTPInternalServerError: Failed to overwrite service configuration.

    Example:
        ::

            # curl -id '{"config": {"topics": ["iperf_results"], "execution_timeout_s": 30}}' http://localhost:8080/config -X PUT
            HTTP/1.1 200 OK
            Content-Type: application/json; charset=utf-8
            Content-Length: 56
            Date: Tue, 12 May 2020 19:00:57 GMT
            Server: Python/3.8 aiohttp/3.6.2

            {"topics": ["iperf_results"], "execution_timeout_s": 30}

    ---
    description: Completely overwrite the service's configuration settings.
    tags:
    - Configuration
    produces:
    - application/json
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
        return web.json_response(config)
    except OSError:
        raise web.HTTPInternalServerError(text="Failed to overwrite config")


@routes.patch("/config")
async def handle_update_config(request: web.Request) -> web.Response:
    """Partially update the service's configuration settings.

    Args:
        request: Request context injected by :mod:`aiohttp`.

    Returns:
        The updated configuration settings.

    Raises:
        web.HTTPBadRequest: Missing or invalid ``config`` parameter.
        web.HTTPInternalServerError: Failed to update service configuration.

    Example:
        ::

            # curl -id '{"config": {"execution_timeout_s": 30}}' http://localhost:8080/config -X PATCH
            HTTP/1.1 200 OK
            Content-Type: application/json; charset=utf-8
            Content-Length: 56
            Date: Tue, 12 May 2020 19:00:57 GMT
            Server: Python/3.8 aiohttp/3.6.2

            {"topics": ["iperf_results"], "execution_timeout_s": 30}

    ---
    description: Partially update the service's configuration settings.
    tags:
    - Configuration
    produces:
    - application/json
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
        return web.json_response(config)
    except json.JSONDecodeError:
        raise web.HTTPInternalServerError(
            text="Existing configuration is not valid JSON"
        )
    except OSError:
        raise web.HTTPInternalServerError(text="Failed to update configuration")


@routes.put("/log/{level:[A-Z]+}")
async def handle_set_log_level(request: web.Request) -> web.Response:
    """Dynamically set the service's log level.

    Args:
        request: Request context injected by :mod:`aiohttp`.

    Returns:
        Text response indicating that the log level was properly set.

    Raises:
        web.HTTPBadRequest: Invalid log level.

    Example:
        ::

            # curl -i http://localhost:8080/log/WARNING -X PUT
            HTTP/1.1 200 OK
            Content-Type: text/plain; charset=utf-8
            Content-Length: 34
            Date: Tue, 12 May 2020 19:06:34 GMT
            Server: Python/3.8 aiohttp/3.6.2

            Log level set to WARNING from INFO

    ---
    description: Dynamically set the service's log level.
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
      "400":
        description: Invalid log level.
    """
    level = request.match_info["level"]
    prev_level = logging.getLevelName(logging.root.level)

    if level == prev_level:
        return web.Response(text=f"Log level is already {prev_level}")

    try:
        logging.root.setLevel(level)
    except ValueError as e:
        raise web.HTTPBadRequest(text=str(e))

    return web.Response(text=f"Log level set to {level} from {prev_level}")
