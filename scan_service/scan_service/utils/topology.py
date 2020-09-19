#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import asyncio
import json
import logging
from collections import defaultdict
from typing import DefaultDict, Dict, Optional

from terragraph_thrift.Topology.ttypes import LinkType
from tglib.clients import APIServiceClient
from tglib.clients.prometheus_client import PrometheusClient
from tglib.exceptions import ClientRuntimeError


class Topology:
    topology: Dict[str, Dict] = {}
    node_name_to_mac: DefaultDict = defaultdict(dict)
    node_mac_to_name: DefaultDict = defaultdict(dict)
    link_name_to_mac: DefaultDict = defaultdict(dict)
    mac_to_link_name: DefaultDict = defaultdict(dict)
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
            cls.get_node_maps(name)
            cls.get_link_maps(name)
            coroutines.append(cls.get_auto_node_overrides_config(client, name))
        await asyncio.gather(*coroutines, return_exceptions=True)

    @classmethod
    def get_node_maps(cls, network_name: str) -> None:
        """Generate node name and node mac maps."""
        for node in cls.topology[network_name]["nodes"]:
            cls.node_name_to_mac[network_name][node["name"]] = node["mac_addr"]
            cls.node_mac_to_name[network_name][node["mac_addr"]] = node["name"]

    @classmethod
    def get_link_maps(cls, network_name: str) -> None:
        """Generate link name and node macs maps."""
        for link in cls.topology[network_name]["links"]:
            if link["link_type"] != LinkType.WIRELESS:
                continue

            a_node_mac = (
                link["a_node_mac"]
                if link["a_node_mac"]
                else cls.node_name_to_mac[network_name][link["a_node_name"]]
            )
            z_node_mac = (
                link["z_node_mac"]
                if link["z_node_mac"]
                else cls.node_name_to_mac[network_name][link["z_node_name"]]
            )

            if not a_node_mac or not z_node_mac:
                logging.error(f"Node MAC missing in {link['name']} of {network_name}")
                continue

            cls.link_name_to_mac[network_name][
                PrometheusClient.normalize(link["name"])
            ] = (a_node_mac, z_node_mac)

            cls.mac_to_link_name[network_name][(a_node_mac, z_node_mac)] = link["name"]
            cls.mac_to_link_name[network_name][(z_node_mac, a_node_mac)] = link["name"]

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
            node_mac = cls.node_name_to_mac[network_name][node_name]
            if (
                override_info.get("radioParamsOverride", {})
                .get(node_mac, {})
                .get("fwParams")
                is None
            ):
                logging.debug(
                    f"Unable to get overrides config for {node_name} of {network_name}"
                )
                continue

            if "channel" in override_info["radioParamsOverride"][node_mac]["fwParams"]:
                cls.node_channel[network_name][node_mac] = override_info[
                    "radioParamsOverride"
                ][node_mac]["fwParams"]["channel"]
            if "polarity" in override_info["radioParamsOverride"][node_mac]["fwParams"]:
                cls.node_polarity[network_name][node_mac] = override_info[
                    "radioParamsOverride"
                ][node_mac]["fwParams"]["polarity"]
