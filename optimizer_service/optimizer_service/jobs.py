#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import asyncio
import logging
from typing import Dict, List, Optional

from tglib.clients import APIServiceClient
from tglib.exceptions import ClientRuntimeError

from .optimizations.auto_remediation import run_auto_remediation
from .optimizations.config_operations import process_cut_edges, run_tideal_optimization


async def cut_edge_finder(
    start_time: int,
    window_s: int,
    config_change_delay_s: int,
    link_flap_backoff_ms: str,
    link_impairment_detection: int,
    link_uptime_threshold: Optional[float] = None,
) -> None:
    """
    Use `getTopology` API request to fetch the latest topology
    Find all the edges that cut off one or more CNs and change link flap backoff and
    link impairment detection configs on them
    """
    logging.info("Fetching topologies for all networks from API service")
    client = APIServiceClient(timeout=2)
    topologies = await client.request_all("getTopology", return_exceptions=True)
    for network_name, topology in list(topologies.items()):
        if isinstance(topology, ClientRuntimeError):
            logging.error(f"Failed to fetch topology for {network_name}")
            del topologies[network_name]

    await process_cut_edges(
        topologies,
        window_s,
        link_flap_backoff_ms,
        link_impairment_detection,
        config_change_delay_s,
        link_uptime_threshold,
    )


async def configure_tideals(
    start_time: int,
    topologies: Dict,
    wireless_capacity_mbps: int,
    wired_capacity_mbps: int,
) -> None:
    """Run tideal optimization for each topology and apply optimized tideal configs."""
    client = APIServiceClient(timeout=2)
    topologies = await client.request_all("getTopology", return_exceptions=True)
    coroutines = []
    for network_name, topology in list(topologies.items()):
        if isinstance(topology, ClientRuntimeError):
            logging.error(f"Failed to fetch topology for {network_name}")
            del topologies[network_name]
            continue
        overrides_all = run_tideal_optimization(
            topology, wireless_capacity_mbps, wired_capacity_mbps
        )
        if overrides_all is None:
            del topologies[network_name]
            continue

        coroutines.append(
            client.request(
                endpoint="modifyNodeOverridesConfig",
                network_name=network_name,
                params=overrides_all,
            )
        )

    for network_name, response in zip(
        topologies, await asyncio.gather(*coroutines, return_exceptions=True)
    ):
        if isinstance(response, ClientRuntimeError) or not response.get("success"):
            logging.error(
                "Failed to modify txIdeal and rxIdeal config overrides for "
                f"{network_name}"
            )


async def configure_auto_remediation(
    start_time: int,
    window_s: int,
    max_num_of_backup_links: int,
) -> None:
    """
    Find several backup links in a topology and update the information to the topology.

    Keyword arguments:
    max_num_of_backup_links -- maximum number of backup links you want to add
    """
    logging.info("Starting analysis and addition of backup links")
    topologies = await APIServiceClient(timeout=2).request_all(
        "getTopology", return_exceptions=True
    )
    coros: List = []
    for network_name, topology in list(topologies.items()):
        # Step 1: load topology file
        if isinstance(topology, ClientRuntimeError):
            logging.error(f"Failed to fetch topology for {network_name}")
            del topologies[network_name]
            continue

        # Step 2: run auto-remediation
        coros += [
            run_auto_remediation(
                start_time, window_s, max_num_of_backup_links, network_name, topology
            )
        ]

    await asyncio.gather(*coros, return_exceptions=True)
