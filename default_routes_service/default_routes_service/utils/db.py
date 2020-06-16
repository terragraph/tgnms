#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import logging
from collections import defaultdict
from datetime import datetime
from typing import DefaultDict, Dict, List, Tuple

from sqlalchemy import func, insert, select
from tglib.clients import MySQLClient

from ..models import CnEgressRoutesHistory, DefaultRoutesHistory


async def save_default_routes(
    start_time_ms: int, curr_routes: Dict[str, Dict[str, Tuple[List[List[str]], int]]]
) -> None:
    """Save the curr_routes to the database if they have changed."""
    async with MySQLClient().lease() as sa_conn:
        query = select(
            [
                DefaultRoutesHistory.network_name,
                DefaultRoutesHistory.node_name,
                DefaultRoutesHistory.routes,
            ]
        ).where(
            (
                DefaultRoutesHistory.id.in_(
                    select([func.max(DefaultRoutesHistory.id)]).group_by(
                        DefaultRoutesHistory.network_name,
                        DefaultRoutesHistory.node_name,
                    )
                )
            )
            & (DefaultRoutesHistory.network_name.in_(curr_routes.keys()))
        )

        cursor = await sa_conn.execute(query)
        last_updated = datetime.utcfromtimestamp(start_time_ms / 1e3)

        values = []
        for row in await cursor.fetchall():
            # Compare the last recorded default routes with the current ones
            if row.node_name not in curr_routes[row.network_name]:
                logging.debug(f"{row.node_name} is no longer in {row.network_name}")
            else:
                routes, max_hop_count = curr_routes[row.network_name][row.node_name]
                routes.sort()
                if routes == row.routes:
                    logging.debug(f"{row.node_name} on {row.network_name} is unchanged")
                else:
                    logging.info(
                        f"New default routes for {row.node_name} on {row.network_name}"
                    )
                    values.append(
                        {
                            "network_name": row.network_name,
                            "node_name": row.node_name,
                            "last_updated": last_updated,
                            "routes": routes,
                            "max_hop_count": max_hop_count,
                        }
                    )

                del curr_routes[row.network_name][row.node_name]

        # Add all newly seen default routes
        for network_name, node_name_map in curr_routes.items():
            for node_name, (routes, max_hop_count) in node_name_map.items():
                logging.debug(f"New node, {node_name}, was found on {network_name}")
                values.append(
                    {
                        "network_name": network_name,
                        "node_name": node_name,
                        "last_updated": last_updated,
                        "routes": sorted(routes),
                        "max_hop_count": max_hop_count,
                    }
                )

        if values:
            query = insert(DefaultRoutesHistory).values(values)
            await sa_conn.execute(query)
            await sa_conn.connection.commit()


async def save_cn_egress_routes(
    start_time_ms: int, curr_routes: Dict[str, DefaultDict[str, List[List[str]]]]
) -> None:
    """Save the curr_routes to the database if they have changed."""
    async with MySQLClient().lease() as sa_conn:
        query = select(
            [
                CnEgressRoutesHistory.network_name,
                CnEgressRoutesHistory.link_name,
                CnEgressRoutesHistory.routes,
            ]
        ).where(
            (
                CnEgressRoutesHistory.id.in_(
                    select([func.max(CnEgressRoutesHistory.id)]).group_by(
                        CnEgressRoutesHistory.network_name,
                        CnEgressRoutesHistory.link_name,
                    )
                )
            )
            & (CnEgressRoutesHistory.network_name).in_(curr_routes.keys())
        )

        cursor = await sa_conn.execute(query)
        last_updated = datetime.utcfromtimestamp(start_time_ms / 1e3)

        values = []
        for row in await cursor.fetchall():
            if row.link_name not in curr_routes[row.network_name]:
                logging.debug(f"{row.link_name} is no longer in {row.network_name}")
            else:
                routes = curr_routes[row.network_name][row.link_name]
                routes.sort()
                if routes == row.routes:
                    logging.debug(
                        f"CN egress traffic is unchanged for {row.link_name} on "
                        f"{row.network_name}"
                    )
                else:
                    logging.info(
                        f"{row.link_name} carries egress traffic for different CNs on "
                        f"{row.network_name}"
                    )
                    values.append(
                        {
                            "network_name": row.network_name,
                            "link_name": row.link_name,
                            "last_updated": last_updated,
                            "routes": routes,
                        }
                    )

                del curr_routes[row.network_name][row.link_name]

        # Add all newly seen CN egress routes
        for network_name, link_name_map in curr_routes.items():
            for link_name, routes in link_name_map.items():
                logging.debug(f"New link, {link_name}, was found on {network_name}")
                values.append(
                    {
                        "network_name": network_name,
                        "link_name": link_name,
                        "last_updated": last_updated,
                        "routes": sorted(routes),
                    }
                )

        if values:
            query = insert(CnEgressRoutesHistory).values(values)
            await sa_conn.execute(query)
            await sa_conn.connection.commit()
