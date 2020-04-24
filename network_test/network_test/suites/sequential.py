#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import asyncio
import logging
from datetime import timedelta
from typing import Dict, List, Optional, Tuple

from terragraph_thrift.Controller.ttypes import IperfTransportProtocol
from terragraph_thrift.Topology.ttypes import LinkType
from tglib.clients import APIServiceClient
from tglib.exceptions import ClientRuntimeError

from .base import BaseTest, TestAsset


class Sequential(BaseTest):
    def __init__(
        self, network_name: str, iperf_options: Dict, whitelist: List[str]
    ) -> None:
        # Set default test configurations
        iperf_options["protocol"] = IperfTransportProtocol.UDP
        iperf_options["json"] = True
        if "bitrate" not in iperf_options:
            iperf_options["bitrate"] = 200000000  # 200 MB/s
        if "timeSec" not in iperf_options:
            iperf_options["timeSec"] = 60  # 1 minute

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
            whitelist_set = set(self.whitelist)
            test_assets = []
            for link in topology["links"]:
                if link["link_type"] != LinkType.WIRELESS:
                    continue
                if self.whitelist and link["name"] not in whitelist_set:
                    continue

                test_assets.append(
                    TestAsset(link["a_node_mac"], link["z_node_mac"], link["name"])
                )

            return (
                test_assets,
                timedelta(seconds=len(test_assets) * self.iperf_options["timeSec"]),
            )
        except ClientRuntimeError:
            logging.exception(f"Failed to prepare test assets for {self.network_name}")
            return None

    async def start(self, execution_id: int, test_assets: List[TestAsset]) -> None:
        logging.info(f"Starting sequential link test on {self.network_name}")
        logging.debug(f"iperf options: {self.iperf_options}")

        loop = asyncio.get_event_loop()
        start_time = loop.time()
        client = APIServiceClient(timeout=1)
        for i, asset in enumerate(test_assets, 1):
            logging.info(f"Processing link ({i}/{len(test_assets)})")

            # Run bidirectional iperf on the current link
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
                    "src_node_mac": asset.src_node_mac,
                    "dst_node_mac": asset.dst_node_mac,
                    "link_name": asset.link_name,
                },
                {
                    "execution_id": execution_id,
                    "src_node_mac": asset.dst_node_mac,
                    "dst_node_mac": asset.src_node_mac,
                    "link_name": asset.link_name,
                },
            ]

            # Sleep before processing the next link if the current link started successfully
            if await self.save(requests, values):
                await asyncio.sleep(self.iperf_options["timeSec"])

            logging.debug(f"time: {timedelta(seconds=loop.time() - start_time)}")
