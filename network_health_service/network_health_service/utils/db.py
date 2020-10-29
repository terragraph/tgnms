#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

from typing import Dict, Iterable, List

from sqlalchemy import insert, select
from tglib.clients import MySQLClient

from ..models import NetworkStatsHealth


async def get_network_stats_health(network_name: str) -> Iterable:
    """Fetch latest entries from `network_stats_health` table."""
    async with MySQLClient().lease() as sa_conn:
        query = (
            select(
                [
                    NetworkStatsHealth.link_name,
                    NetworkStatsHealth.node_name,
                    NetworkStatsHealth.stats_health,
                ]
            )
            .group_by(
                NetworkStatsHealth.network_name,
                NetworkStatsHealth.link_name,
                NetworkStatsHealth.node_name,
                NetworkStatsHealth.stats_health,
            )
            .where(NetworkStatsHealth.network_name == network_name)
        )
        cursor = await sa_conn.execute(query)
        results: Iterable = await cursor.fetchall()
        return results


async def save_stats_health(to_db: List[Dict]) -> None:
    """Save stats health for all links and nodes of all networks."""
    async with MySQLClient().lease() as sa_conn:
        await sa_conn.execute(insert(NetworkStatsHealth).values(to_db))
        await sa_conn.connection.commit()
