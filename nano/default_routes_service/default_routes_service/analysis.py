#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import logging
from datetime import datetime
from typing import List

from tglib.clients import MySQLClient

from .mysql_helpers import (
    fetch_prev_cn_routes,
    fetch_prev_routes,
    insert_history_table,
    insert_link_cn_routes_table,
    insert_or_update_current_table,
)


async def analyze_node(
    network_name: str,
    node_name: str,
    now: datetime,
    default_routes: List[List[str]],
    hop_count: int,
):
    """
    Analyze routes for the node and determine if the route has changed
    compared to the most recent entry in the database. Add entry to database
    if node entry does not exist.
    """
    async with MySQLClient().lease() as conn:
        # check if the route has changed
        prev_routes: List = await fetch_prev_routes(conn, network_name, node_name)

        # if current route is different from last stored route, then
        # add node data in history table and
        # update entry in current table
        if sorted(default_routes) != sorted(prev_routes):
            logging.info(
                f"Routes for {node_name} of {network_name} have changed! "
                "Updating database."
            )

            # insert node data into history table
            history_table_query_id = await insert_history_table(
                conn, network_name, node_name, now, default_routes, hop_count
            )
            # update entry in current table
            await insert_or_update_current_table(
                conn, network_name, node_name, now, history_table_query_id
            )
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
        prev_cn_routes: List = await fetch_prev_cn_routes(conn, network_name, link_name)

        # if current CN routes are different from last stored routes entry, then
        # add link data in the database
        if sorted(cn_routes) != sorted(prev_cn_routes):
            logging.info(
                f"Link CN routes for {link_name} of {network_name} have changed! "
                "Updating database."
            )

            # insert node data into link CN routes table
            await insert_link_cn_routes_table(
                conn, network_name, link_name, now, cn_routes
            )
        else:
            # if current CN routes have not changed, do nothing
            logging.debug(
                f"Link CN routes for {link_name} of {network_name} has not changed!"
            )
