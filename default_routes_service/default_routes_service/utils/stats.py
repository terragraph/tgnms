#!/usr/bin/env python3
# Copyright (c) 2014-present, Facebook, Inc.

import asyncio
import logging
from collections import defaultdict
from typing import DefaultDict, Dict, List, Tuple

from tglib.clients.prometheus_client import PrometheusClient, PrometheusMetric, consts
from tglib.exceptions import ClientRuntimeError


async def read_timeseries(
    client: PrometheusClient, query: str, query_time: int
) -> List:
    """Read latest metrics from Prometheus timeseries database.

    Returns Prometheus response which is a list of dictionaries
    each dict has 'metric' (collection of label/values) and
    'values' - a list of timestamp, value pairs (as a list).
    Returns [] if there was an error.
    """
    try:
        response = await client.query_latest(query=query, time=query_time)
        if response["status"] == "success":
            results: List = response["data"]["result"]
            return results
        logging.error(f"Prometheus did not return success '{response['status']}''")
    except ClientRuntimeError:
        logging.exception(f"Error reading {query} from prometheus")
    return []


async def generate_min_mcs_metrics(
    start_time_ms: int,
    client: PrometheusClient,
    network_name: str,
    info: Dict,
    wireless_link_map: Dict,
) -> List[PrometheusMetric]:
    """Fetch mcs for links in default routes and create corresponding min mcs metric.

    Traverse through default routes of all nodes and fetch mcs metric for all its
    links. Then, find the link with the minimum mcs for each node.
    Return list of Prometheus metrics.
    """
    node_names, coros = [], []
    for node_name, default_routes in info["defaultRoutes"].items():
        for route in default_routes:
            for a_node, z_node in zip(route, route[1:]):
                hop: Tuple = tuple(sorted((a_node, z_node)))
                if hop not in wireless_link_map:
                    continue

                labels = {
                    consts.network: network_name,
                    consts.node_name: a_node,
                    consts.link_name: wireless_link_map[hop],
                    consts.data_interval_s: 1,
                }
                coros.append(
                    read_timeseries(
                        client,
                        PrometheusClient.format_query("mcs", labels),
                        int(start_time_ms / 1000),
                    )
                )
                node_names.append(node_name)

    node_min_mcs_map: DefaultDict = defaultdict(int)
    node_link_map = {}
    for node_name, responses in zip(node_names, await asyncio.gather(*coros)):
        for metric in responses:
            mcs = int(metric["value"][1])
            if node_min_mcs_map[node_name] == 0 or mcs < node_min_mcs_map[node_name]:
                node_min_mcs_map[node_name] = mcs
                node_link_map[node_name] = metric["metric"][consts.link_name]

    metrics = []
    for node_name, min_mcs in node_min_mcs_map.items():
        labels = {
            consts.network: network_name,
            consts.node_name: node_name,
            "minMcsLinkName": node_link_map[node_name],
        }
        metrics.append(
            PrometheusMetric(
                name="drs_min_route_mcs",
                labels=labels,
                value=min_mcs,
                time=start_time_ms,
            )
        )

    return metrics
