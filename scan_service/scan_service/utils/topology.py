#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import logging
from collections import defaultdict
from typing import Dict

from terragraph_thrift.Topology.ttypes import LinkType
from tglib.clients import APIServiceClient
from tglib.clients.prometheus_client import PrometheusClient


class Topology:
    topology: Dict[str, Dict] = {}
    node_name_to_mac: defaultdict = defaultdict(dict)
    node_mac_to_name: defaultdict = defaultdict(dict)
    link_name_to_mac: defaultdict = defaultdict(dict)

    @classmethod
    async def update_topology(cls, network_name: str) -> None:
        """Fetch latest topology and update class params."""
        cls.topology[network_name] = await APIServiceClient(timeout=2).request(
            network_name, "getTopology"
        )
        cls.get_node_maps(network_name)
        cls.get_link_maps(network_name)

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
