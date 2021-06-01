#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import asyncio
from collections import defaultdict
from typing import Any, DefaultDict, Dict, List, Tuple

from terragraph_thrift.Topology.ttypes import LinkType, NodeType
from tglib.clients.prometheus_client import PrometheusClient, PrometheusMetric, consts

from .utils.db import save_cn_egress_routes, save_default_routes
from .utils.stats import generate_min_mcs_metrics


async def process_default_routes(
    start_time_ms: int, network_info: Dict[str, Dict[str, Any]]
) -> None:
    """Produce timeseries metrics and saves default route changes to the db.

    This job counts the number of wireless hops in all the default routes
    for a given node. It then produces three metrics per node:

    1. The total number of default routes.
    2. The maximum number of wireless hops across all default routes.
    3. Binary representation of default routes change from the last job's iteration.

    Finally, the default routes are saved in the database if they differ from
    the last job's iteration.
    """
    if not network_info:
        return

    metrics: List[PrometheusMetric] = []
    curr_routes: Dict[str, Dict[str, Tuple[List[List[str]], int]]] = {}
    for network_name, info in network_info.items():
        if "defaultRoutes" not in info:
            continue

        # Save wireless links for wireless hop count calculation below
        wireless_link_set = {
            (link["a_node_name"], link["z_node_name"])
            for link in info["links"]
            if link["link_type"] == LinkType.WIRELESS
        }

        curr_routes[network_name] = {}
        for node_name, default_routes in info["defaultRoutes"].items():
            max_hop_count = 0
            for route in default_routes:
                curr_hop_count = 0
                for src, dst in zip(route, route[1:]):
                    hop = tuple(sorted((src, dst)))
                    if hop in wireless_link_set:
                        curr_hop_count += 1

                if curr_hop_count > max_hop_count:
                    max_hop_count = curr_hop_count

            # Create Prometheus metrics
            labels = {
                consts.network: network_name,
                consts.node_name: node_name,
            }
            metrics += [
                PrometheusMetric(
                    name="drs_max_wireless_hop_count",
                    labels=labels,
                    value=max_hop_count,
                    time=start_time_ms,
                ),
                PrometheusMetric(
                    name="drs_default_routes_count",
                    labels=labels,
                    value=len(default_routes),
                    time=start_time_ms,
                ),
            ]

            curr_routes[network_name][node_name] = (default_routes, max_hop_count)

    # Write the latest information to the database and get routes changes
    routes_changes = await save_default_routes(start_time_ms, curr_routes)

    for network_name, node_data in routes_changes.items():
        for node_name, routes_change in node_data.items():
            labels = {consts.network: network_name, consts.node_name: node_name}
            metrics += [
                PrometheusMetric(
                    name="drs_default_routes_changed",
                    labels=labels,
                    value=int(routes_change),
                    time=start_time_ms,
                )
            ]

    # Write metrics to memory
    PrometheusClient.write_metrics(metrics)


async def process_congested_cn_egress_links(
    start_time_ms: int, network_info: Dict[str, Dict[str, Any]]
) -> None:
    """Produces timeseries metrics and saves changes in link congestion to the db.

    This job counts the number of default routes belonging to client nodes (CNs)
    that traverse across each wireless link in the network and pushes that metric to
    the timeseries db.

    Finally, the default routes are saved in the database if they differ from the last
    job's iteration.
    """
    if not network_info:
        return

    metrics = []
    curr_routes: Dict[str, DefaultDict[str, List[List[str]]]] = {}
    for network_name, info in network_info.items():
        if "defaultRoutes" not in info:
            continue

        # Save wireless links and client nodes
        wireless_link_map: Dict[Tuple, str] = {
            (link["a_node_name"], link["z_node_name"]): link["name"]
            for link in info["links"]
            if link["link_type"] == LinkType.WIRELESS
        }

        cn_node_set = {
            node["name"] for node in info["nodes"] if node["node_type"] == NodeType.CN
        }

        curr_routes[network_name] = defaultdict(list)
        for node_name, default_routes in info["defaultRoutes"].items():
            if node_name not in cn_node_set:
                continue

            for route in default_routes:
                for src, dst in zip(route, route[1:]):
                    hop: Tuple = tuple(sorted((src, dst)))
                    if hop not in wireless_link_map:
                        continue

                    link_name = wireless_link_map[hop]
                    curr_routes[network_name][link_name].append(route)

        # Create Prometheus metrics
        network_labels = {consts.network: network_name}
        for link_name in wireless_link_map.values():
            link_labels = {
                **network_labels,
                consts.link_name: link_name,
            }
            metrics.append(
                PrometheusMetric(
                    name="drs_cn_egress_routes_count",
                    labels=link_labels,
                    value=len({r[0] for r in curr_routes[network_name][link_name]}),
                    time=start_time_ms,
                )
            )

    # Write metrics to memory
    PrometheusClient.write_metrics(metrics)

    # Write the latest information to the database
    await save_cn_egress_routes(start_time_ms, curr_routes)


async def process_min_mcs_links(
    start_time_ms: int, network_info: Dict[str, Dict[str, Any]]
) -> None:
    """Produces timeseries metrics for link with minimum mcs in default_routes.

    This job finds the minimum mcs of all the wireless links part of the
    default routes of a node and pushes that metric to the timeseries db.
    """
    if not network_info:
        return

    coros = []
    client = PrometheusClient(timeout=2)
    for network_name, topology_info in network_info.items():
        if "defaultRoutes" not in topology_info:
            continue

        # Save wireless links
        wireless_link_map: Dict[Tuple, str] = {
            (link["a_node_name"], link["z_node_name"]): link["name"]
            for link in topology_info["links"]
            if link["link_type"] == LinkType.WIRELESS
        }

        coros.append(
            generate_min_mcs_metrics(
                start_time_ms, client, network_name, topology_info, wireless_link_map
            )
        )

    # Write metrics to memory
    metrics = [metric for metrics in await asyncio.gather(*coros) for metric in metrics]
    PrometheusClient.write_metrics(metrics)
