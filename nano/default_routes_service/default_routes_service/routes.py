#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import json
import logging
import re
from datetime import datetime
from functools import partial
from typing import Dict, List, Tuple

from aiohttp import web
from aiomysql.sa import SAConnection
from aiomysql.sa.result import RowProxy
from sqlalchemy import select
from tglib.clients import MySQLClient

from .models import DefaultRouteHistory, LinkCnRoutes
from .mysql_helpers import fetch_preceding_routes


routes = web.RouteTableDef()


def parse_input_params(
    request: web.Request, name: str = "node_name"
) -> Tuple[str, str, datetime, datetime]:
    network_name = request.rel_url.query.get("network_name")
    name = request.rel_url.query.get("name")
    start_time = request.rel_url.query.get("start_time")
    end_time = request.rel_url.query.get("end_time")

    datetime_re = re.compile("\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}Z)?")

    # get the network name
    if network_name is None:
        raise web.HTTPBadRequest(text="Missing required 'network_name' param")

    # get and validate start time
    if start_time is None:
        raise web.HTTPBadRequest(text="Missing required 'start_time' param")
    # drop ms if needed
    start_time = start_time.split(".")[0] + "Z" if "." in start_time else start_time
    if not re.match(datetime_re, start_time):
        raise web.HTTPBadRequest(text="'start_time' param is not valid ISO 8601")
    try:
        start_time_obj = datetime.strptime(start_time, "%Y-%m-%dT%H:%M:%SZ")
    except ValueError as err:
        raise web.HTTPBadRequest(text=str(err))

    # get and validate end time
    if end_time is None:
        raise web.HTTPBadRequest(text="Missing required 'end_time' param")
    # drop ms if needed
    end_time = end_time.split(".")[0] + "Z" if "." in end_time else end_time
    if not re.match(datetime_re, end_time):
        raise web.HTTPBadRequest(text="'end_time' param is not valid ISO 8601")
    try:
        end_time_obj = datetime.strptime(end_time, "%Y-%m-%dT%H:%M:%SZ")
    except ValueError as err:
        raise web.HTTPBadRequest(text=str(err))

    if start_time_obj >= end_time_obj:
        raise web.HTTPBadRequest(
            text="'start_time' has to be less than 'end_time' param"
        )

    return network_name, name, start_time_obj, end_time_obj


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
        schema:
          type: string
      - in: query
        name: node_name
        description: Name of the node. Will fetch info for all nodes if not specified.
        required: false
        schema:
          type: string
      - in: query
        name: start_time
        description: Start time of time window, in ISO 8601 format.
        required: true
        schema:
          type: string
      - in: query
        name: end_time
        description: End time of time window, in ISO 8601 format.
        required: true
        schema:
          type: string
    responses:
      "200":
        description: Successful operation. Returns analyzed default routes history.
      "400":
        description: Invalid or missing parameters.
    """
    # parse and validate input params
    network_name, node_name, start_time_obj, end_time_obj = parse_input_params(request)

    # get entries for all nodes between start and end time
    query = select(
        [
            DefaultRouteHistory.id,
            DefaultRouteHistory.node_name,
            DefaultRouteHistory.routes,
            DefaultRouteHistory.last_updated,
            DefaultRouteHistory.hop_count,
        ]
    ).where(
        (DefaultRouteHistory.network_name == network_name)
        & (DefaultRouteHistory.last_updated >= start_time_obj)
        & (DefaultRouteHistory.last_updated <= end_time_obj)
    )

    # if node name is provided, fetch info for that specific node
    if node_name is not None:
        query = query.where(DefaultRouteHistory.node_name == node_name)

    logging.debug(
        f"Query to fetch node_name, routes and last_updated from db: {str(query)}"
    )

    async with MySQLClient().lease() as conn:
        cursor = await conn.execute(query)
        results = await cursor.fetchall()

        history = _get_default_routes_history_impl(results)
        util = await _compute_routes_utilization_impl(
            conn, results, start_time_obj, end_time_obj, network_name
        )

    return web.json_response({"history": history, "util": util})


def _get_default_routes_history_impl(raw_routes_data: List[RowProxy]) -> Dict:
    """
    Iterate over the list of RowProxy objects to track changes in routes.

    input = [
            {
                "node_name": "A",
                "routes": [["X", "Y", "Z"]],
                "last_updated": "datetime_0",
            },
            {
                "node_name": "A",
                "routes": [["A", "B", "C"]],
                "last_updated": "datetime_3",
            },
        ]
    output = {
        "A": {
            "datetime_0": {"routes": [["X", "Y", "Z"]], "hop_count": 2},
            "datetime_3": {"routes": [["A", "B", "C"]], "hop_count": 2},
        },
    }
    """
    # dictionary to track routes history
    routes_history: Dict[str, Dict] = {}

    for row in raw_routes_data:
        if row["node_name"] in routes_history:
            routes_history[row["node_name"]][str(row["last_updated"])] = {
                "routes": row["routes"],
                "hop_count": row["hop_count"],
            }
        else:
            routes_history[row["node_name"]] = {
                str(row["last_updated"]): {
                    "routes": row["routes"],
                    "hop_count": row["hop_count"],
                }
            }

    return routes_history


async def _compute_routes_utilization_impl(
    conn: SAConnection,
    raw_routes_data: List[RowProxy],
    start_time: datetime,
    end_time: datetime,
    network_name: str,
) -> Dict:
    """
    Iterate over the list of RowProxy objects to calculate the percentage of
    time each route takes for each node.
    input = [
            {
                "id": 10,
                "node_name": "A",
                "routes": [["X", "Y", "Z"]],
                "last_updated": "datetime"
            },
        ]
    output = {
        "A": {
            "[['A', 'B', 'C']]": 30.00,
            "[['X', 'Y', 'Z']]": 70.00,
        },
    }
    """
    # dictionary to track routes utilization of each node
    routes_utilization: Dict[str, Dict] = {}
    # dictionary to track previous routes and last_updated info for each node
    prev_info: Dict = {}
    # total datetime difference requested
    time_window = end_time - start_time

    for row in raw_routes_data:
        id = row["id"]
        node_name = row["node_name"]
        curr_routes = row["routes"]
        curr_datetime = row["last_updated"]

        # initialize the node
        if node_name not in prev_info:
            prev_info[node_name] = {"prev_route": None, "prev_datetime": start_time}
            routes_utilization[node_name] = {}

        # get the routes between start_time and the first routes change
        if prev_info[node_name]["prev_route"] is None:
            prev_info[node_name]["prev_route"] = await fetch_preceding_routes(
                conn, id, network_name, node_name
            )

        # record the routes percentage for the previous routes
        routes_utilization[node_name][str(prev_info[node_name]["prev_route"])] = round(
            (
                (curr_datetime - prev_info[node_name]["prev_datetime"])
                / time_window
                * 100
            ),
            3,
        )
        # set the current routes as previous routes for next iteration
        prev_info[node_name]["prev_route"] = curr_routes
        # set the current datetime as previous datetime for next iteration
        prev_info[node_name]["prev_datetime"] = curr_datetime

    # record the routes percentage for the remaining routes
    for node_name, info in prev_info.items():
        routes_utilization[node_name][str(info["prev_route"])] = round(
            ((end_time - info["prev_datetime"]) / time_window * 100), 3
        )

    return routes_utilization


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
        schema:
          type: string
      - in: query
        name: link_name
        description: Name of the link. Will fetch info for all links if not specified.
        required: false
        schema:
          type: string
      - in: query
        name: start_time
        description: Start time of time window, in ISO 8601 format.
        required: true
        schema:
          type: string
      - in: query
        name: end_time
        description: End time of time window, in ISO 8601 format.
        required: true
        schema:
          type: string
    responses:
      "200":
        description: Successful operation. Returns CN default routes history for the link.
      "400":
        description: Invalid or missing parameters.
    """

    # parse and validate input params
    network_name, link_name, start_time_obj, end_time_obj = parse_input_params(
        request, "link_name"
    )

    # get entries for all links between start and end time
    query = select(
        [
            LinkCnRoutes.network_name,
            LinkCnRoutes.link_name,
            LinkCnRoutes.last_updated,
            LinkCnRoutes.cn_routes,
        ]
    ).where(
        (LinkCnRoutes.network_name == network_name)
        & (LinkCnRoutes.last_updated >= start_time_obj)
        & (LinkCnRoutes.last_updated <= end_time_obj)
    )

    # if link name is provided, fetch info for that specific link
    if link_name is not None:
        query = query.where(LinkCnRoutes.link_name == link_name)

    logging.debug(
        f"Query to fetch link_name, cn_routes and last_updated from db: {str(query)}"
    )

    async with MySQLClient().lease() as conn:
        cursor = await conn.execute(query)
        results = await cursor.fetchall()

    return web.json_response(
        [dict(row) for row in results], dumps=partial(json.dumps, default=str)
    )
