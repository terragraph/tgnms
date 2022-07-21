#!/usr/bin/env python3

# Copyright (c) Meta Platforms, Inc. and affiliates.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

import asyncio
import logging

from elasticsearch import AsyncElasticsearch
from sqlalchemy import insert
from typing import Any, DefaultDict, Dict, List, Tuple

from tglib.clients import MySQLClient

from .crash_details import CrashDetails
from .crash_key import CrashKey
from ..models import CrashAnalysisResults


def get_prometheus_label_from_key(key: CrashKey) -> Dict[str, str]:
    label: Dict[str, str] = {}
    if key.crash_time is not None:
        label["crash_time"] = key.crash_time
    if key.crash_type is not None:
        label["crash_type"] = key.crash_type
    if key.node_id is not None:
        label["node_id"] = key.node_id
    if key.application is not None:
        label["application"] = key.application
    return label


async def get_crash_logs_from_elasticsearch(
    start_time_ms: int, indexes: List[str], es: AsyncElasticsearch
) -> Dict[Tuple[str, str, str], List[str]]:
    """Get the application crash logs from elasticsearch"""

    # map from (node_name, log_file, timestamp) -> log
    crash_logs: Dict[Tuple[str, str, str], List[str]] = {}
    # query to find application logs
    # from the last 1 minute
    body = {
        "query": {"range": {"@timestamp": {"gte": "now-1m", "lt": "now"}}},
        "size": 2000,  # estimate for the max number of logs within 1 min
        "_source": ["mac_addr", "node_name", "log", "log_file", "@timestamp"],
    }
    results = await asyncio.gather(
        *[es.search(index=index, body=body) for index in indexes]
    )
    for result in results:
        for hit in result["hits"]["hits"]:
            hit_source = hit["_source"]
            # Assumes that hit[log] is a string and not a list of strings
            logging.debug(
                f"Queried Elastic Search logs from {hit_source['node_name']}/{hit_source['log_file']}"
            )
            crash_logs.setdefault(
                (
                    hit_source["node_name"],
                    hit_source["log_file"],
                    hit_source["@timestamp"],
                ),
                [],
            ).append(hit_source["log"])

    return crash_logs


async def save_crash_details_to_db(crash_details: List[CrashDetails]) -> None:
    """Add a new crashes to the DB."""
    values = []
    for crash in crash_details:
        values.append(
            {
                "node_id": crash.node_id,
                "crash_type": crash.crash_type,
                "crash_time": crash.crash_time,
                "application": crash.application,
                "affected_function": crash.affected_function,
                "affected_lines": "".join(crash.affected_lines),
            }
        )

    if values:
        async with MySQLClient().lease() as sa_conn:
            insert_crash_query = insert(CrashAnalysisResults).values(values)

            await sa_conn.execute(insert_crash_query)
            await sa_conn.connection.commit()
            logging.info(f"Added {len(values)} crash(es) to the database.")
