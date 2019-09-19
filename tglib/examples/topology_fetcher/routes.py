#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

"""
A new route is added to list of base routes to return JSON topologies belonging
to a given controller name and newer than a given datetime.
"""

import datetime
import re

from aiohttp import web
from sqlalchemy.sql import select
from tglib.clients.mysql_client import MySQLClient

from models import Topology


routes = web.RouteTableDef()


@routes.get("/topologies/after")
async def handle_get_topologies_after(request: web.Request) -> web.Response:
    name = request.rel_url.query["name"]
    datetime_str = request.rel_url.query["datetime"]

    datetime_re = re.compile("\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}Z})?")
    if not re.match(datetime_re, datetime_str):
        raise web.HTTPBadRequest(f"'datetime' param is not valid ISO 8601")

    datetime_obj = datetime.datetime.strptime(datetime_str, "%Y-%m-%dT%H:%M:%SZ")
    query = select([Topology.topo]).where(
        (Topology.name == name) & (Topology.datetime > datetime_obj)
    )

    client = MySQLClient()
    async with client.lease() as conn:
        cursor = await conn.execute(query)
        results = await cursor.fetchall()

    return web.json_response(results)
