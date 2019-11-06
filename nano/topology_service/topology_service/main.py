#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import asyncio
import datetime
import json
import logging
import sys
from typing import Dict

from tglib.clients.api_service_client import APIServiceClient
from tglib.clients.mongodb_client import MongoDBClient
from tglib.exceptions import ClientRuntimeError
from tglib.tglib import Client, init

from .routes import routes


async def async_main(config: Dict) -> None:
    """
    Use `getTopology` API request to fetch the latest topology in
    every `fetch_interval` seconds and stores results in MongoDB.
    Topology stored in `topology_service` database.
    """
    logging.info("#### Starting topology fetch service ####")

    logging.debug(f"Service config: {config}")
    fetch_interval: int = config["fetch_interval_s"]

    while True:
        # Get latest topology for all networks from API service
        logging.info("Requesting topologies for all networks from API service.")
        all_topologies: Dict = await APIServiceClient(timeout=1).request_all(
            endpoint="getTopology", return_exceptions=True
        )

        now = str(datetime.datetime.now())
        for topology_name, topology in all_topologies.items():
            if not isinstance(topology, ClientRuntimeError):
                # Access the db
                db = MongoDBClient().db
                collection = db[topology_name]

                # Add timestamp field to topology
                topology["timestamp"] = now

                # Store fetched topology in MongoDB
                result = await collection.insert_one(topology)
                logging.info(
                    f"Topology of {topology_name} is stored in {topology_name}"
                    f"collection, insert_id = {repr(result.inserted_id)}"
                )
            else:
                logging.error(f"Error in fetching topology for {topology_name}.")

        # Sleep until next invocation time
        await asyncio.sleep(fetch_interval)


def main() -> None:
    try:
        with open("./service_config.json") as file:
            config = json.load(file)
    except OSError as err:
        logging.exception(f"Failed to parse service configuration file: {err}")
        sys.exit(1)

    init(
        lambda: async_main(config),
        {Client.API_SERVICE_CLIENT, Client.MONGODB_CLIENT},
        routes,
    )
