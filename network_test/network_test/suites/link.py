#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import logging
from typing import Any, Dict, List

from terragraph_thrift.Controller.ttypes import IperfTransportProtocol
from terragraph_thrift.Topology.ttypes import LinkType
from tglib.clients import APIServiceClient
from tglib.exceptions import ClientRuntimeError

from ..models import NetworkTestType
from .base import BaseTest, TestAsset


class LinkTest(BaseTest):
    def __init__(
        self,
        network_name: str,
        test_type: NetworkTestType,
        iperf_options: Dict[str, Any],
        allowlist: List[str],
    ) -> None:
        # Set default test configurations
        if "protocol" not in iperf_options:
            iperf_options["protocol"] = IperfTransportProtocol.UDP
        if "bitrate" not in iperf_options:
            iperf_options["bitrate"] = 100000000  # 100 MB/s

        super().__init__(network_name, test_type, iperf_options, allowlist)

    async def prepare(self) -> bool:
        """Prepare the network test assets.

        Using the allowlist provided, or after selecting every wireless link in the
        network, gather the link names and MAC address information.
        """
        self.session_ids.clear()

        try:
            client = APIServiceClient(timeout=1)
            topology = await client.request(self.network_name, "getTopology")
            node_name_to_mac = {
                node["name"]: node["mac_addr"] for node in topology["nodes"]
            }
            allowlist_set = set(self.allowlist)
            self.assets = []
            for link in topology["links"]:
                if not link["is_alive"]:
                    logging.error(f"Skipping {link['name']} because it is not alive")
                    continue
                if link["link_type"] != LinkType.WIRELESS:
                    continue
                if self.allowlist and link["name"] not in allowlist_set:
                    continue

                self.assets.append(
                    TestAsset(
                        link["name"],
                        node_name_to_mac[link["a_node_name"]],
                        node_name_to_mac[link["z_node_name"]],
                    ),
                )

            return True
        except ClientRuntimeError:
            logging.exception(f"Failed to prepare test assets for {self.network_name}")
            return False
