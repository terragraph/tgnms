#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import logging
from typing import Any, Dict, List, Optional

from terragraph_thrift.Controller.ttypes import IperfTransportProtocol
from terragraph_thrift.Topology.ttypes import LinkType
from tglib.clients import APIServiceClient
from tglib.exceptions import ClientRuntimeError

from .base import BaseTest, TestAsset
from ..models import NetworkTestType


class LinkTest(BaseTest):
    def __init__(
        self,
        network_name: str,
        test_type: NetworkTestType,
        iperf_options: Dict[str, Any],
        whitelist: List[str],
    ) -> None:
        # Set default test configurations
        iperf_options["protocol"] = IperfTransportProtocol.UDP
        if "bitrate" not in iperf_options:
            iperf_options["bitrate"] = 200000000  # 200 MB/s

        super().__init__(network_name, test_type, iperf_options, whitelist)

    async def prepare(self) -> bool:
        """Prepare the network test assets.

        Using the whitelist provided, or after selecting every wireless link in the
        network, gather the link names and MAC address information.
        """
        self.session_ids.clear()

        try:
            client = APIServiceClient(timeout=1)
            topology = await client.request(self.network_name, "getTopology")
            whitelist_set = set(self.whitelist)
            self.assets = []
            for link in topology["links"]:
                if link["link_type"] != LinkType.WIRELESS:
                    continue
                if self.whitelist and link["name"] not in whitelist_set:
                    continue

                self.assets.append(
                    TestAsset(link["name"], link["a_node_mac"], link["z_node_mac"])
                )

            return True
        except ClientRuntimeError:
            logging.exception(f"Failed to prepare test assets for {self.network_name}")
            return False
