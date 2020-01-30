#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

"""
A new route is added to list of base routes to return JSON topologies belonging
to a given controller name and newer than a given datetime.
"""

import json
from datetime import datetime
from functools import partial
from typing import Any

from aiohttp import web
from sqlalchemy import select
from tglib.clients import MySQLClient

from .models import Topology


routes = web.RouteTableDef()


def custom_serializer(obj: Any) -> str:
    if isinstance(obj, datetime):
        return datetime.isoformat(obj)
    else:
        return str(obj)


@routes.get("/topology")
async def handle_get_topology(request: web.Request) -> web.Response:
    """
    ---
    description: Return topologies for all networks since a given datetime.
    tags:
    - Topology
    produces:
    - application/json
    parameters:
    - in: query
      name: start_dt
      description: The start UTC datetime of the query in ISO 8601 format
      required: true
      schema:
        type: string
    responses:
      "200":
        description: Successful operation.
      "400":
        description: Invalid or missing parameters.
    """
    start_dt = request.rel_url.query.get("start_dt")

    # Parse start_dt, raise '400' if missing/invalid
    if start_dt is None:
        raise web.HTTPBadRequest(text="'start_dt' is missing from query string")

    try:
        start_dt_obj = datetime.fromisoformat(start_dt)
    except ValueError:
        raise web.HTTPBadRequest(text=f"'start_dt' is invalid ISO 8601: '{start_dt}'")

    query = select([Topology.topo]).where(Topology.last_updated > start_dt_obj)
    async with MySQLClient().lease() as conn:
        cursor = await conn.execute(query)
        return web.json_response(
            [dict(row) for row in await cursor.fetchall()],
            dumps=partial(json.dumps, default=custom_serializer),
        )
