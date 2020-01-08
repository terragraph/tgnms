#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import logging
from datetime import datetime
from typing import List, Optional, Set, Tuple

from aiomysql.sa import SAConnection
from sqlalchemy import desc, exists, func, insert, join, select, update
from tglib.clients import MySQLClient

from .models import DefaultRouteCurrent, DefaultRouteHistory


async def fetch_prev_routes(network_name: str, node_name: str) -> List:
    """
    Fetch the last stored route entry for the given node from the database.
    """
    query = (
        select([DefaultRouteHistory.routes.label("routes")])
        .select_from(
            join(
                DefaultRouteCurrent,
                DefaultRouteHistory,
                DefaultRouteCurrent.current_route_id == DefaultRouteHistory.id,
            )
        )
        .where(
            (DefaultRouteCurrent.node_name == node_name)
            & (DefaultRouteCurrent.topology_name == network_name)
        )
        .order_by(desc(DefaultRouteCurrent.id))
        .limit(1)
    )
    logging.debug(f"Query for routes of {node_name} in database: {str(query)}")
    async with MySQLClient().lease() as conn:
        cursor = await conn.execute(query)
        results = await cursor.fetchone()

    prev_routes: List = results["routes"] if results else []
    return prev_routes


async def fetch_preceding_routes(
    id: int, network_name: str, node_name: str
) -> Optional[List]:
    """
    Fetch latest entry just before entry at the given id
    """
    query = select([DefaultRouteHistory.routes.label("routes")]).where(
        DefaultRouteHistory.id
        == (
            select([func.max(DefaultRouteHistory.id)]).where(
                (DefaultRouteHistory.id < id)
                & (DefaultRouteHistory.topology_name == network_name)
                & (DefaultRouteHistory.node_name == node_name)
            )
        )
    )
    logging.debug(f"Query to fetch previous routes entry from db: {str(query)}")

    client = MySQLClient()
    async with client.lease() as conn:
        cursor = await conn.execute(query)
        results = await cursor.fetchone()
    prev_routes: Optional[List] = results["routes"] if results else None
    return prev_routes


async def insert_history_table(
    conn: SAConnection,
    network_name: str,
    node_name: str,
    now: datetime,
    default_routes: List[List],
    wireless_link_set: Set[Tuple[str, str]],
) -> int:
    """
    Insert current node in history table.
    """
    # calculate the number of wireless hops from the node to pop
    # "hop_count" is the same for every route in default_routes
    hop_count = 0
    if default_routes:
        for src, dst in zip(default_routes[0], default_routes[0][1:]):
            hop = tuple(sorted((src, dst)))
            if hop in wireless_link_set:
                hop_count += 1

    # add node to history table
    query = insert(DefaultRouteHistory).values(
        topology_name=network_name,
        node_name=node_name,
        last_updated=now,
        routes=default_routes,
        is_ecmp=len(default_routes) > 1,
        hop_count=hop_count,
    )
    logging.debug(
        f"Query for inserting routes into history table for {node_name}: {str(query)}"
    )
    result = await conn.execute(query)
    history_table_query_id: int = result.lastrowid
    return history_table_query_id


async def insert_or_update_current_table(
    conn: SAConnection,
    network_name: str,
    node_name: str,
    now: datetime,
    history_table_query_id: int,
) -> None:
    """
    Check if entry exists in `current` table for the node.
    If yes, update the entry with new values, else insert as new entry.
    """
    # check if the node entry exists in current table
    query = select(
        [
            exists()
            .where(
                (DefaultRouteCurrent.node_name == node_name)
                & (DefaultRouteCurrent.topology_name == network_name)
            )
            .label("entry")
        ]
    )
    logging.debug(f"Query to check if entry for {node_name} exists in db: {str(query)}")
    cursor = await conn.execute(query)
    node_entry_exists = await cursor.fetchone()

    if node_entry_exists["entry"]:
        # since node entry exists in the db, update node entry in current table
        query = (
            update(DefaultRouteCurrent)
            .values(
                topology_name=network_name,
                node_name=node_name,
                last_updated=now,
                current_route_id=history_table_query_id,
            )
            .where(
                (DefaultRouteCurrent.node_name == node_name)
                & (DefaultRouteCurrent.topology_name == network_name)
            )
        )
        logging.debug(
            f"Query for updating entry in current table for {node_name}: {str(query)}"
        )
        await conn.execute(query)
    else:
        # since node entry does not exist in the db, insert it to current table
        logging.info(
            f"Adding routes information for {node_name} "
            f"from {network_name} to the database"
        )
        # add node to current table
        query = insert(DefaultRouteCurrent).values(
            topology_name=network_name,
            node_name=node_name,
            last_updated=now,
            current_route_id=history_table_query_id,
        )
        logging.debug(
            f"Query for inserting entry into current table for {node_name}: {str(query)}"
        )
        await conn.execute(query)
