#!/usr/bin/env python3

# Copyright (c) Meta Platforms, Inc. and affiliates.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

import asyncio
from collections import defaultdict
from typing import Dict

from aiohttp import web
from tglib.clients import APIServiceClient

from .base import routes
from .optimizations.config_operations import (
    get_cn_cut_edges,
    get_current_overrides_configs,
    prepare_changes,
    update_overrides_configs,
)
from .optimizations.graph import build_topology_graph
from .utils.db import (
    delete_node_entries,
    get_previous_overrides_configs,
    insert_overrides_configs,
)


@routes.post("/optimize_cut_edges")
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
            type: integer
            description: The interval between link status checks for a network.
          link_flap_backoff_ms:
            type: string
            description: Set the max value for link flap backoff.
          link_impairment_detection:
            type: integer
            description: Enable/Disable link impairment detection.
          config_change_delay_s:
            type: integer
            description: Time delay used before updating the next node's configuration (default=60).
          link_uptime_threshold:
            type: number
            format: float
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
        description: Successful operation.
      "400":
        description: Invalid or missing parameters.
      "404":
        description: Unable to run cut edge optimization.
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

    dry_run = body.get("dry_run", True)

    link_uptime_threshold = body.get("link_uptime_threshold")
    if link_uptime_threshold and not 0 <= link_uptime_threshold < 1:
        raise web.HTTPBadRequest(
            text="If provided, 'link_uptime_threshold' must be in the range [0, 1)"
        )

    api_client = APIServiceClient(timeout=2)
    topology: Dict = await api_client.request(network_name, endpoint="getTopology")

    # Create topology graph
    topology_graph, cns = build_topology_graph(topology)
    if not cns:
        raise web.HTTPNotFound(text=f"{network_name} has no CNs")

    # Get all CN cut edges
    cn_cut_edges = await get_cn_cut_edges(
        network_name, topology, cns, topology_graph, window_s, link_uptime_threshold
    )
    if cn_cut_edges is None:
        raise web.HTTPNotFound(text=f"{network_name} has no CN cut edges")

    # To avoid repeating for the common node in P2MP
    node_set = {node_name for edge in cn_cut_edges for node_name in edge}

    # Get previous config overrides for all nodes in cut edges
    previous_config = await get_previous_overrides_configs({network_name})

    # Get current config for all nodes of cut edges
    current_overrides_configs = await get_current_overrides_configs(
        api_client, network_name, node_set
    )
    if current_overrides_configs is None:
        raise web.HTTPBadRequest(
            text="Unable to get current node overrides config from API service"
        )

    overrides, entries_to_insert, entries_to_delete = prepare_changes(
        network_name,
        current_overrides_configs,
        previous_config.get(network_name, {}),
        link_impairment_detection,
        link_flap_backoff_ms,
    )
    if overrides:
        if not dry_run:
            await asyncio.gather(
                update_overrides_configs(
                    api_client, network_name, overrides, config_change_delay_s
                ),
                insert_overrides_configs(entries_to_insert),
                delete_node_entries(entries_to_delete),
            )
    else:
        raise web.HTTPNotFound(
            text=f"{network_name} does not require any cut edge config changes"
        )

    response = defaultdict(list)
    for is_modify, override in overrides:
        response["modify" if is_modify else "set"].append(override)

    return web.json_response(response)
