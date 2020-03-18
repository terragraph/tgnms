#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import asyncio
import logging
import random
from datetime import timedelta
from typing import Dict, List, Optional, Tuple

from tglib.clients import APIServiceClient
from tglib.exceptions import ClientRuntimeError

from .base import BaseTest


class MultihopTest(BaseTest):
    def __init__(self, network_name: str, iperf_options: Dict) -> None:
        # Set default test configurations
        iperf_options["json"] = True
        if "bitrate" not in iperf_options:
            iperf_options["bitrate"] = 300000000  # 300 MB/s
        if "timeSec" not in iperf_options:
            iperf_options["timeSec"] = 60  # 1 minute
        if "omitSec" not in iperf_options:
            iperf_options["omitSec"] = 2  # 2 seconds

        super().__init__(network_name, iperf_options)

    async def prepare(self) -> Optional[Tuple[List, timedelta]]:
        self.session_ids.clear()

        try:
            client = APIServiceClient(timeout=1)
            topology = await client.request(self.network_name, "getTopology")

            # Shuffle the nodes to avoid picking the same site representative each time
            random.shuffle(topology["nodes"])

            site_to_node_rep: Dict[str, str] = {}
            name_to_mac: Dict[str, str] = {}
            for node in topology["nodes"]:
                name_to_mac[node["name"]] = node["mac_addr"]
                if not node["pop_node"] and node["site_name"] not in site_to_node_rep:
                    site_to_node_rep[node["site_name"]] = node["name"]

            default_routes = (
                await client.request(
                    self.network_name,
                    "getDefaultRoutes",
                    params={"nodes": list(site_to_node_rep.values())},
                )
            ).get("defaultRoutes")
            if default_routes is None:
                logging.error(f"No default routes available for {self.network_name}")
                return None

            test_assets = []
            for node_name, routes in default_routes.items():
                # Pick a random PoP node from the default routes if ECMP
                pop_name = routes[random.randint(0, len(routes) - 1)][-1]
                test_assets.append((name_to_mac[node_name], name_to_mac[pop_name]))

            return (
                test_assets,
                timedelta(seconds=len(test_assets) * self.iperf_options["timeSec"]),
            )
        except ClientRuntimeError:
            logging.exception(f"Failed to prepare test assets for {self.network_name}")
            return None

    async def start(self, execution_id: int, test_assets: List) -> None:
        logging.info(f"Starting multihop link test on {self.network_name}")
        logging.debug(f"iperf options: {self.iperf_options}")

        loop = asyncio.get_event_loop()
        start_time = loop.time()
        client = APIServiceClient(timeout=1)
        for i, (a_mac, z_mac) in enumerate(test_assets, 1):
            logging.info(f"Processing node ({i}/{len(test_assets)})")

            # Run bidirectional iperf between the current node and the random PoP
            requests = [
                client.request(
                    self.network_name,
                    "startTraffic",
                    params={
                        "srcNodeId": a_mac,
                        "dstNodeId": z_mac,
                        "options": self.iperf_options,
                    },
                ),
                client.request(
                    self.network_name,
                    "startTraffic",
                    params={
                        "srcNodeId": z_mac,
                        "dstNodeId": a_mac,
                        "options": self.iperf_options,
                    },
                ),
            ]

            values = [
                {
                    "execution_id": execution_id,
                    "src_node_mac": a_mac,
                    "dst_node_mac": z_mac,
                },
                {
                    "execution_id": execution_id,
                    "src_node_mac": z_mac,
                    "dst_node_mac": a_mac,
                },
            ]

            # Sleep before processing the next node if the current node started successfully
            if await self.save(requests, values):
                await asyncio.sleep(self.iperf_options["timeSec"])

            logging.debug(f"time: {timedelta(seconds=loop.time() - start_time)}")
