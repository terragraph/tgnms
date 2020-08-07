#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import asyncio
import logging
import time
from collections import defaultdict
from typing import DefaultDict, Dict, List

from tglib.clients.prometheus_client import PrometheusClient, consts
from tglib.exceptions import ClientRuntimeError

from .topology import Topology


def reshape_values(network_name: str, values: Dict) -> DefaultDict:
    """Reshape the Prometheus results and map to other node's MAC address."""
    node_metrics: DefaultDict = defaultdict(dict)
    other_node: str
    for metric, result in values.items():
        for link_result in result:
            node_pair = Topology.link_name_to_mac[network_name].get(
                link_result["metric"]["linkName"]
            )
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
    node_mac: str,
    metrics: List[str],
    sample_period: int = 300,
    hold_period: int = 30,
) -> DefaultDict:
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

    return reshape_values(network_name, values)
