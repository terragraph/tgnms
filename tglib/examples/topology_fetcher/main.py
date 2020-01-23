#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

"""
This example shows how to supply additional routes to the 'init' function. The
'main' function makes a 'getTopology' request for each controller every hour and
saves the results to a MySQL table called 'Topology'.
"""

import asyncio
import datetime
import json
import logging
import sys
from typing import Dict

from sqlalchemy import insert
from tglib import ClientType, init
from tglib.clients import APIServiceClient, MySQLClient

from .models import Topology
from .routes import routes


async def async_main(config: Dict) -> None:
    """Make a periodic 'getTopology' API request and store the results in MySQL."""
    topology_fetch_interval_s = config["topology_fetch_interval_s"]

    api_client = APIServiceClient(timeout=1)
    mysql_client = MySQLClient()

    while True:
        now = datetime.datetime.now()
        results = await api_client.request_all("getTopology")
        values = [
            {"name": name, "topo": topo, "datetime": now}
            for name, topo in results.items()
        ]

        query = insert(Topology).values(values)
        async with mysql_client.lease() as conn:
            await conn.execute(query)
            await conn.connection.commit()

        # Sleep until next invocation time
        await asyncio.sleep(topology_fetch_interval_s)


def main() -> None:
    """Pass in the 'main' function, a set of clients, and 'routes' into 'init'."""
    try:
        with open("./service_config.json") as f:
            config = json.load(f)
    except (json.JSONDecodeError, OSError):
        logging.exception("Failed to parse service configuration file")
        sys.exit(1)

    init(
        lambda: async_main(config),
        {ClientType.API_SERVICE_CLIENT, ClientType.MYSQL_CLIENT},
        routes,
    )
