#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import asyncio
import logging
from collections import defaultdict
from typing import DefaultDict, Dict

import aiohttp
from tglib.clients import APIServiceClient

from .stats.fetch_stats import (
    fetch_network_link_health,
    fetch_network_node_health,
    fetch_prometheus_stats,
    fetch_query_link_avail,
    fetch_scan_stats,
)


async def generate_network_health_labels(time_s: int, period_s: int) -> None:
    network_names = APIServiceClient.network_names()
    coros = []
    link_stats: Dict[str, DefaultDict] = {}
    node_stats: Dict[str, DefaultDict] = {}
    async with aiohttp.ClientSession() as session:
        for name in network_names:
            link_stats[name] = defaultdict(lambda: defaultdict())
            node_stats[name] = defaultdict(lambda: defaultdict())
            coros += [
                fetch_network_link_health(name, time_s, period_s, link_stats, session),
                fetch_network_node_health(name, time_s, period_s, node_stats, session),
                fetch_prometheus_stats(name, time_s, period_s, link_stats, node_stats),
                fetch_scan_stats(name, time_s, period_s, link_stats, session),
                fetch_query_link_avail(name, period_s, link_stats, session),
            ]
        await asyncio.gather(*coros, return_exceptions=True)
