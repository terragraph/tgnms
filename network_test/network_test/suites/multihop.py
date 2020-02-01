#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import asyncio
import logging
import random
import time
from datetime import timedelta
from typing import Dict

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

    async def start(self) -> None:
        logging.info(f"Starting multihop link test on {self.network_name}")
        logging.debug(f"iperf options: {self.iperf_options}")
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
                logging.error(f"Failed to fetch default routes for {self.network_name}")
                return
        except ClientRuntimeError as e:
            logging.error(str(e))
            return

        start_time = time.monotonic()
        for i, (node_name, routes) in enumerate(default_routes.items(), 1):
            logging.info(f"Processing node ({i}/{len(default_routes)})")
            self.session_ids.clear()

            # Pick a random PoP node from the default routes if ECMP
            pop_name = routes[random.randint(0, len(routes) - 1)][-1]

            # Run bidirectional iperf between the current node and the random PoP
            coros = [
                client.request(
                    self.network_name,
                    "startTraffic",
                    params={
                        "srcNodeId": name_to_mac[node_name],
                        "dstNodeId": name_to_mac[pop_name],
                        "options": self.iperf_options,
                    },
                ),
                client.request(
                    self.network_name,
                    "startTraffic",
                    params={
                        "srcNodeId": name_to_mac[pop_name],
                        "dstNodeId": name_to_mac[node_name],
                        "options": self.iperf_options,
                    },
                ),
            ]

            for result in await asyncio.gather(*coros, return_exceptions=True):
                if isinstance(result, ClientRuntimeError):
                    logging.error(str(result))
                elif "id" in result:
                    self.session_ids.append(result["id"])
                else:
                    logging.error(result["message"])

            # Sleep before processing the next node if at least one session started
            if self.session_ids:
                await asyncio.sleep(self.iperf_options["timeSec"])

            logging.debug(
                f"Duration: {timedelta(seconds=time.monotonic() - start_time)}"
            )
