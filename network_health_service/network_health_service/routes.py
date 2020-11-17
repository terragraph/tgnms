#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import enum
import functools
import json
from collections import defaultdict
from datetime import datetime
from typing import Any, Iterable, Dict

from aiohttp import web
from sqlalchemy import insert, select
from tglib.clients import APIServiceClient, MySQLClient

from .models import NetworkStatsHealth, NetworkHealthExecution

routes = web.RouteTableDef()


def custom_serializer(obj: Any) -> str:
    if isinstance(obj, enum.Enum):
        return obj.name
    elif isinstance(obj, datetime):
        return datetime.isoformat(obj)
    else:
        return str(obj)


@routes.get("/health/latest")
async def handle_get_network_health(request: web.Request) -> web.Response:
    """
    ---
    description: Return latest health of links and nodes of the requested network.
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

    async with MySQLClient().lease() as sa_conn:
        query = (
            select([NetworkHealthExecution.id])
            .order_by(NetworkHealthExecution.id.desc())
            .limit(1)
        )
        cursor = await sa_conn.execute(query)
        execution_row = await cursor.first()
        latest_execution_id = execution_row.id

        query = select(
            [
                NetworkStatsHealth.link_name,
                NetworkStatsHealth.node_name,
                NetworkStatsHealth.stats_health,
            ]
        ).where(
            (NetworkStatsHealth.execution_id == latest_execution_id)
            & (NetworkStatsHealth.network_name == network_name)
        )
        cursor = await sa_conn.execute(query)
        network_stats_health: Iterable = await cursor.fetchall()

    results: Dict = {
        "data": {"links": {}, "nodes": {}, "sites": {}},
        "legend": {
            "links": {
                "items": [
                    {"color": "#00dd44", "label": "Excellent", "value": 1},
                    {"color": "#ffdd00", "label": "Good", "value": 2},
                    {"color": "#dd0000", "label": "Poor", "value": 4},
                    {"color": "#999999", "label": "Unknown", "value": 5},
                ],
            },
            "sites": {"items": []},
            "nodes": {
                "items": [
                    {"color": "#00dd44", "label": "Excellent", "value": 1},
                    {"color": "#ffdd00", "label": "Good", "value": 2},
                    {"color": "#dd0000", "label": "Poor", "value": 4},
                    {"color": "#999999", "label": "Unknown", "value": 5},
                ]
            },
        },
    }
    for row in network_stats_health:
        if row.link_name is not None:
            results["data"]["links"][row.link_name] = {
                "value": row.stats_health["overall_health"],
                "metadata": row.stats_health["stats"],
            }
        if row.node_name is not None:
            results["data"]["nodes"][row.node_name] = {
                "value": row.stats_health["overall_health"],
                "metadata": row.stats_health["stats"],
            }

    return web.json_response(
        results, dumps=functools.partial(json.dumps, default=custom_serializer)
    )
