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
from tglib.tglib import Client, init

from topology_service.routes import topo_routes


async def main(config: Dict) -> None:
    """
    Use `getTopology` API request to fetch the latest topology in
    every `fetch_interval` seconds and stores results in MongoDB.
    Topology stored in `topology_service` database, `topology` collection.
    """
    fetch_interval: int = config["fetch_interval_s"]
    network_name: str = config["network_name"]

    # get client objects
    api_service_client = APIServiceClient.get_instance()
    mongodb_client = MongoDBClient.get_instance()

    # Access the db
    db = mongodb_client.get_db()
    collection = db.topology

    while True:
        topology: Dict = await api_service_client.make_api_request(
            topology_name=network_name, endpoint="getTopology"
        )

        # add timestamp field to topology
        topology["timestamp"] = f"{datetime.datetime.now()}"

        # store fetched topology in MongoDB
        result = await collection.insert_one(topology)
        logging.info(
            "Data written to 'topology' collection, "
            f"insert_id = {repr(result.inserted_id)}"
        )

        # Sleep until next invocation time
        await asyncio.sleep(fetch_interval)


if __name__ == "__main__":
    try:
        with open("./service_config.json") as file:
            config = json.load(file)
    except OSError as err:
        logging.exception(f"Failed to parse service configuration file: {err}")
        sys.exit(1)

    init(
        lambda: main(config),
        {Client.API_SERVICE_CLIENT, Client.MONGODB_CLIENT},
        topo_routes,
    )
