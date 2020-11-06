#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import enum
import functools
import json
from collections import defaultdict
from datetime import datetime
from typing import Any, DefaultDict

from aiohttp import web
from tglib.clients import APIServiceClient

from .utils.db import get_network_stats_health


routes = web.RouteTableDef()


def custom_serializer(obj: Any) -> str:
    if isinstance(obj, enum.Enum):
        return obj.name
    elif isinstance(obj, datetime):
        return datetime.isoformat(obj)
    else:
        return str(obj)


@routes.get("/health/network")
async def handle_get_network_health(request: web.Request) -> web.Response:
    """
    ---
    description: Return health of links and nodes of the requested network.
    tags:
    - Network Health Service
    parameters:
    - in: query
      name: network_name
      description: The name of the network.
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

    network_stats_health = await get_network_stats_health(network_name)
    results: DefaultDict = defaultdict(lambda: defaultdict(dict))
    for row in network_stats_health:
        if row.link_name is not None:
            results[network_name]["links"][row.link_name] = row.stats_health
        if row.node_name is not None:
            results[network_name]["nodes"][row.node_name] = row.stats_health

    return web.json_response(
        results, dumps=functools.partial(json.dumps, default=custom_serializer)
    )
