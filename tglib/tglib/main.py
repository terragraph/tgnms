#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import asyncio
import enum
import json
import logging
import os
import signal
from typing import Callable, Optional, Set, cast

from aiohttp import web

from .clients import (
    APIServiceClient,
    KafkaConsumer,
    KafkaProducer,
    MySQLClient,
    PrometheusClient,
)
from .exceptions import ConfigError, DuplicateRouteError, TGLibError
from .routes import routes
from .utils.dict import deep_update


class ClientType(enum.Enum):
    """Enumerate client options."""

    API_SERVICE_CLIENT = 1
    KAFKA_CONSUMER = 2
    KAFKA_PRODUCER = 3
    MYSQL_CLIENT = 4
    PROMETHEUS_CLIENT = 5


def init(
    main: Callable,
    clients: Set[ClientType],
    extra_routes: Optional[web.RouteTableDef] = None,
) -> None:
    """Start the webserver and queue startup/shutdown jobs."""
    logging.basicConfig(
        format="%(levelname)s %(asctime)s %(filename)s:%(lineno)d] %(message)s",
        level=logging.INFO,
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    try:
        with open("./config.json") as f1, open("./service_config.json") as f2:
            config = json.load(f1)
            service_config = json.load(f2)

            if "overrides" in service_config:
                deep_update(config, service_config["overrides"])
    except json.JSONDecodeError as e:
        raise ConfigError("Configuration file is not valid JSON") from e
    except OSError as e:
        raise ConfigError("Failed to load configuration file") from e

    # Create web application object and shutdown event
    app = web.Application()
    app["main"] = main
    app["config"] = config
    app["shutdown_event"] = asyncio.Event()

    # Initialize routes for the HTTP server
    add_all_routes(app, routes, extra_routes)

    # Initialize the clients
    app["clients"] = []
    if ClientType.API_SERVICE_CLIENT in clients:
        app["clients"].append(APIServiceClient)
    if ClientType.KAFKA_CONSUMER in clients:
        app["clients"].append(KafkaConsumer)
    if ClientType.KAFKA_PRODUCER in clients:
        app["clients"].append(KafkaProducer)
    if ClientType.MYSQL_CLIENT in clients:
        app["clients"].append(MySQLClient)
    if ClientType.PROMETHEUS_CLIENT in clients:
        app["clients"].append(PrometheusClient)

    app.on_startup.append(start_background_tasks)
    app.on_cleanup.append(stop_background_tasks)

    try:
        from aiohttp_swagger import setup_swagger

        setup_swagger(app)
    except ImportError:
        pass

    web.run_app(app)


def add_all_routes(
    app: web.Application,
    routes: web.RouteTableDef,
    extra_routes: Optional[web.RouteTableDef],
) -> None:
    """Add the tglib base routes and service provided routes to the app."""
    app.add_routes(routes)
    if extra_routes is not None:
        routes_set = set()
        for route in routes:
            if isinstance(route, web.RouteDef):
                route = cast(web.RouteDef, route)
                routes_set.add((route.method, route.path))

        for route in extra_routes:
            if isinstance(route, web.RouteDef):
                route = cast(web.RouteDef, route)
                if (route.method, route.path) in routes_set:
                    raise DuplicateRouteError(route.method, route.path)

        app.add_routes(extra_routes)


async def start_background_tasks(app: web.Application) -> None:
    """Start the clients and create the main_wrapper and shutdown_listener tasks."""
    start_tasks = [client.start(app["config"]) for client in app["clients"]]

    good, bad = [], []
    for client, result in zip(
        app["clients"], await asyncio.gather(*start_tasks, return_exceptions=True)
    ):
        if isinstance(result, TGLibError):
            bad.append(result)
        else:
            good.append(client)

    if bad:
        # Shutdown the successful clients if any have failed to start
        stop_tasks = [client.stop() for client in good]
        await asyncio.gather(*stop_tasks)
        raise bad[0]

    app["main_wrapper_task"] = asyncio.create_task(main_wrapper(app))
    app["shutdown_listener_task"] = asyncio.create_task(shutdown_listener(app))


async def stop_background_tasks(app: web.Application) -> None:
    """Cancel the shutdown_listener and main_wrapper tasks and stop the clients."""
    try:
        app["shutdown_listener_task"].cancel()
        await app["shutdown_listener_task"]
    except asyncio.CancelledError:
        pass

    if not app["main_wrapper_task"].done():
        try:
            app["main_wrapper_task"].cancel()
            await app["main_wrapper_task"]
        except asyncio.CancelledError:
            pass

    tasks = [client.stop() for client in app["clients"]]
    await asyncio.gather(*tasks)

    # Raise the exception caught in the main_wrapper if the task wasn't cancelled
    if not app["main_wrapper_task"].cancelled():
        await app["main_wrapper_task"]


async def main_wrapper(app: web.Application) -> None:
    """Run the supplied 'main' and set the shutdown event if it fails."""
    try:
        await app["main"]()
    except:  # noqa: E722
        app["shutdown_event"].set()
        raise


async def shutdown_listener(app: web.Application) -> None:
    """Wait for the shutdown_event notification to kill the process."""
    await app["shutdown_event"].wait()
    logging.info("Shutting down!")

    # Sleep for 1 second before terminating
    await asyncio.sleep(1)
    os.kill(os.getpid(), signal.SIGTERM)
