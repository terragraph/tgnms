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
          window_s:
            type: int
            description: The interval between link status checks for a network.
          link_flap_backoff_ms:
            type: string
            description: Set the max value for link flap backoff.
          link_impairment_detection:
            type: int
            description: Enable/Disable link impairment detection.
          config_change_delay_s:
            type: integer
            description: Time delay used before updating the next node's configuration (default=60).
          link_uptime_threshold:
            type: float
            description: Disregard links with uptime values below this threshold if provided. Values must be in the range [0,1).
          dry_run:
            type: boolean
            description: Cut edge configuration changes are applied if set to false (default=true).
        required:
        - network_name
        - link_flap_backoff_ms
        - link_impairment_detection
    responses:
      "200":
        description: Successful operation. Returns a list of all cut edge modifications in the network.
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

    config_change_delay_s = body.get("config_change_delay_s", 60)

    window_s = body.get("window_s", 86400)

    link_uptime_threshold = body.get("link_uptime_threshold")
    if link_uptime_threshold and not 0 <= link_uptime_threshold < 1:
        raise web.HTTPBadRequest(
            text="If provided, 'link_uptime_threshold' must be in the range [0, 1)"
        )

    topology: Dict = await APIServiceClient(timeout=1).request(
        network_name, endpoint="getTopology"
    )

    # Get the current configuration overrides for all nodes in cut edges
    configs_all = await get_all_cut_edge_configs(
        topology,
        window_s,
        link_flap_backoff_ms,
        link_impairment_detection,
        config_change_delay_s,
        link_uptime_threshold,
        body.get("dry_run", True),
    )
    return web.json_response(configs_all)
