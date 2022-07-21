#!/usr/bin/env python3

# Copyright (c) Meta Platforms, Inc. and affiliates.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

import asyncio
import logging
from datetime import timedelta
from typing import Any, Dict, List

from tglib.clients import APIServiceClient

from .base import BaseTest
from ..models import NetworkTestDirection, NetworkTestType


class ParallelTest(BaseTest):
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
            iperf_options["timeSec"] = 300  # 5 minutes

        super().__init__(network_name, test_type, direction, iperf_options, allowlist)

    async def start(self, execution_id: int, use_link_local: bool) -> None:
        """Start a parallel test (i.e. on all assets simultaneously)."""
        logging.info(
            f"Starting {self.test_type.value} test on {self.network_name} (ID={execution_id})"
        )
        logging.debug(f"iperf options: {self.iperf_options}")
        logging.debug(f"allowlist: {self.allowlist}")

        requests: List[asyncio.Future] = []
        values: List[Dict] = []
        client = APIServiceClient(timeout=1)
        for asset in self.assets:
            # Run bidirectional iperf on all assets simultaneously
            requests += [
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

            values += [
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
            await self.save(requests, values)
        elif self.direction == NetworkTestDirection.BIDIRECTIONAL_SEQUENTIAL:
            if await self.save(requests[0::2], values[0::2]):
                await asyncio.sleep(self.iperf_options["timeSec"])
            await self.save(requests[1::2], values[1::2])

    def estimate_duration(self) -> timedelta:
        return timedelta(
            seconds=self.iperf_options["timeSec"] * super().estimate_duration().seconds
        )
