#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import logging
from datetime import datetime
from typing import Dict, List

from aiomysql.sa.result import RowProxy
from sqlalchemy import insert, select
from tglib.clients import MySQLClient

from .models import Topology


async def fetch_topologies(topology_name: str, limit: int = 1) -> List[RowProxy]:
    """
    Fetch topology entries from the database.
    """
    query = (
        select([Topology.topology])
        .where(Topology.name == topology_name)
        .order_by(Topology.id.desc())
        .limit(limit)
    )
    logging.debug(f"Query for topology of {topology_name} in database: {str(query)}")

    async with MySQLClient().lease() as conn:
        cursor = await conn.execute(query)
        results: List[RowProxy] = await cursor.fetchall()
        return results


async def insert_topology(topology: Dict, now: datetime) -> None:
    """
    Insert topology in `topology` table.
    """
    logging.info(f"Adding topology information for {topology['name']} to the database.")
    # add topology to topology table
    query = insert(Topology).values(
        name=topology["name"], topology=topology, datetime=now
    )
    logging.debug(
        "Query for inserting entry into topology table "
        f"for {topology['name']}: {str(query)}"
    )
    async with MySQLClient().lease() as conn:
        await conn.execute(query)
        await conn.connection.commit()
