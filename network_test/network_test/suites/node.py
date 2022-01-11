#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import logging
import random
from typing import Any, Dict, List, Set

from terragraph_thrift.Controller.ttypes import IperfTransportProtocol
from terragraph_thrift.Topology.ttypes import NodeStatusType
from tglib.clients import APIServiceClient
from tglib.exceptions import ClientRuntimeError

from ..models import NetworkTestDirection, NetworkTestType
from .base import BaseTest, TestAsset


class NodeTest(BaseTest):
    def __init__(
        self,
        network_name: str,
        test_type: NetworkTestType,
        direction: NetworkTestDirection,
        iperf_options: Dict[str, Any],
        allowlist: List[str],
    ) -> None:
        # Set default test configurations
        if "bitrate" not in iperf_options:
            iperf_options["bitrate"] = 150000000  # 150 MB/s
        if "protocol" not in iperf_options:
            iperf_options["protocol"] = IperfTransportProtocol.TCP
            iperf_options["omitSec"] = 2  # 2 seconds

        super().__init__(network_name, test_type, direction, iperf_options, allowlist)

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
            seen_sites: Set[str] = set()
            allowlist_set = set(self.allowlist)

            # Shuffle the nodes to avoid picking the same site representative each time
            random.shuffle(topology["nodes"])
            for node in topology["nodes"]:
                node_name = node["name"]
                node_mac = node["mac_addr"]
                site_name = node["site_name"]

                if node["pop_node"]:
                    name_to_mac[node_name] = node_mac
                elif node["status"] == NodeStatusType.OFFLINE:
                    logging.error(f"Skipping {node_name} because it is 'OFFLINE'")
                elif (allowlist_set and node_name in allowlist_set) or (
                    not allowlist_set and site_name not in seen_sites
                ):
                    name_to_mac[node_name] = node_mac
                    nodes.append(node_name)
                    seen_sites.add(site_name)

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
