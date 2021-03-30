#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import asyncio
import json
import logging
from datetime import datetime
from typing import Dict, List

import aiohttp
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


async def fetch_scan_stats(
    network_name: str,
    time_s: int,
    interval_s: int,
    link_stats: Dict,
    conn_list: List,
    session: aiohttp.ClientSession,
) -> None:
    """
    Fetch inr_curr_power metric for all links of the network from scan service.

    This function is copied from network_health_service/stats/fetch_stats.py
    """
    try:
        url = "http://scan_service:8080/execution"
        start_dt_iso = datetime.fromtimestamp(time_s - interval_s).isoformat()
        end_dt_iso = datetime.fromtimestamp(time_s).isoformat()
        params = {
            "network_name": network_name,
            "status": "finished",
            "start_dt": start_dt_iso,
        }
        async with session.get(url, params=params) as resp:
            if resp.status != 200:
                logging.error(f"Request to {url} failed: {resp.reason} ({resp.status})")
                return None

            executions = json.loads(await resp.read())
            if not executions or not executions["executions"]:
                logging.error(
                    f"Scan service - No scan execution data found for {network_name} "
                    f"between {start_dt_iso} and {end_dt_iso}."
                )
                return None

        latest_execution_id = max(row["id"] for row in executions["executions"])
        url = f"{url}/{latest_execution_id}"
        async with session.get(url) as resp:
            if resp.status != 200:
                logging.error(f"Request to {url} failed: {resp.reason} ({resp.status})")
                return None

            # TODO: change to use averaged_connectivity in the next version
            results = json.loads(await resp.read())
            for _response_id, response in results["results"].items():
                conn_list += response.get("connectivity", [])

            if "n_day_avg" not in results["aggregated_inr"]:
                logging.warning(
                    f"Scan service - No interference data found for {network_name}."
                )
                return None

            for link_name, directions in results["aggregated_inr"]["n_day_avg"].items():
                inr_max = max(d["inr_curr_power"] for d in directions)
                link_stats[network_name][link_name]["interference"] = inr_max
    except (aiohttp.ClientError, asyncio.TimeoutError) as err:
        logging.error(f"Request to {url} for {network_name} failed: {err}")
