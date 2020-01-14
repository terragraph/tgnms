#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import datetime
import json
import re
from functools import partial

from aiohttp import web
from sqlalchemy import select
from tglib.clients import MySQLClient

from .models import TopologyHistory


routes = web.RouteTableDef()


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
      name: start_time
      description: The start datetime of the query in ISO 8601 format
      required: true
      schema:
        type: string
    - in: query
      name: end_time
      description: The end datetime of the query in ISO 8601 format. Defaults to current datetime.
      schema:
        type: string
    responses:
      "200":
        description: Return a list of topologies belonging to the given network in the given datetime range.
      "400":
        description: Invalid or missing parameters.
    """
    network_name = request.match_info["network_name"]
    start_time = request.rel_url.query.get("start_time")
    end_time = request.rel_url.query.get("end_time")

    datetime_re = re.compile("\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}Z)?")

    # Parse start_time, raise '400' if not provided/valid
    if start_time and re.fullmatch(datetime_re, start_time):
        start_time_obj = datetime.datetime.strptime(start_time, "%Y-%m-%dT%H:%M:%SZ")
    else:
        raise web.HTTPBadRequest(text="'start_time' is missing/not valid ISO 8601")

    # Parse end_time, use current datetime if not provided, raise '400' if invalid
    if not end_time:
        end_time_obj = datetime.datetime.now()
    elif re.fullmatch(datetime_re, end_time):
        end_time_obj = datetime.datetime.strptime(end_time, "%Y-%m-%dT%H:%M:%SZ")
    else:
        raise web.HTTPBadRequest(text="'end_time' is not valid ISO 8601")

    query = select([TopologyHistory.topology, TopologyHistory.last_updated]).where(
        (TopologyHistory.network_name == network_name)
        & (TopologyHistory.last_updated >= start_time_obj)
        & (TopologyHistory.last_updated <= end_time_obj)
    )

    async with MySQLClient().lease() as sa_conn:
        cursor = await sa_conn.execute(query)
        results = await cursor.fetchall()
        return web.json_response(
            [dict(row) for row in results], dumps=partial(json.dumps, default=str)
        )
