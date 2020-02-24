#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import asyncio
import logging
from dataclasses import dataclass
from typing import Dict, List, Tuple

from tglib.clients import APIServiceClient
from tglib.exceptions import ClientRuntimeError


@dataclass
class DRS:
    """
    Struct for representing topology and default routes of all its nodes, which is
    used by all jobs of default routes service.
    """

    network_name: str
    topology: Dict
    default_routes: Dict


async def get_default_routes_service_objs() -> List[DRS]:
    """
    Fetch all topologies using 'getTopology' API service endpoint.
    Fetch default routes for all nodes of the all topologies.
    """
    # list of default routes service objects
    drs_objs: List = []

    # get latest topology for all networks from API service
    logging.info("Requesting topologies for all networks from API service.")
    all_topologies: Dict = await APIServiceClient(timeout=1).request_all(
        endpoint="getTopology", return_exceptions=True
    )

    for network_name, topology in all_topologies.items():
        if isinstance(topology, ClientRuntimeError):
            logging.error(f"Error in fetching topology for {network_name}.")
        else:
            drs_objs.append(_fetch_default_routes(network_name, topology))

    # get default routes for the topology
    drs_objs = await asyncio.gather(*drs_objs)

    return drs_objs


async def _fetch_default_routes(network_name: str, topology: Dict) -> DRS:
    """
    Fetch the default routes for each node of the topology using the
    'getDefatulRoutes' API service endpoint.
    """
    logging.info(
        f"Requesting default routes for all nodes of {network_name} from API service."
    )
    default_routes: Dict = {}
    nodes: List = []
    batch_size: int = 10

    client = APIServiceClient(timeout=5)
    # batching the requests to reduce request load on E2E server
    for i, node in enumerate(topology["nodes"], 1):
        nodes.append(node["name"])
        if i % batch_size == 0:
            # fetch default routes for batch_size number of nodes
            default_routes.update(
                (
                    await client.request(
                        network_name=network_name,
                        endpoint="getDefaultRoutes",
                        params={"nodes": nodes},
                    )
                ).get("defaultRoutes", {})
            )
            # reset the list of nodes
            nodes.clear()

    # run again for the remainder of nodes
    if nodes:
        default_routes.update(
            (
                await client.request(
                    network_name=network_name,
                    endpoint="getDefaultRoutes",
                    params={"nodes": nodes},
                )
            ).get("defaultRoutes", {})
        )

    return DRS(network_name, topology, default_routes)
