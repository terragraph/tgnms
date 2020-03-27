#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import asyncio
import logging
from collections import defaultdict
from datetime import datetime
from typing import Dict, List, Optional, Set, Tuple

from terragraph_thrift.Topology.ttypes import LinkType, NodeType
from tglib.clients.prometheus_client import PrometheusClient, PrometheusMetric, consts

from .analysis import analyze_link_cn_routes, analyze_node
from .utils import DRS


async def analyze_routes(start_time: int, drs_objs: List[DRS]) -> None:
    """
    - Analyze default routes for each node of all networks. Determine if the routes have
    changed compared to the most recent entry in the database. Add entry to database
    if node entry does not exist.
    - Identify if the default routes are equal-cost multi-path and log the stat
    in time series database.
    - Compute the number of wireless hops for each node to its PoP and log the stat for
    that node in time series database.
    """
    now = datetime.now()
    coroutines = []
    metrics: List[PrometheusMetric] = []
    client = PrometheusClient(timeout=2)

    for drs in drs_objs:
        # create a set of all wireless links in the topology
        wireless_link_set = {
            (link["a_node_name"], link["z_node_name"])
            for link in drs.topology["links"]
            if link["link_type"] == LinkType.WIRELESS
        }

        for node_name, default_routes in drs.default_routes.items():
            logging.debug(
                f"node: {node_name}; topology name: {drs.network_name}, "
                f"routes: {default_routes}"
            )

            # compute the number of wireless hops for each node to it's PoP
            # record max 'hop_count' from all routes in default_routes.
            hop_count = 0
            if default_routes:
                for route in default_routes:
                    # calculate hop count for the route
                    route_hop_count = 0
                    for src, dst in zip(route, route[1:]):
                        hop = tuple(sorted((src, dst)))
                        if hop in wireless_link_set:
                            route_hop_count += 1
                    # record the max hop_count value
                    if route_hop_count > hop_count:
                        hop_count = route_hop_count

            labels = {consts.network: drs.network_name, consts.node_name: node_name}
            metrics += [
                PrometheusMetric(
                    name="default_routes_wireless_hop_total",
                    labels=labels,
                    value=hop_count,
                ),
                PrometheusMetric(
                    name="default_routes_node_has_ecmp",
                    labels=labels,
                    value=int(len(default_routes) > 1),
                ),
            ]

            coroutines.append(
                analyze_node(
                    drs.network_name, node_name, now, default_routes, hop_count
                )
            )

    # push all stats to internal buffer
    client.write_metrics(scrape_interval="30s", metrics=metrics)

    # analyze default routes for all nodes
    await asyncio.gather(*coroutines)


async def compute_link_cn_routes(start_time: int, drs_objs: List[DRS]) -> None:
    """
    Compute the number of CN routes that pass through each link of all networks.
    Write number of CN routes to timeseries db and CN routes to SQL database.
    """
    now = datetime.now()
    coroutines = []
    metrics: List[PrometheusMetric] = []
    client = PrometheusClient(timeout=2)

    for drs in drs_objs:
        logging.info(f"Calculating link CN routes for {drs.network_name}.")

        # set of CN nodes
        cn_nodes = {
            node["name"]
            for node in drs.topology["nodes"]
            if node["node_type"] == NodeType.CN
        }
        logging.debug(f"There are {len(cn_nodes)} CN node(s) in {drs.network_name}")

        # save the links in all CN routes
        cn_links: Dict[Tuple, Set] = defaultdict(set)
        for node_name, default_routes in drs.default_routes.items():
            if node_name in cn_nodes:
                for route in default_routes:
                    for src, dst in zip(route, route[1:]):
                        cn_links[tuple(sorted((src, dst)))].add(node_name)

        # calculate number of CN routes that pass through each wireless link
        for link in drs.topology["links"]:
            if link["link_type"] == LinkType.WIRELESS:
                link_hop: Tuple = (link["a_node_name"], link["z_node_name"])

                # get all CN routes that pass through the link
                link_cn_nodes: Optional[Set] = cn_links.get(link_hop)
                cn_routes: List = [
                    drs.default_routes[node_name] for node_name in link_cn_nodes
                ] if link_cn_nodes is not None else []

                labels = {
                    consts.network: drs.network_name,
                    consts.link_name: link["name"],
                }
                metrics.append(
                    PrometheusMetric(
                        name="default_routes_cn_routes_total",
                        labels=labels,
                        value=len(cn_routes),
                    )
                )

                coroutines.append(
                    analyze_link_cn_routes(
                        drs.network_name, now, link["name"], cn_routes
                    )
                )

    # push link CN routes count stats to internal buffer
    client.write_metrics(scrape_interval="30s", metrics=metrics)

    # analyze and write CN routes to SQL database
    await asyncio.gather(*coroutines)
