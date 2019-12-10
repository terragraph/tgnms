#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import logging
import re
from collections import defaultdict
from datetime import datetime
from typing import Dict, List, Tuple

from aiohttp import web
from aiomysql.sa.result import RowProxy
from sqlalchemy.sql import func, select
from tglib.clients import MySQLClient

from .models import DefaultRouteHistory


routes = web.RouteTableDef()


def parse_input_params(request: web.Request) -> Tuple[str, str, datetime, datetime]:
    topology_name = request.rel_url.query.get("topology_name")
    node_name = request.rel_url.query.get("node_name")
    start_time = request.rel_url.query.get("start_time")
    end_time = request.rel_url.query.get("end_time")

    datetime_re = re.compile("\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}Z})?")

    # get the network name
    if topology_name is None:
        raise web.HTTPBadRequest(text="Missing required 'topology_name' param")

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

    return topology_name, node_name, start_time_obj, end_time_obj


@routes.get("/routes/history")
async def handle_get_default_routes_history(request: web.Request) -> web.Response:
    """
    ---
    description: Analyze default routes history for any node/all nodes of the network
    tags:
      - Routes
    produces:
      - application/json
    parameters:
      - in: query
        name: topology_name
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
    topology_name, node_name, start_time_obj, end_time_obj = parse_input_params(request)

    # get entries for all nodes between start and end time
    query = select(
        [
            DefaultRouteHistory.node_name,
            DefaultRouteHistory.routes,
            DefaultRouteHistory.last_updated,
        ]
    ).where(
        (DefaultRouteHistory.topology_name == topology_name)
        & (DefaultRouteHistory.last_updated >= start_time_obj)
        & (DefaultRouteHistory.last_updated <= end_time_obj)
    )

    # if node name is provided, fetch info for that specific node
    if node_name is not None:
        query = query.where(DefaultRouteHistory.node_name == node_name)

    logging.debug(
        f"Query to fetch node_name, routes and last_updated from db: {str(query)}"
    )

    client = MySQLClient()
    async with client.lease() as conn:
        cursor = await conn.execute(query)
        results = await cursor.fetchall()

    return web.json_response(_get_default_routes_history_impl(results))


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
            "datetime_0": [["X", "Y", "Z"]],
            "datetime_3": [["A", "B", "C"]],
        },
    }
    """
    # dictionary to track routes history
    routes_history: Dict[str, Dict] = {}

    for row in raw_routes_data:
        if row["node_name"] in routes_history:
            routes_history[row["node_name"]][str(row["last_updated"])] = row["routes"]
        else:
            routes_history[row["node_name"]] = {str(row["last_updated"]): row["routes"]}

    return routes_history


@routes.get("/routes/util")
async def handle_compute_routes_utilization(request: web.Request) -> web.Response:
    """
    ---
    description: Calculate percentage of time each route took for a node/all nodes in the specified time window.
    tags:
      - Routes
    produces:
      - application/json
    parameters:
      - in: query
        name: topology_name
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
        description: Successful operation. Returns routes time utilization.
      "400":
        description: Invalid or missing parameters.
    """
    # parse and validate input params
    topology_name, node_name, start_time_obj, end_time_obj = parse_input_params(request)

    # get entries for all nodes between start and end time
    query = select([DefaultRouteHistory.node_name, DefaultRouteHistory.routes]).where(
        (DefaultRouteHistory.topology_name == topology_name)
        & (DefaultRouteHistory.last_updated >= start_time_obj)
        & (DefaultRouteHistory.last_updated <= end_time_obj)
    )

    # if node name is provided, fetch info for that specific node
    if node_name is not None:
        query = query.where(DefaultRouteHistory.node_name == node_name)

    logging.debug(f"Query to fetch node_name and routes from db: {str(query)}")

    client = MySQLClient()
    async with client.lease() as conn:
        cursor = await conn.execute(query)
        results = await cursor.fetchall()

    return web.json_response(_compute_routes_utilization_impl(results))


def _compute_routes_utilization_impl(raw_routes_data: List[RowProxy]) -> Dict:
    """
    Iterate over the list of RowProxy objects to calculate the percentage of
    time each route takes for each node.
    input = [
            {
                "node_name": "A",
                "routes": [["X", "Y", "Z"]],
            },
        ]
    output = {
        "A": {
            "[['X', 'Y', 'Z']]": 100.00,
        },
    }
    """
    # dictionary to track count of routes of each node
    routes_count_per_node: Dict[str, Dict] = {}

    for row in raw_routes_data:
        node_name = row["node_name"]
        current_routes = row["routes"]

        # initialize the node in routes_count_per_node, if not already present
        if node_name not in routes_count_per_node:
            routes_count_per_node[node_name] = {
                "total_routes_count": 0,
                "routes_count": defaultdict(int),
            }

        # track the count of each route and total number of routes for the node
        routes_count_per_node[node_name]["routes_count"][str(current_routes)] += 1
        routes_count_per_node[node_name]["total_routes_count"] += 1

    # calculate routes utilization for each node
    routes_utilization = {}

    for node_name, routes_count_info in routes_count_per_node.items():
        # total number of routes for the node
        total_routes_count = routes_count_info["total_routes_count"]

        # calculate percentage each route takes for the node
        routes_utilization[node_name] = {
            routes: round((routes_count * 100 / total_routes_count), 2)
            for routes, routes_count in routes_count_info["routes_count"].items()
        }

    return routes_utilization


@routes.get("/routes/pop_util")
async def handle_compute_pop_utilization(request: web.Request) -> web.Response:
    """
    ---
    description: Calculate percentage of time a node/all nodes were connected to POP node in the specified time window.
    tags:
      - Routes
    produces:
      - application/json
    parameters:
      - in: query
        name: topology_name
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
        description: Successful operation. Returns POP node time percentage info.
      "400":
        description: Invalid or missing parameters.
    """
    # parse and validate input params
    topology_name, node_name, start_time_obj, end_time_obj = parse_input_params(request)

    # get entries for all nodes between start and end time
    query = select([DefaultRouteHistory.node_name, DefaultRouteHistory.routes]).where(
        (DefaultRouteHistory.topology_name == topology_name)
        & (DefaultRouteHistory.last_updated >= start_time_obj)
        & (DefaultRouteHistory.last_updated <= end_time_obj)
    )

    # if node name is provided, fetch info for that specific node
    if node_name is not None:
        query = query.where(DefaultRouteHistory.node_name == node_name)

    logging.debug(f"Query to fetch node_name and routes from db: {str(query)}")

    client = MySQLClient()
    async with client.lease() as conn:
        cursor = await conn.execute(query)
        results = await cursor.fetchall()

    # analyze and return PoP utilization
    return web.json_response(_compute_pop_utilization_impl(results))


def _compute_pop_utilization_impl(raw_routes_data: List[RowProxy]) -> Dict:
    """
    Iterate over the list of RowProxy objects to calculate percentage of time
    each node was connected to corresponding PoP nodes.

    input = [
            {
                "node_name": "A",
                "routes": [["X", "Y", "Z"]],
            },
        ]
    output = {
        "A": {
            "Z": 100.00,
        },
    }
    """
    # dictionary to track count of PoP nodes of each node
    pop_count_per_node: Dict[str, Dict] = {}

    for row in raw_routes_data:
        node_name = row["node_name"]
        current_routes = row["routes"]

        # initialize the node in pop_count_per_node, if not already present
        if node_name not in pop_count_per_node:
            pop_count_per_node[node_name] = {
                "total_routes": 0,
                "pop_count": defaultdict(int),
            }

        # set of all PoP nodes in the current routes
        pop_node_set = {route[-1] for route in current_routes}

        # track the count of each PoP node
        for pop_node in pop_node_set:
            pop_count_per_node[node_name]["pop_count"][pop_node] += 1

        # track total number of routes for the node
        pop_count_per_node[node_name]["total_routes"] += 1

    # calculate PoP utilization for each node
    pop_utilization = {}

    for node_name, pop_count_info in pop_count_per_node.items():
        # total number of routes for the node
        total_routes = pop_count_info["total_routes"]

        # calculate percentage each PoP node takes for the node
        pop_utilization[node_name] = {
            pop_node: round((pop_count * 100 / total_routes), 2)
            for pop_node, pop_count in pop_count_info["pop_count"].items()
        }

    return pop_utilization


@routes.get("/routes/ecmp_toggles")
async def handle_count_ecmp_toggles(request: web.Request) -> web.Response:
    """
    ---
    description: Calculate the number of times there was a switch between ECMP and non-ECMP routes in the specified time window.
    tags:
      - Routes
    produces:
      - application/json
    parameters:
      - in: query
        name: topology_name
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
        description: Successful operation. Returns total number of ecmp toggles.
      "400":
        description: Invalid or missing parameters.
    """
    # parse and validate input params
    topology_name, node_name, start_time_obj, end_time_obj = parse_input_params(request)

    # get entries for all nodes between start and end time
    query = select([DefaultRouteHistory.node_name, DefaultRouteHistory.is_ecmp]).where(
        (DefaultRouteHistory.topology_name == topology_name)
        & (DefaultRouteHistory.last_updated >= start_time_obj)
        & (DefaultRouteHistory.last_updated <= end_time_obj)
    )

    # if node name is provided, fetch info for that specific node
    if node_name is not None:
        query = query.where(DefaultRouteHistory.node_name == node_name)

    logging.debug(f"Query to fetch node_name and is_ecmp from db: {str(query)}")

    client = MySQLClient()
    async with client.lease() as conn:
        cursor = await conn.execute(query)
        results = await cursor.fetchall()

    # analyze and return ecmp toggle count
    return web.json_response(_count_ecmp_toggles_impl(results))


def _count_ecmp_toggles_impl(raw_routes_data: List[RowProxy]) -> Dict:
    """
    Iterate over the list of RowProxy objects to calculate the number of times
    there was a switch between ECMP and non-ECMP routes for each node.

    input = [
            {
                "node_name": "A",
                "is_ecmp": True,
            },
            {
                "node_name": "A",
                "is_ecmp": False,
            },
        ]
    output = {
        "A": 1
    }
    """
    # dictionary to track ecmp toggle count info of each node
    ecmp_toggles: Dict[str, Dict] = {}

    for row in raw_routes_data:
        node_name = row["node_name"]
        current_is_ecmp = row["is_ecmp"]

        # initialize the node in ecmp_toggles, if not already present
        if node_name not in ecmp_toggles:
            ecmp_toggles[node_name] = {"value": current_is_ecmp, "count": 0}

        # increment toggle count if `is_ecmp` value changes
        if current_is_ecmp != ecmp_toggles[node_name]["value"]:
            ecmp_toggles[node_name]["count"] += 1
            ecmp_toggles[node_name]["value"] = current_is_ecmp

    # drop the current value info from ecmp_toggles
    ecmp_toggles = {
        node_name: data["count"] for node_name, data in ecmp_toggles.items()
    }

    return ecmp_toggles


@routes.get("/routes/hop_count")
async def handle_default_routes_hop_count(request: web.Request) -> web.Response:
    """
    ---
    description: Calculate maximum and muminum number of hops from node to POP in the time window.
    tags:
      - Routes
    produces:
      - application/json
    parameters:
      - in: query
        name: topology_name
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
        description: Successful operation. Returns maximum and muminum number of hops.
      "400":
        description: Invalid or missing parameters.
    """
    # parse and validate input params
    topology_name, node_name, start_time_obj, end_time_obj = parse_input_params(request)

    # get entries for all nodes between start and end time
    query = select(
        [
            DefaultRouteHistory.node_name,
            func.max(DefaultRouteHistory.hop_count).label("max"),
            func.min(DefaultRouteHistory.hop_count).label("min"),
        ]
    ).where(
        (DefaultRouteHistory.topology_name == topology_name)
        & (DefaultRouteHistory.last_updated >= start_time_obj)
        & (DefaultRouteHistory.last_updated <= end_time_obj)
    )

    # fetch info for a specific node, if provided
    if node_name is None:
        query = query.group_by(DefaultRouteHistory.node_name)
    else:
        query = query.where(DefaultRouteHistory.node_name == node_name)

    logging.debug(f"Query to fetch node_name and hop_count from db: {str(query)}")

    client = MySQLClient()
    async with client.lease() as conn:
        cursor = await conn.execute(query)
        results = await cursor.fetchall()

    # format and return hop count info
    return web.json_response(
        {row["node_name"]: {"max": row["max"], "min": row["min"]} for row in results}
    )
