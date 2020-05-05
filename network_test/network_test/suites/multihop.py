#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import asyncio
import logging
import random
from datetime import timedelta
from typing import Dict, List, Optional, Tuple

from terragraph_thrift.Controller.ttypes import IperfTransportProtocol
from tglib.clients import APIServiceClient
from tglib.exceptions import ClientRuntimeError

from .base import BaseTest, TestAsset


class Multihop(BaseTest):
    def __init__(
        self, network_name: str, iperf_options: Dict, whitelist: List[str]
    ) -> None:
        # Set default test configurations
        iperf_options["json"] = True
        if "bitrate" not in iperf_options:
            iperf_options["bitrate"] = 300000000  # 300 MB/s
        if "timeSec" not in iperf_options:
            iperf_options["timeSec"] = 60  # 1 minute
        if "protocol" not in iperf_options:
            iperf_options["protocol"] = IperfTransportProtocol.TCP
            iperf_options["omitSec"] = 2  # 2 seconds

        super().__init__(network_name, iperf_options, whitelist)

    async def prepare(self) -> Optional[Tuple[List[TestAsset], timedelta]]:
        """Prepare the network test assets.

        The duration is the number of assets, post whitelist filtering, multiplied
        by the duration of each session as each asset is tested sequentially.
        """
        self.session_ids.clear()

        try:
            client = APIServiceClient(timeout=1)
            topology = await client.request(self.network_name, "getTopology")
            nodes: List[str] = []
            name_to_mac: Dict[str, str] = {}
            if self.whitelist:
                whitelist_set = set(self.whitelist)
                for node in topology["nodes"]:
                    if node["pop_node"]:
                        name_to_mac[node["name"]] = node["mac_addr"]
                    elif node["name"] in whitelist_set:
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
                return None

            test_assets = []
            for node_name, routes in default_routes.items():
                # Pick a random PoP node from the default routes if ECMP
                pop_name = routes[random.randint(0, len(routes) - 1)][-1]
                test_assets.append(
                    TestAsset(node_name, name_to_mac[node_name], name_to_mac[pop_name])
                )

            return (
                test_assets,
                timedelta(seconds=len(test_assets) * self.iperf_options["timeSec"]),
            )
        except ClientRuntimeError:
            logging.exception(f"Failed to prepare test assets for {self.network_name}")
            return None

    async def start(self, execution_id: int, test_assets: List[TestAsset]) -> None:
        logging.info(f"Starting multihop link test on {self.network_name}")
        logging.debug(f"iperf options: {self.iperf_options}")

        loop = asyncio.get_event_loop()
        start_time = loop.time()
        client = APIServiceClient(timeout=1)
        for i, asset in enumerate(test_assets, 1):
            logging.info(f"Processing node ({i}/{len(test_assets)})")

            # Run bidirectional iperf between the current node and the random PoP
            requests = [
                client.request(
                    self.network_name,
                    "startTraffic",
                    params={
                        "srcNodeId": asset.src_node_mac,
                        "dstNodeId": asset.dst_node_mac,
                        "options": self.iperf_options,
                    },
                ),
                client.request(
                    self.network_name,
                    "startTraffic",
                    params={
                        "srcNodeId": asset.dst_node_mac,
                        "dstNodeId": asset.src_node_mac,
                        "options": self.iperf_options,
                    },
                ),
            ]

            values = [
                {
                    "execution_id": execution_id,
                    "asset_name": asset.name,
                    "src_node_mac": asset.src_node_mac,
                    "dst_node_mac": asset.dst_node_mac,
                },
                {
                    "execution_id": execution_id,
                    "asset_name": asset.name,
                    "src_node_mac": asset.dst_node_mac,
                    "dst_node_mac": asset.src_node_mac,
                },
            ]

            # Sleep before processing the next node if the current node started successfully
            if await self.save(requests, values):
                await asyncio.sleep(self.iperf_options["timeSec"])

            logging.debug(f"time: {timedelta(seconds=loop.time() - start_time)}")
