#!/usr/bin/env python3

# Copyright (c) Meta Platforms, Inc. and affiliates.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

import asyncio
import logging
from collections import defaultdict
from typing import DefaultDict, Dict, List, Tuple, Set

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


def make_joint_query(compound: List[str], joint_query: str, link_query: str) -> str:
    if joint_query:
        joint_query += " or "
    if len(compound) == 2 and compound[1] == "delta":
        # Hard-coding the delta [30s] part of this query for now.
        # Returns empty for 1s
        joint_query += f"({compound[1]}({link_query}[30s]))/30"
    else:
        joint_query += link_query
    return joint_query


async def generate_route_stats(
    start_time_ms: int,
    client: PrometheusClient,
    network_name: str,
    info: Dict,
    wireless_link_map: Dict,
    route_metrics: Dict,
) -> List[PrometheusMetric]:
    """Fetch mcs for links in default routes and create corresponding min mcs metric.

    Traverse through default routes of all nodes and fetch mcs metric for all its
    links. Then, find the link with the minimum mcs for each node.
    Return list of Prometheus metrics.
    """
    node_names: List[Tuple[str, str]] = []
    coros: List = []
    for node_name, default_routes in info["defaultRoutes"].items():
        link_queries: Dict[str, Set] = {
            metric: set() for metric in route_metrics.keys()
        }
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
                for metric in route_metrics.keys():
                    link_queries[metric].add(
                        str(PrometheusClient.format_query(metric, labels))
                    )
        for metric, aggregation in route_metrics.items():
            joint_query = ""
            # Support aggregation like "max/delta".
            compound = aggregation.split("/")
            for link_query in link_queries[metric]:
                joint_query = make_joint_query(compound, joint_query, link_query)
            if joint_query:
                if compound[0] in ["max", "min"]:
                    joint_query = f"{compound[0]}({joint_query})"
                else:
                    logging.info(
                        f"Unsupported aggregation function '{aggregation}' for {metric} ."
                    )
                    continue
                logging.debug(
                    f"Query for {(node_name, metric)} with routes {default_routes} is {joint_query}"
                )
                coros.append(
                    read_timeseries(client, joint_query, int(start_time_ms / 1000))
                )
                node_names.append((node_name, metric))
            else:
                logging.debug(
                    f"Query for {(node_name, metric)} with routes {default_routes} is empty"
                )
    logging.info(f"number of coros, {len(coros)}")
    write_metrics: List = []
    for node_name, output in zip(node_names, await asyncio.gather(*coros)):
        labels = {consts.network: network_name, consts.node_name: node_name[0]}
        value = int(float(output[0]["value"][1])) if output else None
        write_metrics.append(
            PrometheusMetric(
                name=f"drs_{route_metrics[node_name[1]].replace('/', '_')}_route_{node_name[1]}",
                labels=labels,
                value=value,
                time=start_time_ms,
            )
        )

    return write_metrics
