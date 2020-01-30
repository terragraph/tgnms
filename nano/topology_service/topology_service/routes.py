#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import json
from datetime import datetime
from functools import partial
from typing import Any

from aiohttp import web
from sqlalchemy import select
from tglib.clients import MySQLClient

from .models import TopologyHistory


routes = web.RouteTableDef()


def custom_serializer(obj: Any) -> str:
    if isinstance(obj, datetime):
        return datetime.isoformat(obj)
    else:
        return str(obj)


@routes.get(r"/topology/{network_name:.+}")
async def handle_get_topology(request: web.Request) -> web.Response:
    """
    ---
    description: Fetch all of a network's topologies between a given datetime range.
    tags:
    - Topology History
    produces:
    - application/json
    parameters:
    - in: path
      name: network_name
      description: The name of the network to query
      required: true
      schema:
        type: string
    - in: query
      name: start_dt
      description: The start UTC datetime of the query in ISO 8601 format
      required: true
      schema:
        type: string
    - in: query
      name: end_dt
      description: The end UTC datetime of the query in ISO 8601 format. Defaults to current datetime if not provided.
      schema:
        type: string
    responses:
      "200":
        description: Return a list of topologies belonging to the given network in the given datetime range.
      "400":
        description: Invalid or missing parameters.
    """
    network_name = request.match_info["network_name"]
    start_dt = request.rel_url.query.get("start_dt")
    end_dt = request.rel_url.query.get("end_dt")

    # Parse start_dt, raise '400' if missing/invalid
    if start_dt is None:
        raise web.HTTPBadRequest(text="'start_dt' is missing from query string")

    try:
        start_dt_obj = datetime.fromisoformat(start_dt)
    except ValueError:
        raise web.HTTPBadRequest(text=f"'start_dt' is invalid ISO 8601: '{start_dt}'")

    # Parse end_dt, use current datetime if not provided. Raise '400' if invalid
    if end_dt is None:
        end_dt_obj = datetime.utcnow()
    else:
        try:
            end_dt_obj = datetime.fromisoformat(end_dt)
        except ValueError:
            raise web.HTTPBadRequest(text=f"'end_dt' is invalid ISO 8601: '{end_dt}'")

    query = select([TopologyHistory.topology, TopologyHistory.last_updated]).where(
        (TopologyHistory.network_name == network_name)
        & (TopologyHistory.last_updated >= start_dt_obj)
        & (TopologyHistory.last_updated <= end_dt_obj)
    )

    async with MySQLClient().lease() as sa_conn:
        cursor = await sa_conn.execute(query)
        return web.json_response(
            [dict(row) for row in await cursor.fetchall()],
            dumps=partial(json.dumps, default=custom_serializer),
        )
