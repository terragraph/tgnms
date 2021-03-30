#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import logging
import random
from typing import Any, Dict, List

from terragraph_thrift.Controller.ttypes import IperfTransportProtocol
from tglib.clients import APIServiceClient
from tglib.exceptions import ClientRuntimeError

from ..models import NetworkTestType
from .base import BaseTest, TestAsset


class NodeTest(BaseTest):
    def __init__(
        self,
        network_name: str,
        test_type: NetworkTestType,
        iperf_options: Dict[str, Any],
        allowlist: List[str],
    ) -> None:
        # Set default test configurations
        if "bitrate" not in iperf_options:
            iperf_options["bitrate"] = 150000000  # 150 MB/s
        if "protocol" not in iperf_options:
            iperf_options["protocol"] = IperfTransportProtocol.TCP
            iperf_options["omitSec"] = 2  # 2 seconds

        super().__init__(network_name, test_type, iperf_options, allowlist)

    async def prepare(self) -> bool:  # noqa: C901
        """Prepare the network test assets.

        Using the allowlist provided, or after selecting one node per site (excluding
        PoPs), gather the node names and MAC address information.
        """
        self.session_ids.clear()

        try:
            client = APIServiceClient(timeout=1)
            topology = await client.request(self.network_name, "getTopology")
            nodes: List[str] = []
            name_to_mac: Dict[str, str] = {}
            if self.allowlist:
                allowlist_set = set(self.allowlist)
                for node in topology["nodes"]:
                    if node["pop_node"]:
                        name_to_mac[node["name"]] = node["mac_addr"]
                    elif node["name"] in allowlist_set:
                        name_to_mac[node["name"]] = node["mac_addr"]
                        nodes.append(node["name"])
            else:
                # Shuffle the nodes to avoid picking the same site representative each time
                random.shuffle(topology["nodes"])
                site_to_node_rep: Dict[str, str] = {}
                for node in topology["nodes"]:
                    if node["pop_node"]:
                        name_to_mac[node["name"]] = node["mac_addr"]
                    elif node["site_name"] not in site_to_node_rep:
                        name_to_mac[node["name"]] = node["mac_addr"]
                        site_to_node_rep[node["site_name"]] = node["name"]
                nodes = list(site_to_node_rep.values())

            default_routes = (
                await client.request(
                    self.network_name, "getDefaultRoutes", params={"nodes": nodes}
                )
            ).get("defaultRoutes")
            if default_routes is None:
                logging.error(f"No default routes available for {self.network_name}")
                return False

            self.assets = []
            for node_name, routes in default_routes.items():
                if not routes:
                    logging.error(f"{node_name} has no default routes available")
                    continue

                # Pick a random PoP node from the default routes if ECMP
                pop_name = routes[random.randint(0, len(routes) - 1)][-1]
                self.assets.append(
                    TestAsset(node_name, name_to_mac[node_name], name_to_mac[pop_name])
                )

            return True
        except ClientRuntimeError:
            logging.exception(f"Failed to prepare test assets for {self.network_name}")
            return False
