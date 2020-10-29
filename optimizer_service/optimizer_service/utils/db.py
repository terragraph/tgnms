#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

from collections import defaultdict
from typing import DefaultDict, Dict, Iterable, List

from sqlalchemy import func, insert, select
from tglib.clients import MySQLClient

from ..models import CutEdgeOverridesConfig


async def get_previous_overrides_configs(networks: Iterable) -> DefaultDict:
    """
    Get latest entries of previous overrides config for all nodes in cut edges
    of each network from the db.
    """
    previous_overrides_config: DefaultDict = defaultdict(dict)
    async with MySQLClient().lease() as sa_conn:
        query = select(
            [
                CutEdgeOverridesConfig.network_name,
                CutEdgeOverridesConfig.node_name,
                CutEdgeOverridesConfig.link_flap_backoff_ms,
                CutEdgeOverridesConfig.link_impairment_detection,
            ]
        ).where(
            (
                CutEdgeOverridesConfig.id.in_(
                    select([func.max(CutEdgeOverridesConfig.id)]).group_by(
                        CutEdgeOverridesConfig.network_name,
                        CutEdgeOverridesConfig.node_name,
                    )
                )
            )
            & (CutEdgeOverridesConfig.network_name.in_(networks))
        )

        cursor = await sa_conn.execute(query)
        for row in await cursor.fetchall():
            previous_overrides_config[row.network_name][row.node_name] = {
                "link_flap_backoff_ms": row.link_flap_backoff_ms,
                "link_impairment_detection": row.link_impairment_detection,
            }

    return previous_overrides_config


async def insert_overrides_configs(entries_to_insert: List[Dict]) -> None:
    """Save all node overrides configs."""
    if not entries_to_insert:
        return

    async with MySQLClient().lease() as conn:
        query = insert(CutEdgeOverridesConfig).values(entries_to_insert)
        await conn.execute(query)
        await conn.connection.commit()


async def delete_node_entries(entries_to_delete: Dict) -> None:
    """Delete all entries for the given nodes of the network."""
    if not entries_to_delete:
        return

    async with MySQLClient().lease() as conn:
        query = CutEdgeOverridesConfig.__table__.delete().where(
            CutEdgeOverridesConfig.network_name.in_(entries_to_delete["networks"])
            & CutEdgeOverridesConfig.node_name.in_(entries_to_delete["nodes"])
        )
        await conn.execute(query)
        await conn.connection.commit()
