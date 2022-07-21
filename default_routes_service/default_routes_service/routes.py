#!/usr/bin/env python3

# Copyright (c) Meta Platforms, Inc. and affiliates.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

import json
from collections import defaultdict
from datetime import datetime
from functools import partial
from typing import Any, DefaultDict, List, Tuple

from aiohttp import web
from sqlalchemy import func, select, tuple_
from tglib.clients import APIServiceClient, MySQLClient

from .models import CnEgressRoutesHistory, DefaultRoutesHistory
from .utils.utilization import compute_routes_utilization


routes = web.RouteTableDef()


def custom_serializer(obj: Any) -> str:
    if isinstance(obj, datetime):
        return datetime.isoformat(obj)
    else:
        return str(obj)


def parse_input_params(request: web.Request) -> Tuple[str, datetime, datetime]:
    network_name = request.rel_url.query.get("network_name")
    start_dt = request.rel_url.query.get("start_dt")
    end_dt = request.rel_url.query.get("end_dt")

    # Get the network name
    if network_name is None:
        raise web.HTTPBadRequest(text="Missing required 'network_name' param")
    if network_name not in APIServiceClient.network_names():
        raise web.HTTPBadRequest(text=f"Invalid network name: {network_name}")

    # Parse start_dt, raise '400' if missing/invalid
    if start_dt is None:
        raise web.HTTPBadRequest(text="Missing required 'start_dt' param")
    try:
        start_dt_obj = datetime.fromisoformat(start_dt)
        if start_dt_obj.tzinfo:
            raise web.HTTPBadRequest(
                text="'start_dt' param must be UTC offset-naive datetime"
            )
    except ValueError:
        raise web.HTTPBadRequest(text=f"'start_dt' is invalid ISO 8601: '{start_dt}'")

    # Parse end_dt, use current datetime if not provided. Raise '400' if invalid
    if end_dt is None:
        end_dt_obj = datetime.utcnow()
    else:
        try:
            end_dt_obj = datetime.fromisoformat(end_dt)
            if end_dt_obj.tzinfo:
                raise web.HTTPBadRequest(
                    text="'end_dt' param must be UTC offset-naive datetime"
                )
        except ValueError:
            raise web.HTTPBadRequest(text="'end_dt' param is not valid ISO 8601")

    if start_dt_obj >= end_dt_obj:
        raise web.HTTPBadRequest(text="'start_dt' must be less than 'end_dt' param")

    return network_name, start_dt_obj, end_dt_obj


@routes.get("/routes/history")
async def handle_get_default_routes_history(request: web.Request) -> web.Response:
    """
    ---
    description: Analyze default routes history for any node/all nodes of the network
    tags:
    - Default Routes Service
    produces:
    - application/json
    parameters:
    - in: query
      name: network_name
      description: Name of the network.
      required: true
      type: string
    - in: query
      name: node_name
      description: Name of the node. Will fetch info for all nodes if not specified.
      required: false
      type: string
    - in: query
      name: start_dt
      description: The start UTC offset-naive datetime of time window, in ISO 8601 format.
      required: true
      type: string
    - in: query
      name: end_dt
      description: The end UTC offset-naive datetime of the query in ISO 8601 format. Defaults to current datetime if not provided.
      required: false
      type: string
    responses:
      "200":
        description: Successful operation.
      "400":
        description: Invalid or missing parameters.
    """
    # Parse and validate input params
    network_name, start_dt_obj, end_dt_obj = parse_input_params(request)

    # Get node name from request query
    node_name = request.rel_url.query.get("node_name")

    # Get topology
    topology = await APIServiceClient(timeout=1).request(network_name, "getTopology")
    node_names = [node["name"] for node in topology["nodes"]]

    # Query to fetch all route changes in the given datetime window
    in_qry = select(
        [
            DefaultRoutesHistory.node_name,
            DefaultRoutesHistory.last_updated,
            DefaultRoutesHistory.routes,
            DefaultRoutesHistory.max_hop_count,
        ]
    ).where(
        (DefaultRoutesHistory.network_name == network_name)
        & (DefaultRoutesHistory.last_updated >= start_dt_obj)
        & (DefaultRoutesHistory.last_updated <= end_dt_obj)
    )

    # Query to fetch latest routes before the given datetime window
    out_qry = select(
        [
            DefaultRoutesHistory.node_name,
            DefaultRoutesHistory.last_updated,
            DefaultRoutesHistory.routes,
            DefaultRoutesHistory.max_hop_count,
        ]
    ).where(
        (DefaultRoutesHistory.network_name == network_name)
        & (
            tuple_(
                DefaultRoutesHistory.last_updated, DefaultRoutesHistory.node_name
            ).in_(
                select(
                    [
                        func.max(DefaultRoutesHistory.last_updated),
                        func.min(DefaultRoutesHistory.node_name),
                    ]
                )
                .where(
                    (DefaultRoutesHistory.last_updated < start_dt_obj)
                    & (DefaultRoutesHistory.node_name.in_(node_names))
                )
                .group_by(DefaultRoutesHistory.node_name)
            )
        )
    )

    # If node name is provided, fetch info for that specific node
    if node_name is not None:
        in_qry = in_qry.where(DefaultRoutesHistory.node_name == node_name)
        out_qry = out_qry.where(DefaultRoutesHistory.node_name == node_name)

    # Merge both queries
    query = out_qry.union_all(in_qry)

    async with MySQLClient().lease() as conn:
        cursor = await conn.execute(query)
        results = await cursor.fetchall()

    # Iterate over the list of RowProxy objects to track changes in routes.
    routes_history: DefaultDict[str, List] = defaultdict(list)
    for row in results:
        routes_history[row.node_name].append(
            {
                "last_updated": row.last_updated,
                "routes": row.routes,
                "max_hop_count": row.max_hop_count,
            }
        )

    return web.json_response(
        {
            "history": routes_history,
            "util": compute_routes_utilization(results, start_dt_obj, end_dt_obj),
        },
        dumps=partial(json.dumps, default=custom_serializer),
    )


@routes.get("/routes/cn_routes")
async def handle_get_cn_routes(request: web.Request) -> web.Response:
    """
    ---
    description: Fetch CN default routes history for links.
    tags:
    - Default Routes Service
    produces:
    - application/json
    parameters:
    - in: query
      name: network_name
      description: Name of the network.
      required: true
      type: string
    - in: query
      name: link_name
      description: Name of the link. Will fetch info for all links if not specified.
      required: false
      type: string
    - in: query
      name: start_dt
      description: The start UTC offset-naive datetime of time window, in ISO 8601 format.
      required: true
      type: string
    - in: query
      name: end_dt
      description: The end UTC offset-naive datetime of the query in ISO 8601 format. Defaults to current datetime if not provided.
      required: false
      type: string
    responses:
      "200":
        description: Successful operation.
      "400":
        description: Invalid or missing parameters.
    """

    # Parse and validate input params
    network_name, start_dt_obj, end_dt_obj = parse_input_params(request)

    # Get link name from request query
    link_name = request.rel_url.query.get("link_name")

    # Get entries for all links between start and end time
    query = select(
        [
            CnEgressRoutesHistory.network_name,
            CnEgressRoutesHistory.link_name,
            CnEgressRoutesHistory.last_updated,
            CnEgressRoutesHistory.routes,
        ]
    ).where(
        (CnEgressRoutesHistory.network_name == network_name)
        & (CnEgressRoutesHistory.last_updated >= start_dt_obj)
        & (CnEgressRoutesHistory.last_updated <= end_dt_obj)
    )

    # If link name is provided, fetch info for that specific link
    if link_name is not None:
        query = query.where(CnEgressRoutesHistory.link_name == link_name)

    async with MySQLClient().lease() as conn:
        cursor = await conn.execute(query)
        return web.json_response(
            {"routes": [dict(row) for row in await cursor.fetchall()]},
            dumps=partial(json.dumps, default=custom_serializer),
        )
