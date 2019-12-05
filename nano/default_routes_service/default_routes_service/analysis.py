#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import logging
from datetime import datetime
from typing import List, Set, Tuple

from tglib.clients.mysql_client import MySQLClient

from .mysql_helpers import (
    fetch_prev_routes,
    insert_history_table,
    insert_or_update_current_table,
)


async def analyze_node(
    network_name: str,
    node_name: str,
    now: datetime,
    default_routes: List[List[str]],
    wireless_link_set: Set[Tuple[str, str]],
):
    """
    Analyze routes for the node and determine if the route has changed
    compared to the most recent entry in the database. Add entry to database
    if node entry does not exist.
    """
    # check if the route has changed
    prev_routes: List = await fetch_prev_routes(network_name, node_name)

    # if current route is different from last stored route, then
    # add node data in history table and
    # update entry in current table
    if sorted(default_routes) != sorted(prev_routes):
        logging.info(
            f"Routes for {node_name} of {network_name} have changed! "
            "Updating database."
        )
        logging.debug(f"Old route: {prev_routes}")
        logging.debug(f"New route: {default_routes}")

        async with MySQLClient().lease() as conn:
            # insert node data into history table
            history_table_query_id = await insert_history_table(
                conn, network_name, node_name, now, default_routes, wireless_link_set
            )
            # update entry in current table
            await insert_or_update_current_table(
                conn, network_name, node_name, now, history_table_query_id
            )
            await conn.connection.commit()
    else:
        # if current route has not changed, do nothing
        logging.debug(f"Route for {node_name} of {network_name} has not changed!")
