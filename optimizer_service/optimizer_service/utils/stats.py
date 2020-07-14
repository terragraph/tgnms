#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import logging
from typing import Dict

from tglib.clients.prometheus_client import PrometheusClient, consts, ops
from tglib.exceptions import ClientRuntimeError


async def get_link_status(topology: Dict, window_s: int) -> Dict[str, float]:
    """Get status of links for a network topology.

    Read Prometheus timeseries database using network_name
    and calculate the average uptime for each link.
    """
    client = PrometheusClient(timeout=2)
    active_links: Dict = {}
    labels = {consts.network: topology["name"]}
    query = ops.avg_over_time(
        client.format_query("link_online", labels), f"{window_s}s"
    )
    logging.debug(f"Prometheus query: {query}")
    try:
        response = await client.query_latest(query)
        if response["status"] != "success":
            logging.error(f"Prometheus did not return success {response}")
            return active_links
    except ClientRuntimeError:
        logging.exception("Error reading Prometheus query")
        return active_links
    output = response["data"]["result"]

    # Uptime of each link from the query response
    for link in output:
        active_links[link["metric"]["linkName"]] = float(link["value"][1])
    return active_links
