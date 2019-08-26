#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

"""
This example shows how to supply additional routes to the 'init' function. The
'main' function makes a 'getTopology' request for the 'Tower X' controller every
hour and saves the results to a MySQL table called 'Topology'.
"""

import asyncio
import datetime
import json
import logging
import sys
from typing import Dict

from sqlalchemy.sql import insert
from tglib.clients.api_service_client import APIServiceClient
from tglib.clients.mysql_client import MySQLClient
from tglib.tglib import Client, init

from models import Topology
from routes import routes


async def main(config: Dict) -> None:
    """Make a periodic 'getTopology' API request and store the results in MySQL."""
    topology_fetch_interval_s = config["topology_fetch_interval_s"]
    name = config["controller_name"]

    api_client = APIServiceClient.get_instance()
    mysql_client = MySQLClient.get_instance()

    while True:
        now = datetime.datetime.now()
        topo = await api_client.make_api_request(name, "getTopology")

        async with mysql_client.lease() as conn:
            query = insert(Topology).values(name=name, topo=topo, datetime=now)
            await conn.execute(query)
            await conn.connection.commit()

        # Sleep until next invocation time
        await asyncio.sleep(topology_fetch_interval_s)


if __name__ == "__main__":
    """Pass in the 'main' function, a set of clients, and 'routes' into 'init'."""
    try:
        with open("./service_config.json") as f:
            config = json.load(f)
    except OSError:
        logging.exception("Failed to parse service configuration file")
        sys.exit(1)

    init(lambda: main(config), {Client.API_SERVICE_CLIENT, Client.MYSQL_CLIENT}, routes)
