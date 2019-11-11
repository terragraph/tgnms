#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

from aiohttp import web
from pymongo import DESCENDING
from tglib.clients.mongodb_client import MongoDBClient


routes = web.RouteTableDef()


@routes.post("/topology_history")
async def get_topology_history(request: web.Request) -> web.Response:
    """
    ---
    description: Fetch a list of last "count" number of topologies from MongoDB.
    tags:
    - History
    produces:
    - application/json
    parameters:
    - in: body
      name: body
      description: Body of fetch topology history api endpoint.
      required: true
      schema:
        type: object
        properties:
          topology_name:
            type: string
            description: Name of the network.
          count:
            type: integer
            description: Number of topology entries to fetch.
        required:
        - topology_name
        - count
    responses:
      "200":
        description: Successful operation. Returns list of last 'count' number of topologies from MongoDB.
      "400":
        description: Invalid or missing parameters.
    """
    body = await request.json()

    # Get the number of topology entries to be fetched
    count = body.get("count")
    if count is None:
        raise web.HTTPBadRequest(text="Missing required 'count' param")
    if not isinstance(count, int) or count < 1:
        raise web.HTTPBadRequest(
            text="Invalid value for 'count': Must be integer greater than 1"
        )

    # Get the network name
    topology_name = body.get("topology_name")
    if topology_name is None:
        raise web.HTTPBadRequest(text="Missing required 'topology_name' param")

    # Access the db
    db = MongoDBClient().db
    collection = db[topology_name]

    result = []
    # Query the last 'count' number of topologies from newest to oldest
    async for topo in collection.find().sort("_id", DESCENDING).limit(count):
        del topo["_id"]
        result.append(topo)

    return web.json_response(result)
