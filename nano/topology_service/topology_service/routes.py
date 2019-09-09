#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

from aiohttp import web
from pymongo import DESCENDING
from tglib.clients.mongodb_client import MongoDBClient


topo_routes = web.RouteTableDef()


@topo_routes.post("/topology_history")
async def get_topology_history(request: web.Request) -> web.json_response:
    """
    Return a list of last 'count' number of topologies from MongoDB.
    Expected body: {'count': <int value>}
    """
    body = await request.json()

    try:
        count = int(body.get("count"))
    except (ValueError, TypeError) as err:
        raise web.HTTPBadRequest(text=f"Unable to parse 'count' param: {err}")

    if count < 1:
        raise web.HTTPBadRequest(
            text="Number of topology to be fetched has to be positive natural number, "
            "greater than 1."
        )

    mongodb_client: MongoDBClient = MongoDBClient.get_instance()

    # Access the db
    db = mongodb_client.get_db()
    collection = db.topology

    result = []
    # Query the last 'count' number of topologies from newest to oldest
    async for topo in collection.find().sort("_id", DESCENDING).limit(count):
        del topo["_id"]
        result.append(topo)

    return web.json_response(result)
