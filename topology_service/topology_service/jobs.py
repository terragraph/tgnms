#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import logging
from datetime import datetime
from typing import Any, Dict

from geopy.distance import distance
from sqlalchemy import func, insert, select
from terragraph_thrift.Topology.ttypes import LinkType, NodeStatusType, NodeType
from tglib.clients import MySQLClient, PrometheusClient
from tglib.clients.prometheus_client import PrometheusMetric, consts

from .models import TopologyHistory
from .utils import sanitize_topology


async def save_latest_topologies(
    start_time_ms: int, topologies: Dict[str, Dict[str, Any]]
) -> None:
    """Sanitize each topology and save the contents in the database."""
    if not topologies:
        return
    for topology in topologies.values():
        sanitize_topology(topology)

    async with MySQLClient().lease() as sa_conn:
        # Get the latest copy of each valid network's topology to compare
        query = select([TopologyHistory.network_name, TopologyHistory.topology]).where(
            (
                TopologyHistory.id.in_(
                    select([func.max(TopologyHistory.id)]).group_by(
                        TopologyHistory.network_name
                    )
                )
            )
            & (TopologyHistory.network_name.in_(topologies.keys()))
        )

        cursor = await sa_conn.execute(query)
        last_updated = datetime.utcfromtimestamp(start_time_ms / 1e3)

        values = []
        for row in await cursor.fetchall():
            # Compare the latest recorded topology with the current one
            if row.topology == topologies[row.network_name]:
                logging.debug(f"{row.network_name} is unchanged")
            else:
                logging.info(f"The topology for {row.network_name} changed")
                values.append(
                    {
                        "network_name": row.network_name,
                        "topology": topologies[row.network_name],
                        "last_updated": last_updated,
                    }
                )

            del topologies[row.network_name]

        # Add all newly seen networks
        for network_name, topology in topologies.items():
            logging.info(f"New network found: {network_name}")
            values.append(
                {
                    "network_name": network_name,
                    "topology": topology,
                    "last_updated": last_updated,
                }
            )

        if values:
            query = insert(TopologyHistory).values(values)
            await sa_conn.execute(query)
            await sa_conn.connection.commit()


async def count_network_assets(
    start_time_ms: int, topologies: Dict[str, Dict[str, Any]]
) -> None:
    """Take stock of all topologies and write stats to the timeseries database."""
    if not topologies:
        return

    metrics = []
    for network_name, topology in topologies.items():
        # Save site location information for link distance calculation later
        site_name_to_loc = {}
        for site in topology["sites"]:
            site_name_to_loc[site["name"]] = site["location"]

        # Count node stats
        network_labels = {consts.network: network_name}
        nodes_total = len(topology["nodes"])
        online_nodes_total = 0
        pop_nodes_total = 0
        node_name_to_node = {}
        for node in topology["nodes"]:
            node_name_to_node[node["name"]] = node
            if node["status"] != NodeStatusType.OFFLINE:
                online_nodes_total += 1
            if node["pop_node"]:
                pop_nodes_total += 1

            # Add node stats
            node_labels = {
                **network_labels,
                consts.node_mac: node["mac_addr"],
                consts.node_name: PrometheusClient.normalize(node["name"]),
                consts.is_pop: node["pop_node"],
                consts.is_cn: node["node_type"] == NodeType.CN,
                consts.site_name: PrometheusClient.normalize(node["site_name"]),
            }
            metrics.append(
                PrometheusMetric(
                    name="topology_node_is_online",
                    labels=node_labels,
                    value=int(node["status"] != NodeStatusType.OFFLINE),
                    time=start_time_ms,
                )
            )

        # Count link stats
        online_wireless_links_total = 0
        wireless_links_total = 0
        for link in topology["links"]:
            if link["link_type"] != LinkType.WIRELESS:
                continue
            wireless_links_total += 1
            if link["is_alive"]:
                online_wireless_links_total += 1

            a_node = node_name_to_node[link["a_node_name"]]
            a_loc = site_name_to_loc[a_node["site_name"]]
            z_node = node_name_to_node[link["z_node_name"]]
            z_loc = site_name_to_loc[z_node["site_name"]]

            # Add link stats
            link_labels = {
                **network_labels,
                consts.link_name: PrometheusClient.normalize(link["name"]),
                consts.is_cn: (
                    a_node["node_type"] == NodeType.CN
                    or z_node["node_type"] == NodeType.CN
                ),
            }
            metrics += [
                PrometheusMetric(
                    name="topology_link_is_online",
                    labels=link_labels,
                    value=int(link["is_alive"]),
                    time=start_time_ms,
                ),
                PrometheusMetric(
                    name="topology_link_attempts",
                    labels=link_labels,
                    value=link["linkup_attempts"],
                    time=start_time_ms,
                ),
                PrometheusMetric(
                    name="topology_link_distance_meters",
                    labels=link_labels,
                    value=distance(
                        (a_loc["latitude"], a_loc["longitude"], a_loc["altitude"]),
                        (z_loc["latitude"], z_loc["longitude"], z_loc["altitude"]),
                    ).m,
                    time=start_time_ms,
                ),
            ]

        # Add network stats
        metrics += [
            PrometheusMetric(
                name="topology_nodes_total",
                labels=network_labels,
                value=nodes_total,
                time=start_time_ms,
            ),
            PrometheusMetric(
                name="topology_online_nodes_total",
                labels=network_labels,
                value=online_nodes_total,
                time=start_time_ms,
            ),
            PrometheusMetric(
                name="topology_online_nodes_ratio",
                labels=network_labels,
                value=online_nodes_total / nodes_total,
                time=start_time_ms,
            ),
            PrometheusMetric(
                name="topology_pop_nodes_total",
                labels=network_labels,
                value=pop_nodes_total,
                time=start_time_ms,
            ),
            PrometheusMetric(
                name="topology_wireless_links_total",
                labels=network_labels,
                value=wireless_links_total,
                time=start_time_ms,
            ),
            PrometheusMetric(
                name="topology_online_wireless_links_total",
                labels=network_labels,
                value=online_wireless_links_total,
                time=start_time_ms,
            ),
            PrometheusMetric(
                name="topology_online_wireless_links_ratio",
                labels=network_labels,
                value=online_wireless_links_total / wireless_links_total,
                time=start_time_ms,
            ),
        ]

    # Write the metrics to memory
    PrometheusClient.write_metrics(scrape_interval="30s", metrics=metrics)
