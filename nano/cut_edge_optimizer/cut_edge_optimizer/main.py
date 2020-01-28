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
    get_all_cut_edge_configs,
    is_link_flap_backoff_configured,
    is_link_impairment_detection_configured,
    modify_all_cut_edge_configs,
    prepare_all_configs,
)
from .routes import routes


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

    # find all config changes that are required
    configs_all = await get_all_cut_edge_configs(network_name, topology, service_config)
    if configs_all:
        config_change_interval: int = service_config["config_change_interval_s"]
        # apply all required config changes
        await modify_all_cut_edge_configs(
            network_name, configs_all, config_change_interval
        )


def main() -> None:
    try:
        with open("./service_config.json") as file:
            config = json.load(file)
    except OSError as err:
        logging.exception(f"Failed to parse service configuration file: {err}")
        sys.exit(1)

    init(lambda: async_main(config), {ClientType.API_SERVICE_CLIENT}, routes)
