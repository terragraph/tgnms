#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import asyncio
import enum
import json
import logging
import os
import signal
from typing import Callable, Optional, Set, Type, cast

import uvloop
from aiohttp import web

from .clients.base_client import BaseClient
from .exceptions import ConfigError, DuplicateRouteError, AioMsaError
from .routes import routes
from .utils.dict import deep_update


@web.middleware
async def error_middleware(request: web.Request, handler: Callable) -> web.Response:
    try:
        return cast(web.Response, await handler(request))
    except web.HTTPError as e:
        return web.json_response(
            {"status": "error", "message": e.text}, status=e.status
        )
    except Exception:
        logging.exception("Error handling request")
        return web.json_response(
            {"status": "error", "message": "Server got itself in trouble"}, status=500
        )


def init(
    main: Callable,
    clients: Set[Type[BaseClient]],
    extra_routes: Optional[web.RouteTableDef] = None,
) -> None:
    """Start the webserver and the entrypoint logic passed in as ``main``.

    Args:
        main: A ``lambda`` function wrapper to the entrypoint for the service's logic.
        clients: The set of clients needed to run the service logic.
        extra_routes: An optional list of additional endpoints to add to the HTTP server.

    Raises:
        ConfigError: The configuration files are invalid or missing on the system.
        DuplicateRouteError: An extra route conflicts in name and method with the default routes.
    """
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

    # Use uvloop to make asyncio fast
    asyncio.set_event_loop_policy(uvloop.EventLoopPolicy())

    # Create web application object and shutdown event
    app = web.Application(middlewares=[error_middleware])
    app["main"] = main
    app["config"] = config
    app["clients"] = clients
    app["shutdown_event"] = asyncio.Event()

    # Initialize routes for the HTTP server
    _add_all_routes(app, routes, extra_routes)

    app.on_startup.append(_start_background_tasks)
    app.on_cleanup.append(_stop_background_tasks)

    try:
        from aiohttp_swagger import setup_swagger

        setup_swagger(app)
    except ImportError:
        pass

    web.run_app(app)


def _add_all_routes(
    app: web.Application,
    routes: web.RouteTableDef,
    extra_routes: Optional[web.RouteTableDef],
) -> None:
    """Add the aiomsa base routes and service provided routes to the app."""
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


async def _start_background_tasks(app: web.Application) -> None:
    """Start the clients and create the main_wrapper and shutdown_listener tasks."""
    start_tasks = [client.start(app["config"]) for client in app["clients"]]

    good, bad = [], []
    for client, result in zip(
        app["clients"], await asyncio.gather(*start_tasks, return_exceptions=True)
    ):
        if isinstance(result, AioMsaError):
            bad.append(result)
        else:
            good.append(client)

    if bad:
        # Shutdown the successful clients if any have failed to start
        stop_tasks = [client.stop() for client in good]
        await asyncio.gather(*stop_tasks)
        raise bad[0]

    app["main_wrapper_task"] = asyncio.create_task(_main_wrapper(app))
    app["shutdown_listener_task"] = asyncio.create_task(_shutdown_listener(app))


async def _stop_background_tasks(app: web.Application) -> None:
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


async def _main_wrapper(app: web.Application) -> None:
    """Run the supplied 'main' and set the shutdown event if it fails."""
    try:
        await app["main"]()
    except:  # noqa: E722
        app["shutdown_event"].set()
        raise


async def _shutdown_listener(app: web.Application) -> None:
    """Wait for the shutdown_event notification to kill the process."""
    await app["shutdown_event"].wait()
    logging.info("Shutting down!")

    # Sleep for 1 second before terminating
    await asyncio.sleep(1)
    os.kill(os.getpid(), signal.SIGTERM)
