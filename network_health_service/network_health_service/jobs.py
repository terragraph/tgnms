#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import asyncio
import logging
from collections import defaultdict
from typing import DefaultDict, Dict, List, Any

import aiohttp
from sqlalchemy import insert, func
from tglib.clients import APIServiceClient, MySQLClient
from tglib.clients.prometheus_client import PrometheusClient, PrometheusMetric, consts

from .models import NetworkStatsHealth, NetworkHealthExecution
from .stats.fetch_stats import (
    fetch_network_link_health,
    fetch_network_node_health,
    fetch_prometheus_stats,
    fetch_query_link_avail,
    fetch_scan_stats,
)
from .stats.health import get_link_stats_health, get_node_stats_health


async def generate_network_health_labels(time_s: int, interval_s: int) -> None:
    network_names = APIServiceClient.network_names()
    coros: List = []
    link_stats: Dict[str, DefaultDict] = {}
    node_stats: Dict[str, DefaultDict] = {}
    async with aiohttp.ClientSession() as session:
        for name in network_names:
            link_stats[name] = defaultdict(lambda: defaultdict())
            node_stats[name] = defaultdict(lambda: defaultdict())
            coros += [
                fetch_network_link_health(
                    name, time_s, interval_s, link_stats, session
                ),
                fetch_network_node_health(
                    name, time_s, interval_s, node_stats, session
                ),
                fetch_prometheus_stats(
                    name, time_s, interval_s, link_stats, node_stats
                ),
                fetch_scan_stats(name, time_s, interval_s, link_stats, session),
                fetch_query_link_avail(name, interval_s, link_stats, session),
            ]
        await asyncio.gather(*coros, return_exceptions=True)

    async with MySQLClient().lease() as sa_conn:
        query = insert(NetworkHealthExecution).values(start_dt=func.now())
        execution_row = await sa_conn.execute(query)
        await sa_conn.connection.commit()
        execution_id = execution_row.lastrowid

    time = int(round(time_s * 1e3))
    to_db: List[Dict[str, Any]] = []
    metrics: List[PrometheusMetric] = []

    # Process all link stats
    for network_name, link_name_map in link_stats.items():
        for link_name, link_stats_map in link_name_map.items():
            bitmap, stats_health = get_link_stats_health(link_stats_map, interval_s)
            labels = {consts.network: network_name, consts.link_name: link_name}
            metrics += [
                PrometheusMetric("nhs_link_health_bitmap", labels, int(bitmap, 2), time)
            ]
            logging.debug(f"Bitmap for {link_name} of {network_name} is {bitmap}")

            to_db += [
                {
                    "execution_id": execution_id,
                    "network_name": network_name,
                    "link_name": link_name,
                    "node_name": None,
                    "stats_health": stats_health,
                }
            ]

    # Process all node stats
    for network_name, node_name_map in node_stats.items():
        for node_name, node_stats_map in node_name_map.items():
            bitmap, stats_health = get_node_stats_health(node_stats_map, interval_s)
            labels = {consts.network: network_name, consts.node_name: node_name}
            metrics += [
                PrometheusMetric("nhs_node_health_bitmap", labels, int(bitmap, 2), time)
            ]
            logging.debug(f"Bitmap for {node_name} of {network_name} is {bitmap}")

            to_db += [
                {
                    "execution_id": execution_id,
                    "network_name": network_name,
                    "link_name": None,
                    "node_name": node_name,
                    "stats_health": stats_health,
                }
            ]

    # Write bitmaps metrics to timeserise db
    PrometheusClient.write_metrics(metrics)

    # Write stats health to db
    if not to_db:
        return None
    async with MySQLClient().lease() as sa_conn:
        await sa_conn.execute(insert(NetworkStatsHealth).values(to_db))
        await sa_conn.connection.commit()
