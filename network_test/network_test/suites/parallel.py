#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import asyncio
import logging
from datetime import timedelta
from typing import Any, Dict, List

from tglib.clients import APIServiceClient

from .base import BaseTest
from ..models import NetworkTestType


class ParallelTest(BaseTest):
    def __init__(
        self,
        network_name: str,
        test_type: NetworkTestType,
        iperf_options: Dict[str, Any],
        whitelist: List[str],
    ) -> None:
        # Set default test configurations
        if "timeSec" not in iperf_options:
            iperf_options["timeSec"] = 300  # 5 minutes

        super().__init__(network_name, test_type, iperf_options, whitelist)

    async def start(self, execution_id: int) -> None:
        """Start a parallel test (i.e. on all assets simultaneously)."""
        await super().start(execution_id)

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

        await self.save(requests, values)

    def estimate_duration(self) -> timedelta:
        return timedelta(seconds=self.iperf_options["timeSec"])
