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

from .base import BaseTest


class ParallelTest(BaseTest):
    def __init__(self, network_name: str, iperf_options: Dict) -> None:
        # Set default test configurations
        iperf_options["protocol"] = IperfTransportProtocol.UDP
        iperf_options["json"] = True
        if "bitrate" not in iperf_options:
            iperf_options["bitrate"] = 200000000  # 200 MB/s
        if "timeSec" not in iperf_options:
            iperf_options["timeSec"] = 300  # 5 minutes

        super().__init__(network_name, iperf_options)

    async def prepare(self) -> Optional[Tuple[List, timedelta]]:
        self.session_ids.clear()

        try:
            client = APIServiceClient(timeout=1)
            topology = await client.request(self.network_name, "getTopology")
            test_assets = [
                (link["a_node_mac"], link["z_node_mac"])
                for link in topology["links"]
                if link["link_type"] == LinkType.WIRELESS
            ]

            return test_assets, timedelta(seconds=self.iperf_options["timeSec"])
        except ClientRuntimeError:
            logging.exception(f"Failed to prepare test assets for {self.network_name}")
            return None

    async def start(self, execution_id: int, test_assets: List) -> None:
        logging.info(f"Starting parallel link test on {self.network_name}")
        logging.debug(f"iperf options: {self.iperf_options}")

        requests: List[asyncio.Future] = []
        values: List[Dict] = []
        client = APIServiceClient(timeout=1)
        for a_mac, z_mac in test_assets:
            # Run bidirectional iperf on all wireless links simultaneously
            requests += [
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

            values += [
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

        await self.save(requests, values)
