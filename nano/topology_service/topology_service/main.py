#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import asyncio
import json
import logging
import sys
from datetime import datetime
from typing import Dict

from tglib import ClientType, init
from tglib.clients import APIServiceClient
from tglib.exceptions import ClientRuntimeError

from .mysql_helpers import fetch_topologies, insert_topology
from .routes import routes
from .util import sanitize_topology


async def async_main(config: Dict) -> None:
    """
    Use `getTopology` API request to fetch the latest topology in
    every `fetch_interval` seconds and stores results in the database.
    Topology stored in `topology_service` database.
    """
    logging.info("#### Starting topology fetch service ####")

    logging.debug(f"Service config: {config}")
    fetch_interval: int = config["fetch_interval_s"]

    while True:
        tasks = []

        # Get latest topology for all networks from API service
        logging.info("Requesting topologies for all networks from API service.")
        all_topologies: Dict = await APIServiceClient(timeout=1).request_all(
            endpoint="getTopology", return_exceptions=True
        )
        now = datetime.now()

        for topology_name, topology in all_topologies.items():
            if isinstance(topology, ClientRuntimeError):
                logging.error(f"Error in fetching topology for {topology_name}.")
            else:
                # analyze fetched topologies and store results in the database
                tasks.append(asyncio.create_task(_main_impl(topology, now)))

        # Sleep until next invocation time
        await asyncio.sleep(fetch_interval)

        # await tasks to finish. If timeout, cancel tasks and pass
        try:
            await asyncio.wait_for(asyncio.gather(*tasks), timeout=1.0)
        except asyncio.TimeoutError:
            logging.error("Some tasks were unable to complete.")
            pass


async def _main_impl(topology: Dict, now: datetime) -> None:
    """
    1.  Analyze fetched topology to determine if the topology has changed compared
        to the most recent entry in the database.
    2.  Write the results to the database.
    """
    # sanitize the fetched topology
    sanitize_topology(topology)

    # fetch the most recent entry in the database
    previous_entry = await fetch_topologies(topology["name"])

    # compare the topologies
    if previous_entry and previous_entry[0]["topology"] == topology:
        logging.info(f"Topology for {topology['name']} has not changed.")
    else:
        await insert_topology(topology, now)


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
