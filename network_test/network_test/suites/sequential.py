#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import asyncio
import logging
from datetime import timedelta
from typing import Any, Dict, List

from tglib.clients import APIServiceClient

from .base import BaseTest
from ..models import NetworkTestDirection, NetworkTestType


class SequentialTest(BaseTest):
    def __init__(
        self,
        network_name: str,
        test_type: NetworkTestType,
        direction: NetworkTestDirection,
        iperf_options: Dict[str, Any],
        allowlist: List[str],
    ) -> None:
        # Set default test configurations
        if "timeSec" not in iperf_options:
            iperf_options["timeSec"] = 60  # 1 minute

        super().__init__(network_name, test_type, direction, iperf_options, allowlist)

    async def start(self, execution_id: int, use_link_local: bool) -> None:
        """Start a sequential test (i.e. on each asset, one at a time)."""
        logging.info(
            f"Starting {self.test_type.value} test on {self.network_name} (ID={execution_id})"
        )
        logging.debug(f"iperf options: {self.iperf_options}")
        logging.debug(f"allowlist: {self.allowlist}")

        loop = asyncio.get_event_loop()
        start_time = loop.time()
        client = APIServiceClient(timeout=1)
        for i, asset in enumerate(self.assets, 1):
            logging.info(f"Processing asset ({i}/{len(self.assets)})")

            # Run bidirectional iperf on the current asset
            requests = [
                client.request(
                    self.network_name,
                    "startTraffic",
                    params={
                        "srcNodeId": asset.src_node_mac,
                        "dstNodeId": asset.dst_node_mac,
                        "options": self.iperf_options,
                        "useLinkLocal": use_link_local,
                    },
                ),
                client.request(
                    self.network_name,
                    "startTraffic",
                    params={
                        "srcNodeId": asset.dst_node_mac,
                        "dstNodeId": asset.src_node_mac,
                        "options": self.iperf_options,
                        "useLinkLocal": use_link_local,
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

            if self.direction == NetworkTestDirection.BIDIRECTIONAL_PARALLEL:
                # Sleep before processing the next link if the current asset started successfully
                if await self.save(requests, values):
                    await asyncio.sleep(self.iperf_options["timeSec"])
            elif self.direction == NetworkTestDirection.BIDIRECTIONAL_SEQUENTIAL:
                if await self.save(requests[0::2], values[0::2]):
                    await asyncio.sleep(self.iperf_options["timeSec"])
                if await self.save(requests[1::2], values[1::2]):
                    await asyncio.sleep(self.iperf_options["timeSec"])

            logging.debug(f"time: {timedelta(seconds=loop.time() - start_time)}")

    def estimate_duration(self) -> timedelta:
        return timedelta(
            seconds=(
                len(self.assets)
                * self.iperf_options["timeSec"]
                * super().estimate_duration().seconds
            )
        )
