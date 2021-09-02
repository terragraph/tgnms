#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import asyncio
import logging

from elasticsearch import AsyncElasticsearch
from typing import Any, DefaultDict, Dict, List, Tuple

from .crash_key import CrashKey


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
) -> Dict[Tuple[str, str], List[str]]:
    """Get the application crash logs from elasticsearch"""

    # map from (node_name, log_file) -> log
    crash_logs: Dict[Tuple[str, str], List[str]] = {}
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
            crash_logs.setdefault(
                (hit_source["node_name"], hit_source["log_file"]), []
            ).append(hit_source["log"])

    return crash_logs
