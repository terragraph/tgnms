#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import asyncio
import json
import logging
import sys
import time
from datetime import datetime
from typing import Dict, List

from terragraph_thrift.Topology.ttypes import LinkType
from tglib import ClientType, init
from tglib.clients import APIServiceClient
from tglib.exceptions import ClientRuntimeError

from .analysis import analyze_node
from .routes import routes


async def async_main(config: Dict) -> None:
    """
    Use `getDefaultRoutes` API request to fetch default routes across all
    networks every fetch_interval seconds and store the results in the database.

    Default routes are stored in `default_route_service` database,
    `default_route_history` and `default_route_current` tables.
    """
    logging.info("#### Starting default routes service ####")

    logging.debug(f"Service config: {config}")
    fetch_interval: int = config["fetch_interval_s"]
    # restrict service frequency to reduce load on E2E server
    if fetch_interval < 60:
        raise ValueError("'fetch_interval' cannot be less than 60 seconds.")

    while True:
        tasks = []

        start_time = time.time()
        # get latest topology for all networks from API service
        logging.info("Requesting topologies for all networks from API service.")
        all_topologies: Dict = await APIServiceClient(timeout=1).request_all(
            endpoint="getTopology", return_exceptions=True
        )

        for topology_name, topology in all_topologies.items():
            if isinstance(topology, ClientRuntimeError):
                logging.error(f"Error in fetching topology for {topology_name}.")
            else:
                # get default routes, analyze them and store results in the database
                tasks.append(asyncio.create_task(_main_impl(topology_name, topology)))

        # sleep until next invocation time
        await asyncio.sleep(start_time + fetch_interval - time.time())

        # await tasks to finish. If timeout, cancel tasks and pass
        try:
            await asyncio.wait_for(asyncio.gather(*tasks), timeout=1.0)
        except asyncio.TimeoutError:
            logging.error("Some tasks were unable to complete.")
            pass


async def _main_impl(network_name: str, topology: Dict) -> None:
    """
    1.  Fetch the default routes for each node in 'network_name' using the
        'getDefatulRoutes' API service endpoint.
    2.  Analyze the routes to determine if the route has changed compared to
        the most recent entry in the database.
    3.  Write the results to the database.
    """
    # get default routes for all nodes of the network
    logging.info(
        f"Requesting default routes for all nodes of {network_name} from API service."
    )
    all_nodes_default_routes: Dict = {}
    nodes: List = []
    batch_size: int = 10

    client = APIServiceClient(timeout=5)
    for i, node in enumerate(topology["nodes"], 1):
        if i % batch_size == 0:
            # fetch default routes for batch_size number of nodes
            all_nodes_default_routes.update(
                (
                    await client.request(
                        name=network_name,
                        endpoint="getDefaultRoutes",
                        params={"nodes": nodes},
                    )
                ).get("defaultRoutes", {})
            )
            # reset the list of nodes
            nodes.clear()
        else:
            nodes.append(node["name"])

    # run again for the remainder of nodes
    if nodes:
        all_nodes_default_routes.update(
            (
                await client.request(
                    name=network_name,
                    endpoint="getDefaultRoutes",
                    params={"nodes": nodes},
                )
            ).get("defaultRoutes", {})
        )

    # if default routes for the network does not exist, return
    if not all_nodes_default_routes:
        logging.error(f"Unable to fetch the default routes for {network_name}.")
        return

    now = datetime.now()
    # create a set of all wireless links in the topology
    wireless_link_set = {
        (link["a_node_name"], link["z_node_name"])
        for link in topology["links"]
        if link["link_type"] == LinkType.WIRELESS
    }
    logging.debug(f"wireless_link_set = {wireless_link_set}")

    coroutines = []
    for node_name, default_routes in all_nodes_default_routes.items():
        logging.debug(
            f"node: {node_name}; topology name: {network_name}, "
            f"routes: {default_routes}"
        )

        coroutines.append(
            analyze_node(
                network_name, node_name, now, default_routes, wireless_link_set
            )
        )

    await asyncio.gather(*coroutines)


def main() -> None:
    try:
        with open("./service_config.json") as file:
            config = json.load(file)
    except OSError as err:
        logging.exception(f"Failed to parse service configuration file: {err}")
        sys.exit(1)

    init(
        lambda: async_main(config),
        {ClientType.API_SERVICE_CLIENT, ClientType.MYSQL_CLIENT},
        routes,
    )
