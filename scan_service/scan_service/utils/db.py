#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

from typing import Any, Dict, List, Optional

from sqlalchemy import insert, update
from tglib.clients import MySQLClient

from ..models import ConnectivityResults, InterferenceResults, ScanResults


async def write_results(
    execution_id: int,
    token: int,
    scan_results: Dict[str, Any],
    connectivity_results: Optional[List[Dict]],
    interference_results: Optional[List[Dict]],
) -> None:
    """Write scan results, connectivity and interference results to database"""
    async with MySQLClient().lease() as conn:
        await conn.execute(
            update(ScanResults)
            .where(
                (ScanResults.execution_id == execution_id)
                & (ScanResults.token == token)
            )
            .values(scan_results)
        )
        if connectivity_results:
            await conn.execute(insert(ConnectivityResults).values(connectivity_results))
        if interference_results:
            await conn.execute(insert(InterferenceResults).values(interference_results))
        await conn.connection.commit()
