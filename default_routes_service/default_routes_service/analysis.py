#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import logging
from datetime import datetime
from typing import List

from sqlalchemy import desc, insert, select
from tglib.clients import MySQLClient

from .models import DefaultRoutesHistory, LinkCnRoutes


async def analyze_node(
    network_name: str,
    node_name: str,
    now: datetime,
    default_routes: List[List[str]],
    hop_count: int,
) -> None:
    """
    Analyze routes for the node and determine if the route has changed
    compared to the most recent entry in the database. Add entry to database
    if node entry does not exist.
    """
    async with MySQLClient().lease() as conn:
        # fetch the last stored route entry for the given node from the database.
        query = (
            select([DefaultRoutesHistory.id, DefaultRoutesHistory.routes])
            .where(
                (DefaultRoutesHistory.node_name == node_name)
                & (DefaultRoutesHistory.network_name == network_name)
            )
            .order_by(desc(DefaultRoutesHistory.id))
            .limit(1)
        )
        logging.debug(f"Query for routes of {node_name} in database: {str(query)}")
        cursor = await conn.execute(query)
        results = await cursor.fetchone()
        id = results["id"] if results else None
        prev_routes: List = results["routes"] if results else []

        # if current route is different from last stored route, then
        # add node data in history table
        if sorted(default_routes) != sorted(prev_routes):
            logging.info(
                f"Routes for {node_name} of {network_name} have changed! "
                "Updating database."
            )

            # insert node data into history table
            query = insert(DefaultRoutesHistory).values(
                network_name=network_name,
                node_name=node_name,
                last_updated=now,
                routes=default_routes,
                hop_count=hop_count,
                prev_routes_id=id,
            )
            logging.debug(
                "Query for inserting routes into history "
                f"table for {node_name}: {str(query)}"
            )
            await conn.execute(query)
            await conn.connection.commit()
        else:
            # if current route has not changed, do nothing
            logging.debug(f"Route for {node_name} of {network_name} has not changed!")


async def analyze_link_cn_routes(
    network_name: str, now: datetime, link_name: str, cn_routes: List
) -> None:
    """
    Analyze CN routes for the link and determine if the importance has changed
    compared to the most recent entry in the database. Add entry to database
    if link entry does not exist.
    """
    async with MySQLClient().lease() as conn:
        # fetch previous cn_routes value for the link
        query = (
            select([LinkCnRoutes.cn_routes])
            .where(
                (LinkCnRoutes.link_name == link_name)
                & (LinkCnRoutes.network_name == network_name)
            )
            .order_by(desc(LinkCnRoutes.id))
            .limit(1)
        )
        logging.debug(f"Query for CN routes of {link_name} in database: {str(query)}")
        cursor = await conn.execute(query)
        results = await cursor.fetchone()
        prev_cn_routes: List = results["cn_routes"] if results else []

        # if current CN routes are different from last stored routes entry, then
        # add link data in the database
        if sorted(cn_routes) != sorted(prev_cn_routes):
            logging.info(
                f"Link CN routes for {link_name} of {network_name} have changed! "
                "Updating database."
            )

            # insert node data into link CN routes table
            query = insert(LinkCnRoutes).values(
                network_name=network_name,
                link_name=link_name,
                last_updated=now,
                cn_routes=cn_routes,
            )
            logging.debug(
                f"Query for inserting link into database for {link_name}: {str(query)}"
            )
            await conn.execute(query)
            await conn.connection.commit()
        else:
            # if current CN routes have not changed, do nothing
            logging.debug(
                f"Link CN routes for {link_name} of {network_name} has not changed!"
            )
