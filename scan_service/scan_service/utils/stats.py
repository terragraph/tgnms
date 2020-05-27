#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import asyncio
import logging
import time
from collections import defaultdict
from typing import Dict, List, Optional

from terragraph_thrift.Topology.ttypes import LinkType
from tglib.clients import APIServiceClient
from tglib.clients.prometheus_client import PrometheusClient, consts
from tglib.exceptions import ClientRuntimeError


async def create_link_mac_map(network_name: str) -> Optional[Dict]:
    try:
        topology = await APIServiceClient(timeout=2).request(
            network_name, "getTopology"
        )
    except ClientRuntimeError:
        logging.exception(f"Failed to fetch topology for {network_name}")
        return None

    node_mac_map = {node["name"]: node["mac_addr"] for node in topology["nodes"]}
    link_mac_map: Dict = {}
    for link in topology["links"]:
        if link["link_type"] != LinkType.WIRELESS:
            continue

        a_node_mac = (
            link["a_node_mac"]
            if link["a_node_mac"]
            else node_mac_map[link["a_node_name"]]
        )
        z_node_mac = (
            link["z_node_mac"]
            if link["z_node_mac"]
            else node_mac_map[link["z_node_name"]]
        )

        if not a_node_mac or not z_node_mac:
            logging.error(
                f"Missing node MAC address for network_name: {network_name} ,"
                f"link: {link['name']}"
            )
            continue

        link_mac_map[PrometheusClient.normalize(link["name"])] = (
            a_node_mac,
            z_node_mac,
        )

    return link_mac_map


def reshape_values(values: Dict, link_mac_map: Dict) -> defaultdict:
    """Reshape the Prometheus results and map to other node's MAC address."""
    node_metrics: defaultdict = defaultdict(dict)
    other_node: str
    for metric, result in values.items():
        for link_result in result:
            node_pair = link_mac_map.get(link_result["metric"]["linkName"])
            if node_pair is None:
                logging.error(
                    f"Missing node_mac mapping for {link_result['metric']['linkName']}"
                )
                continue
            if link_result["metric"]["nodeMac"] == node_pair[0]:
                other_node = node_pair[1]
            elif link_result["metric"]["nodeMac"] == node_pair[1]:
                other_node = node_pair[0]
            else:
                logging.error(
                    "Incorrect node_mac mapping for "
                    f"{link_result['metric']['linkName']}"
                )
                continue
            node_metrics[other_node][metric] = link_result["values"][-1][1]
    return node_metrics


async def get_latest_stats(
    network_name: str,
    link_mac_map: Dict,
    node_mac: str,
    metrics: List[str],
    sample_period: int = 300,
    hold_period: int = 30,
) -> defaultdict:
    """Fetch latest metric values for all links in the network."""

    client = PrometheusClient(timeout=2)
    coros = []
    curr_time = int(time.time())
    for metric in metrics:
        coros.append(
            client.query_range(
                client.format_query(
                    metric, {consts.network: network_name, consts.node_mac: node_mac}
                ),
                step=f"{hold_period+1}s",
                start=curr_time - sample_period,
                end=curr_time,
            )
        )

    values: Dict = {}
    for metric_name, response in zip(
        metrics, await asyncio.gather(*coros, return_exceptions=True)
    ):
        if isinstance(response, ClientRuntimeError):
            logging.error(response)
            continue

        if response["status"] != "success":
            logging.error(f"Failed to fetch {metric_name} data for {node_mac}")
            continue

        result = response["data"]["result"]
        if not result:
            logging.error(f"Found no results for {metric}")
        else:
            values[metric_name] = result

    return reshape_values(values, link_mac_map)
