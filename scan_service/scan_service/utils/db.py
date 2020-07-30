#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

from datetime import datetime, timedelta
from typing import Any, Dict, Iterable, List, Optional

from sqlalchemy import insert, select, update
from sqlalchemy.ext.declarative import DeclarativeMeta
from tglib.clients import MySQLClient

from ..models import (
    AggregatedRxResponses,
    ConnectivityResults,
    InterferenceResults,
    ScanResults,
)


async def fetch_aggregated_responses(
    network_name: str, tx_node: str, n_days: int
) -> Iterable:
    """Fetch all entries from `aggregated_rx_responses` table in past N days"""
    async with MySQLClient().lease() as sa_conn:
        query = select(
            [AggregatedRxResponses.rx_node, AggregatedRxResponses.stats]
        ).where(
            (AggregatedRxResponses.network_name == network_name)
            & (AggregatedRxResponses.tx_node == tx_node)
            & (
                AggregatedRxResponses.created_dt
                > (datetime.now() - timedelta(days=n_days))
            )
        )
        cursor = await sa_conn.execute(query)
        results: Iterable = await cursor.fetchall()
        return results


async def write_results(
    execution_id: int,
    network_name: str,
    token: int,
    scan_results: Dict[str, Any],
    connectivity_results: Optional[List[Dict]],
    interference_results: Optional[List[Dict]],
    aggregated_rx_responses: Optional[List[Dict]],
) -> None:
    """Write results to the database"""
    async with MySQLClient().lease() as conn:

        async def insert_results(table: DeclarativeMeta, results: List[Dict]) -> None:
            await conn.execute(
                insert(table).values(
                    [
                        {
                            "execution_id": execution_id,
                            "network_name": network_name,
                            **result,
                        }
                        for result in results
                    ]
                )
            )

        await conn.execute(
            update(ScanResults)
            .where(
                (ScanResults.execution_id == execution_id)
                & (ScanResults.token == token)
            )
            .values(scan_results)
        )
        if connectivity_results:
            await insert_results(ConnectivityResults, connectivity_results)
        if interference_results:
            await insert_results(InterferenceResults, interference_results)
        if aggregated_rx_responses:
            await insert_results(AggregatedRxResponses, aggregated_rx_responses)
        await conn.connection.commit()
