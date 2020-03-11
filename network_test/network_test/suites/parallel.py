#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import asyncio
import logging
from typing import Dict, List

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

    async def start(self) -> None:
        logging.info(f"Starting parallel link test on {self.network_name}")
        logging.debug(f"iperf options: {self.iperf_options}")
        self.session_ids.clear()

        try:
            client = APIServiceClient(timeout=1)
            topology = await client.request(self.network_name, "getTopology")
            wireless_links = [
                (link["a_node_mac"], link["z_node_mac"])
                for link in topology["links"]
                if link["link_type"] == LinkType.WIRELESS
            ]
        except ClientRuntimeError:
            logging.exception(f"Failed to fetch topology for {self.network_name}")
            return

        coros: List[asyncio.Future] = []
        for a_mac, z_mac in wireless_links:
            # Run bidirectional iperf on all wireless links simultaneously
            coros += [
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

        for result in await asyncio.gather(*coros, return_exceptions=True):
            if isinstance(result, ClientRuntimeError):
                logging.error(str(result))
            elif "id" in result:
                self.session_ids.append(result["id"])
            else:
                logging.error(result["message"])
