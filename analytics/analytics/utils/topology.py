#!/usr/bin/env python3

# Copyright (c) Meta Platforms, Inc. and affiliates.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

"""Provide topology utility functions.

This module provides functions which can read the topology from the API service
and process topology related configurations.
"""

import asyncio
import dataclasses
import logging
from typing import Dict, List

from terragraph_thrift.Topology.ttypes import LinkType
from tglib.clients import APIServiceClient
from tglib.exceptions import ClientRuntimeError


@dataclasses.dataclass
class NetworkInfo:
    """Struct for representing the API config and topology for a network.
    Filled with the results of api/getTopology.
    """

    name: str
    nodes: List[Dict]
    links: List[Dict]
    sites: List[Dict]
    config: Dict


async def fetch_network_info() -> List[NetworkInfo]:
    """Return a list of NetworkInfo, one for each network.

    Fetches the topology for each network. Skip results where the request fails
    or the topology only has wired links.
    """

    api_client = APIServiceClient(timeout=1)
    results = await api_client.request_all(
        endpoint="getTopology", return_exceptions=True
    )

    networks = []
    for name, topo in results.items():
        if isinstance(topo, ClientRuntimeError):
            logging.error(f"Unable to fetch topology from {name}")
            continue
        logging.debug(f"Received topology for {name}")
        if all(link["link_type"] == LinkType.ETHERNET for link in topo["links"]):
            logging.warning(f"Ignoring {name}: no wireless links")
            continue

        # do not include links or nodes with missing MAC addresses
        # a missing MAC address is a configuration error; the logic assumes
        # that all nodes have a MAC address
        networks.append(
            NetworkInfo(
                name=name,
                nodes=[node for node in topo["nodes"] if node["wlan_mac_addrs"]],
                links=[
                    link
                    for link in topo["links"]
                    if link["a_node_mac"] and link["z_node_mac"]
                ],
                sites=topo["sites"],
                config=topo["config"],
            )
        )

    return networks
