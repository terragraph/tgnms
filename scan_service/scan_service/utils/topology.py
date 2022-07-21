#!/usr/bin/env python3

# Copyright (c) Meta Platforms, Inc. and affiliates.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

import asyncio
import json
import logging
from collections import defaultdict
from typing import DefaultDict, Dict, Optional

from terragraph_thrift.Topology.ttypes import LinkType
from tglib.clients import APIServiceClient
from tglib.exceptions import ClientRuntimeError


class Topology:
    topology: Dict[str, Dict] = {}
    link_name_to_mac: DefaultDict = defaultdict(dict)
    mac_to_link_name: DefaultDict = defaultdict(dict)
    wlan_mac_to_site_name: DefaultDict = defaultdict(dict)
    site_name_to_wlan_macs: DefaultDict = defaultdict(dict)
    node_channel: DefaultDict = defaultdict(dict)
    node_polarity: DefaultDict = defaultdict(dict)

    @classmethod
    async def update_topologies(cls, network_name: Optional[str] = None) -> None:
        """Fetch latest topologies and update class params."""
        client = APIServiceClient(timeout=2)
        if network_name is None:
            topologies = await client.request_all("getTopology", return_exceptions=True)
        else:
            topologies = {
                network_name: await client.request(network_name, "getTopology")
            }

        coroutines = []
        for name, topology in topologies.items():
            if isinstance(topology, ClientRuntimeError):
                logging.error(f"Failed to fetch topology for {name}")
                continue
            if not topology:
                logging.debug(f"Topology for {name} is empty")
                continue

            cls.topology[name] = topology
            cls.get_site_maps(name)
            cls.get_link_maps(name)
            coroutines.append(cls.get_auto_node_overrides_config(client, name))
        await asyncio.gather(*coroutines, return_exceptions=True)

    @classmethod
    def get_site_maps(cls, network_name: str) -> None:
        """Generate node macs and site name maps."""
        for node in cls.topology[network_name]["nodes"]:
            for wlan_mac in node["wlan_mac_addrs"]:
                cls.wlan_mac_to_site_name[network_name][wlan_mac] = node["site_name"]
            cls.site_name_to_wlan_macs[network_name][node["site_name"]] = node[
                "wlan_mac_addrs"
            ]

    @classmethod
    def get_link_maps(cls, network_name: str) -> None:
        """Generate link name and node macs maps."""
        for link in cls.topology[network_name]["links"]:
            if link["link_type"] != LinkType.WIRELESS:
                continue

            if not link["a_node_mac"] or not link["z_node_mac"]:
                logging.error(f"Node MAC missing in {link['name']} of {network_name}")
                continue

            cls.link_name_to_mac[network_name][link["name"]] = (
                link["a_node_mac"],
                link["z_node_mac"],
            )

            cls.mac_to_link_name[network_name][
                (link["a_node_mac"], link["z_node_mac"])
            ] = link["name"]
            cls.mac_to_link_name[network_name][
                (link["z_node_mac"], link["a_node_mac"])
            ] = link["name"]

    @classmethod
    async def get_auto_node_overrides_config(
        cls, client: APIServiceClient, network_name: str
    ) -> None:
        """Fetch channel and polarity info using 'getAutoNodeOverridesConfig'."""
        node_overrides_config = await client.request(
            network_name, "getAutoNodeOverridesConfig"
        )
        overrides = json.loads(node_overrides_config["overrides"])

        for node_name, override_info in overrides.items():
            for node_mac, node_overrides in override_info.get(
                "radioParamsOverride", {}
            ).items():
                if "channel" in node_overrides.get("fwParams", {}):
                    cls.node_channel[network_name][node_mac] = node_overrides[
                        "fwParams"
                    ]["channel"]
                if "polarity" in node_overrides.get("fwParams", {}):
                    cls.node_polarity[network_name][node_mac] = node_overrides[
                        "fwParams"
                    ]["polarity"]
