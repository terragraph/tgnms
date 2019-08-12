#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

"""Provide topology utility functions.

This module provides functions which can read the topology from the API service
and process topology related configurations.

Attributes:
    NetworkInfo
    fetch_network_info(Optional[int]) -> List[NetworkInfo]
"""

import asyncio
import dataclasses
import logging
from typing import Dict, List, Optional

from sqlalchemy.sql import join, select

from facebook.gorilla.Topology.ttypes import LinkType
from module.mysql_connection_pool import get_shared_pool
from module.http_client import HTTPClient
from module.models import Controller, Topology


@dataclasses.dataclass
class NetworkInfo:
    """Struct for representing the API config and topology for a network."""

    name: str
    api_ip: str
    api_port: int
    e2e_ip: str
    e2e_port: int
    nodes: List[Dict]
    links: List[Dict]
    sites: List[Dict]
    config: Dict


async def fetch_network_info(topology_id: Optional[int] = None) -> List[NetworkInfo]:
    """Return a list of NetworkInfo, one for each API configuration in MySQL.

    Fetches the API service settings from MySQL and uses the results to get
    the topology for each network. Skip results where the request fails or the
    topology only has wired links.

    Args:
        topology_id: (Optional) Only fetch the network info for this topology.

    Returns:
        A list of NetworkInfo, with all nodes/links with empty MAC addresses
        removed for each network.
    """

    # Construct a MySQL query to fetch API service setting configurations
    query = select([Controller.api_ip, Controller.api_port]).select_from(
        join(Controller, Topology, Controller.id == Topology.primary_controller)
    )

    # If provided, add filter on topology_id
    if topology_id is not None:
        query = query.where(Topology.id == topology_id)

    # Send the fully constructed query to the database
    pool = get_shared_pool()
    async with pool.lease() as conn:
        cursor = await conn.execute(query)
        sql_results = await cursor.fetchall()

    # Create async tasks to fetch the topology for each API service config
    tasks = []
    for sql_result in sql_results:
        client = HTTPClient(f"[{sql_result['api_ip']}]", sql_result["api_port"])
        tasks.append(client.post("api/getTopology", {}))

    # Run the tasks asynchronously
    api_results = await asyncio.gather(*tasks)

    networks = []
    for sql_result, api_result in zip(sql_results, api_results):
        # Skip results that failed
        if api_result is None:
            continue

        # Skip results with no wireless links
        if all(link["link_type"] == LinkType.ETHERNET for link in api_result["links"]):
            logging.warning(f"Ignoring {api_result['name']}: no wireless links")
            continue

        networks.append(
            NetworkInfo(
                name=api_result["name"],
                api_ip=sql_result["api_ip"],
                api_port=sql_result["api_port"],
                e2e_ip=sql_result["e2e_ip"],
                e2e_port=sql_result["e2e_port"],
                nodes=api_result["nodes"],
                links=api_result["links"],
                sites=api_result["sites"],
                config=api_result["config"],
            )
        )

    for network in networks:
        # Remove nodes and links with empty MAC addresses
        network.nodes[:] = [node for node in network.nodes if node["mac_addr"]]
        network.links[:] = [
            link for link in network.links if link["a_node_mac"] and link["z_node_mac"]
        ]

    return networks
