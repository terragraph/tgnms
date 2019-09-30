#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import asyncio
import datetime
import json
import logging
import sys
from typing import Dict, List, Optional, Set, Tuple

from aiomysql.sa import SAConnection
from facebook.gorilla.Topology.ttypes import LinkType
from sqlalchemy.sql import desc, exists, insert, join, select, update
from tglib.clients.api_service_client import APIServiceClient
from tglib.clients.mysql_client import MySQLClient
from tglib.exceptions import ClientRuntimeError
from tglib.tglib import Client, init

from default_routes_service.models import DefaultRouteCurrent, DefaultRouteHistory


async def main(config: Dict) -> None:
    """
    Use `getDefaultRoutes` API request to fetch default routes across all
    networks every fetch_interval seconds and store the results in MySQL.

    Default routes are stored in `default_route_service` database,
    `default_route_history` and `default_route_current` tables.
    """
    logging.info("#### Starting default routes service ####")

    logging.debug(f"Service config: {config}")
    fetch_interval: int = config["fetch_interval_s"]

    while True:
        tasks = []

        # Get latest topology for all networks from API service
        logging.info("Requesting topologies for all networks from API service.")
        all_topologies: Dict = await APIServiceClient(timeout=1).request_all(
            endpoint="getTopology", return_exceptions=True
        )

        for topology_name, topology in all_topologies.items():
            if not isinstance(topology, ClientRuntimeError):
                # Get default routes, analyze them and store results in MySQL
                tasks.append(asyncio.create_task(_main_impl(topology_name, topology)))
            else:
                logging.error(f"Error in fetching topology for {topology_name}.")

        # Sleep until next invocation time
        await asyncio.sleep(fetch_interval)

        # Await tasks to finish. If timeout, cancel tasks and pass
        try:
            await asyncio.wait_for(asyncio.gather(*tasks), timeout=1.0)
        except asyncio.TimeoutError:
            logging.error("Some tasks were unable to complete.")
            pass


async def _main_impl(network_name: str, topology: Dict) -> None:
    """
    1.  Fetch the default routes for each node in 'network_name' using the
        'getDefatulRoutes' API service endpoint.
    2.  Analyze the routes to determine if the route has changed compared to
        the most recent entry in the database.
    3.  Write the results to MySQL.
    """
    # Get default routes for all nodes of the network
    logging.info(
        f"Requesting default routes for all nodes of {network_name} from API service."
    )
    results: Dict = await APIServiceClient(timeout=1).request(
        name=network_name,
        endpoint="getDefaultRoutes",
        params={"nodes": [node["name"] for node in topology["nodes"]]},
    )
    default_routes: Optional[Dict] = results.get("defaultRoutes")

    # If default routes for the network does not exist, return
    if default_routes is None:
        logging.error(f"Unable to fetch the default routes for {network_name}.")
        return

    now = datetime.datetime.now()
    # Create a set of all wireless links in the topology
    wireless_link_set = {
        (link["a_node_name"], link["z_node_name"])
        for link in topology["links"]
        if link["link_type"] == LinkType.WIRELESS
    }
    logging.debug(f"wireless_link_set = {wireless_link_set}")

    for node_name, current_default_route_list in default_routes.items():
        logging.debug(
            f"node: {node_name}; topology name: {network_name}, "
            "routes: {current_default_route_list}"
        )

        # Skip if the node has no default routes (offline)
        if not current_default_route_list:
            continue

        # Check if the node entry exists in default_route_current table
        if not await _node_entry_exists(network_name, node_name):
            # Since node entry does not exist in the db, add it to both tables
            logging.info(
                f"Adding routes information for {node_name} "
                f"from {network_name} to the database"
            )
            async with MySQLClient().lease() as conn:
                # Insert node data into default_route_history table
                history_table_query_id = await _insert_route_into_history_table(
                    conn,
                    network_name,
                    node_name,
                    now,
                    current_default_route_list,
                    wireless_link_set,
                )
                # Insert data into default_route_current table
                await _insert_entry_into_current_table(
                    conn, network_name, node_name, now, history_table_query_id
                )
                await conn.connection.commit()
        else:
            # Since node entry exist in the db, check if the route has changed.
            route_in_db: Dict = await _fetch_route_in_db(network_name, node_name)

            # If current route is different from last stored route, then
            # add node data in default_route_history table and
            # update entry in default_route_current
            if current_default_route_list != route_in_db:
                logging.info(
                    f"Route for {node_name} of {network_name} has changed! "
                    "Updating database."
                )
                logging.debug(f"Old route: {route_in_db}")
                logging.debug(f"New route: {current_default_route_list}")

                async with MySQLClient().lease() as conn:
                    # Insert node data into default_route_history table
                    history_table_query_id = await _insert_route_into_history_table(
                        conn,
                        network_name,
                        node_name,
                        now,
                        current_default_route_list,
                        wireless_link_set,
                    )
                    # Update data in default_route_current table
                    await _update_entry_in_current_table(
                        conn, network_name, node_name, now, history_table_query_id
                    )
                    await conn.connection.commit()
            else:
                # If current route has not changed, do nothing
                logging.debug(
                    f"Route for {node_name} of {network_name} has not changed!"
                )


async def _node_entry_exists(network_name: str, node_name: str) -> bool:
    """
    Check if the current node entry exists in `default_route_current` table.
    """
    query = select(
        [
            exists().where(
                DefaultRouteCurrent.node_name == node_name
                and DefaultRouteCurrent.topology_name == network_name
            )
        ]
    )
    logging.debug(f"Query to check if entry for {node_name} exists in db: {str(query)}")
    async with MySQLClient().lease() as conn:
        cursor = await conn.execute(query)
        node_entry_exists: Tuple[bool] = await cursor.fetchone()
    return node_entry_exists[0]


async def _fetch_route_in_db(network_name: str, node_name: str) -> Dict:
    """
    Fetch the last stored route entry for the current node from the database.
    """
    query = (
        select([DefaultRouteHistory.routes])
        .select_from(
            join(
                DefaultRouteCurrent,
                DefaultRouteHistory,
                DefaultRouteCurrent.current_route_id == DefaultRouteHistory.id,
            )
        )
        .where(
            DefaultRouteCurrent.node_name == node_name
            and DefaultRouteCurrent.topology_name == network_name
        )
        .order_by(desc(DefaultRouteCurrent.id))
        .limit(1)
    )
    logging.debug(f"Query for routes of {node_name} in database: {str(query)}")
    async with MySQLClient().lease() as conn:
        cursor = await conn.execute(query)
        route_in_db: Tuple(Dict) = await cursor.fetchone()
    return route_in_db[0]


async def _insert_route_into_history_table(
    conn: SAConnection,
    network_name: str,
    node_name: str,
    now: datetime,
    default_route_list: List[List],
    wireless_link_set: Set[Tuple[str, str]],
) -> int:
    """
    Insert current node in `default_route_history` table.
    """
    # Calculate the number of wireless hops from the node to pop
    # "hop_count" is the same for every route in default_route_list
    hop_count = 0
    for src, dst in zip(default_route_list[0], default_route_list[0][1:]):
        hop = tuple(sorted((src, dst)))
        if hop in wireless_link_set:
            hop_count += 1

    # Add node to default_route_history table
    query = insert(DefaultRouteHistory).values(
        topology_name=network_name,
        node_name=node_name,
        last_updated=now,
        routes=default_route_list,
        is_ecmp=len(default_route_list) > 1,
        hop_count=hop_count,
    )
    logging.debug(
        f"Query for inserting routes into history table for {node_name}: {str(query)}"
    )
    await conn.execute(query)

    # TODO: (spurav) T54333906 refactor default route service hackery
    cursor = await conn.execute("SELECT MAX(id) FROM default_route_history")
    history_table_query_id: Tuple[int] = await cursor.fetchone()
    return history_table_query_id[0]


async def _insert_entry_into_current_table(
    conn: SAConnection,
    network_name: str,
    node_name: str,
    now: datetime,
    history_table_query_id: int,
) -> None:
    """
    Insert current node in `default_route_current` table.
    """
    # Add node to default_route_current table
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


async def _update_entry_in_current_table(
    conn: SAConnection,
    network_name: str,
    node_name: str,
    now: datetime,
    history_table_query_id: int,
) -> None:
    """
    Update all columns of `default_route_current` table for the current node.
    """
    # Update node entry in default_route_current table
    query = (
        update(DefaultRouteCurrent)
        .values(
            topology_name=network_name,
            node_name=node_name,
            last_updated=now,
            current_route_id=history_table_query_id,
        )
        .where(
            DefaultRouteCurrent.node_name == node_name
            and DefaultRouteCurrent.topology_name == network_name
        )
    )
    logging.debug(
        f"Query for updating entry in current table for {node_name}: {str(query)}"
    )
    await conn.execute(query)


if __name__ == "__main__":
    try:
        with open("./service_config.json") as file:
            config = json.load(file)
    except OSError as err:
        logging.exception(f"Failed to parse service configuration file: {err}")
        sys.exit(1)

    init(lambda: main(config), {Client.API_SERVICE_CLIENT, Client.MYSQL_CLIENT})
