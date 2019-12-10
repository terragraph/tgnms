#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import asyncio
import datetime
import json
import logging
import sys
from typing import Dict, List, Set

from tglib import ClientType, init
from tglib.clients import APIServiceClient
from tglib.exceptions import ClientRuntimeError

from .config_operations import (
    is_link_flap_backoff_configured,
    is_link_impairment_detection_configured,
    prepare_all_configs,
)
from .graph_analysis import build_topology_graph, find_cn_cut_edges


async def async_main(config: Dict) -> None:
    """
    Use `getTopology` API request to fetch the latest topology
    Find all the edges that cut off one or more CNs and change link flap backoff and
    link impairment detection configs on them
    """
    logging.info("#### Starting CN cut-edge optimization service ####")

    logging.debug(f"Service config: {config}")

    while True:
        tasks = []
        # Get latest topology for all networks from API service
        logging.info("Requesting topologies for all networks from API service.")
        all_topologies: Dict = await APIServiceClient(timeout=1).request_all(
            endpoint="getTopology", return_exceptions=True
        )

        for network_name, topology in all_topologies.items():
            if isinstance(topology, ClientRuntimeError):
                logging.error(f"Error in fetching topology for {network_name}.")
            else:
                tasks.append(
                    asyncio.create_task(_main_impl(network_name, topology, config))
                )

        # sleep until next invocation time
        await asyncio.sleep(config["fetch_interval_s"])

        # await tasks to finish. If timeout, cancel tasks and pass
        try:
            await asyncio.wait_for(asyncio.gather(*tasks), timeout=1.0)
        except asyncio.TimeoutError:
            logging.error("Some tasks were unable to complete.")
            pass


async def _main_impl(network_name: str, topology: Dict, service_config: Dict) -> None:
    """
    1.  Create graph from topology
    2.  Find all edges that cut off one or more CNs
    3.  Find if those edges need config changes
    4.  Make config changes on those edges
    """

    # find all config changes that are requires
    configs_all = await get_all_cut_edge_configs(network_name, topology, service_config)
    if configs_all:
        config_change_interval: int = service_config["config_change_interval_s"]
        # apply all required config changes
        await modify_all_cut_edge_configs(
            network_name, configs_all, config_change_interval
        )


async def get_all_cut_edge_configs(
    network_name: str, topology: Dict, service_config: Dict
) -> List[Dict]:
    logging.info(f"Running cut edge config optimization for {network_name}.")
    configs_all: List[Dict] = []

    # create topology graph
    topology_graph, cns = build_topology_graph(network_name, topology)
    if not cns:
        logging.info(f"{network_name} has no CNs")
        return configs_all

    # find all edges that when down cut off one or more CNs
    cn_cut_edges = find_cn_cut_edges(topology_graph, cns)
    if not cn_cut_edges:
        logging.info(f"{network_name} has no CN cut edges")
        return configs_all

    logging.info(
        f"{network_name} has {len(cn_cut_edges)} edges that cut off one or more CNs"
    )
    link_flap_backoff: str = service_config["link_flap_backoff"]
    link_impairment_detection: bool = service_config["link_impairment_detection"]
    # to avoid repeating for the common node in P2MP
    node_set = {node_name for edge in cn_cut_edges.keys() for node_name in edge}

    # get the current config overrides for all nodes in cut edges
    try:
        response = await APIServiceClient(timeout=5).request(
            endpoint="getNodeOverridesConfig",
            name=network_name,
            params={"nodes": list(node_set)},
        )
    except ClientRuntimeError as e:
        logging.error(f"getNodeOverridesConfig call failed: {str(e)}")
        return configs_all

    # prepare config overrides for all nodes that need config changes
    configs_all = prepare_all_configs(
        response, link_impairment_detection, link_flap_backoff
    )
    if configs_all:
        logging.info(
            f"{network_name} requires cut edge config changes to {len(configs_all)} nodes"
        )
    else:
        logging.info(f"{network_name} does not require any cut edge config changes")

    return configs_all


async def modify_all_cut_edge_configs(
    network_name: str, configs_all: List[Dict], config_change_interval: int
) -> None:
    client = APIServiceClient(timeout=5)
    for node_config in configs_all:
        logging.info(f"Modifying config overrides in {network_name} with {node_config}")
        try:
            response = await client.request(
                endpoint="modifyNodeOverridesConfig",
                name=network_name,
                params=node_config,
            )
            logging.info(
                f"modifyNodeOverridesConfig response in {network_name} is {response}"
            )
        except ClientRuntimeError as e:
            logging.error(f"modifyNodeOverridesConfig call failed: {str(e)}")
            continue
        await asyncio.sleep(config_change_interval)


def main() -> None:
    try:
        with open("./service_config.json") as file:
            config = json.load(file)
    except OSError as err:
        logging.exception(f"Failed to parse service configuration file: {err}")
        sys.exit(1)

    init(lambda: async_main(config), {ClientType.API_SERVICE_CLIENT})
