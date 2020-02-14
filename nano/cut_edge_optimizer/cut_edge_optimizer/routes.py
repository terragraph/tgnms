#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import logging
from typing import Dict

from aiohttp import web
from tglib.clients import APIServiceClient

from .config_operations import get_all_cut_edge_configs, modify_all_cut_edge_configs


routes = web.RouteTableDef()


@routes.post("/start")
async def start(request: web.Request) -> web.Response:
    """
    ---
    description: Get all cut edge configs of a network with the latest topology and modify the cut edge configurations if specified.
    tags:
    - Cut Edge Configurations
    produces:
    - application/json
    parameters:
    - in: body
      name: body
      description: Parameters for configuring cut edges in the network.
      required: true
      schema:
        type: object
        properties:
          network_name:
            type: string
            description: Name of the network.
          link_flap_backoff_ms:
            type: string
            description: Set the max value for link flap backoff.
          link_impairment_detection:
            type: boolean
            description: Enable/Disable link impairment detection.
          config_change_interval_s:
            type: integer
            description: Configuration change interval.
          dry_run:
            type: boolean
            description: Default True. Cut edge configurations will be modified if set to False.
        required:
        - network_name
        - link_flap_backoff_ms
        - link_impairment_detection
    responses:
      "200":
        description: Successful operation. Returns list of all cut edge configs of a network.
      "400":
        description: Invalid or missing parameters.
    """
    body = await request.json()
    network_name = body.get("network_name")
    if network_name is None:
        raise web.HTTPBadRequest(text="Missing required 'network_name' param")

    link_flap_backoff_ms = body.get("link_flap_backoff_ms")
    if link_flap_backoff_ms is None:
        raise web.HTTPBadRequest(text="Missing required 'link_flap_backoff_ms' param")

    link_impairment_detection = body.get("link_impairment_detection")
    if link_impairment_detection is None:
        raise web.HTTPBadRequest(
            text="Missing required 'link_impairment_detection' param"
        )

    topology: Dict = await APIServiceClient(timeout=1).request(
        name=network_name, endpoint="getTopology"
    )
    config_change_interval_s = body.get("config_change_interval_s", 60)
    # Get the current configuration overrides for all nodes in cut edges
    configs_all = await get_all_cut_edge_configs(
        network_name,
        topology,
        link_flap_backoff_ms,
        link_impairment_detection,
        config_change_interval_s,
        body.get("dry_run", True),
    )
    return web.json_response(configs_all)
