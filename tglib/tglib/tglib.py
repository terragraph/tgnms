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

from .clients.api_service_client import APIServiceClient
from .clients.event_client import EventClient
from .clients.kafka_client import KafkaConsumer, KafkaProducer
from .clients.mysql_client import MySQLClient
from .clients.prometheus_client import PrometheusClient
from .exceptions import ClientError, ConfigError, DuplicateRouteError
from .routes import routes
from .utils.dict import deep_update


lock = asyncio.Lock()


class Client(enum.Enum):
    """Enumerate client options."""

    API_SERVICE_CLIENT = 0
    EVENT_CLIENT = 1
    KAFKA_CONSUMER = 2
    KAFKA_PRODUCER = 3
    MYSQL_CLIENT = 4
    PROMETHEUS_CLIENT = 5


def init(
    main: Callable,
    clients: Set[Client],
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
    except OSError as e:
        raise ConfigError("Failed to load configuration files") from e

    # Create web application object
    app = web.Application()
    app["main"] = main

    # Initialize routes for the HTTP server
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

    # Create the shutdown event
    app["shutdown_event"] = asyncio.Event()

    # Initialize the clients
    app["clients"] = []
    if Client.API_SERVICE_CLIENT in clients:
        app["clients"].append(APIServiceClient(config))
    if Client.EVENT_CLIENT in clients:
        app["clients"].append(EventClient(config))
    if Client.KAFKA_CONSUMER in clients:
        app["clients"].append(KafkaConsumer(config))
    if Client.KAFKA_PRODUCER in clients:
        app["clients"].append(KafkaProducer(config))
    if Client.MYSQL_CLIENT in clients:
        app["clients"].append(MySQLClient(config))
    if Client.PROMETHEUS_CLIENT in clients:
        app["clients"].append(PrometheusClient(config))

    app.on_startup.append(start_background_tasks)
    app.on_cleanup.append(stop_background_tasks)
    web.run_app(app)


async def start_background_tasks(app: web.Application) -> None:
    """Start the clients and create the main_wrapper and shutdown_listener tasks."""

    try:
        tasks = [client.start() for client in app["clients"]]
        await asyncio.gather(*tasks)
    except ClientError:
        # Shutdown the clients if any of them fail to start
        tasks = [client.stop() for client in app["clients"]]
        await asyncio.gather(*tasks)
        raise

    app["main_wrapper_task"] = asyncio.create_task(main_wrapper(app))
    app["shutdown_listener_task"] = asyncio.create_task(shutdown_listener(app))


async def stop_background_tasks(app: web.Application) -> None:
    """Cancel the shutdown_listener and main_wrapper tasks and stop the clients."""
    try:
        app["shutdown_listener_task"].cancel()
        await app["shutdown_listener_task"]
    except asyncio.CancelledError as e:
        pass

    if not app["main_wrapper_task"].done():
        try:
            app["main_wrapper_task"].cancel()
            await app["main_wrapper_task"]
        except asyncio.CancelledError as e:
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
    except:
        app["shutdown_event"].set()
        raise


async def shutdown_listener(app: web.Application) -> None:
    """Wait for the shutdown_event notification to kill the process."""
    await app["shutdown_event"].wait()

    async with lock:
        logging.info("Shutting down!")

        # Sleep for 1 second before terminating
        await asyncio.sleep(1)
        os.kill(os.getpid(), signal.SIGTERM)
