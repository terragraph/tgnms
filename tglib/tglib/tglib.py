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

from tglib.clients.api_service_client import APIServiceClient
from tglib.clients.kafka_consumer import KafkaConsumer
from tglib.clients.kafka_producer import KafkaProducer
from tglib.clients.mongodb_client import MongoDBClient
from tglib.clients.mysql_client import MySQLClient
from tglib.clients.prometheus_client import PrometheusClient
from tglib.exceptions import ConfigError, DuplicateRouteError, TGLibError
from tglib.routes import routes
from tglib.utils.dict import deep_update


class Client(enum.Enum):
    """Enumerate client options."""

    API_SERVICE_CLIENT = 0
    KAFKA_CONSUMER = 1
    KAFKA_PRODUCER = 2
    MONGODB_CLIENT = 3
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
    app["config"] = config

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
        app["clients"].append(APIServiceClient)
    if Client.KAFKA_CONSUMER in clients:
        app["clients"].append(KafkaConsumer)
    if Client.KAFKA_PRODUCER in clients:
        app["clients"].append(KafkaProducer)
    if Client.MONGODB_CLIENT in clients:
        app["clients"].append(MongoDBClient)
    if Client.MYSQL_CLIENT in clients:
        app["clients"].append(MySQLClient)
    if Client.PROMETHEUS_CLIENT in clients:
        app["clients"].append(PrometheusClient)

    app.on_startup.append(start_background_tasks)
    app.on_cleanup.append(stop_background_tasks)

    try:
        from aiohttp_swagger import setup_swagger

        setup_swagger(app)
    except ImportError:
        pass

    web.run_app(app)


async def start_background_tasks(app: web.Application) -> None:
    """Start the clients and create the main_wrapper and shutdown_listener tasks."""
    start_tasks = [client.start(app["config"]) for client in app["clients"]]
    stop_tasks = []

    failure = None
    for client, start_result in zip(
        app["clients"], await asyncio.gather(*start_tasks, return_exceptions=True)
    ):
        if isinstance(start_result, TGLibError):
            failure = start_result
            stop_tasks.append(client.stop())

    # Shutdown the clients if any of them fail to start
    if failure is not None:
        await asyncio.gather(*stop_tasks)
        raise failure

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
    except:
        app["shutdown_event"].set()
        raise


async def shutdown_listener(app: web.Application) -> None:
    """Wait for the shutdown_event notification to kill the process."""
    await app["shutdown_event"].wait()
    logging.info("Shutting down!")

    # Sleep for 1 second before terminating
    await asyncio.sleep(1)
    os.kill(os.getpid(), signal.SIGTERM)
