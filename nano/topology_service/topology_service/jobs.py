#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import logging
from typing import Dict

from sqlalchemy import func, insert, select
from tglib.clients import MySQLClient
from tglib.exceptions import ClientRuntimeError

from .models import TopologyHistory
from .utils import sanitize_topology


async def save_latest_topologies(start_time: int, topologies: Dict) -> None:
    for network_name, topology in list(topologies.items()):
        if isinstance(topology, ClientRuntimeError):
            logging.error(f"Failed to fetch topology for {network_name}")
            del topologies[network_name]
        else:
            sanitize_topology(topology)

    if not topologies:
        return

    async with MySQLClient().lease() as sa_conn:
        # Get the latest copy of each valid network's topology to compare
        query = select([TopologyHistory.network_name, TopologyHistory.topology]).where(
            (
                TopologyHistory.id.in_(
                    select([func.max(TopologyHistory.id)]).group_by(
                        TopologyHistory.network_name
                    )
                )
            )
            & (TopologyHistory.network_name.in_(topologies.keys()))
        )

        values = []
        cursor = await sa_conn.execute(query)

        for result in await cursor.fetchall():
            # Compare the latest recorded topology with the current one
            if result.topology == topologies[result.network_name]:
                logging.debug(f"{result.network_name} is unchanged, skipping")
            else:
                logging.info(f"The topology for {result.network_name} changed, saving")
                values.append(
                    {
                        "network_name": result.network_name,
                        "topology": topologies[result.network_name],
                    }
                )

            del topologies[result.network_name]

        # Add all newly seen networks
        for network_name, topology in topologies.items():
            logging.info(f"New network found: {network_name}, saving")
            values.append({"network_name": network_name, "topology": topology})

        if values:
            query = insert(TopologyHistory).values(values)
            await sa_conn.execute(query)
            await sa_conn.connection.commit()
