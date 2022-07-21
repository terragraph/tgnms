#!/usr/bin/env python3

# Copyright (c) Meta Platforms, Inc. and affiliates.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

import unittest

import aiohttp
import asynctest
from optimizer_service.optimizations.auto_remediation import (
    link_operation,
    backup_links_selection,
    run_auto_remediation,
)
from tglib.exceptions import ClientRuntimeError


class AutoRemediationTests(asynctest.TestCase):
    @asynctest.patch("aiohttp.ClientSession.get")
    async def test_auto_remediation(self, get) -> None:
        topology = {"name": "test", "links": [], "nodes": [], "sites": []}
        async with aiohttp.ClientSession():
            self.assertTrue(await run_auto_remediation(0, 10, 1, "test", topology))

        topology = {"name": "test", "nodes": [], "sites": []}
        async with aiohttp.ClientSession():
            self.assertFalse(await run_auto_remediation(0, 10, 1, "test", topology))


class LinkOperationTests(asynctest.TestCase):
    async def test_link_operation(self) -> None:
        overrides = [
            {
                "name": "link-TEST.18-61.P1-TEST.Roof-16-North.P1",
                "a_node_name": "TEST.18-61.P1",
                "z_node_name": "TEST.Roof-16-North.P1",
                "a_node_mac": "00:00:00:28:e6:a4",
                "z_node_mac": "00:00:00:28:e7:c4",
                "link_type": 1,
                "is_alive": False,
                "is_backup_cn_link": True,
            },
            {
                "linkType": 1,
                "linkup_attempts": 0,
                "is_alive": False,
                "is_backup_cn_link": True,
                "a_node_mac": "00:00:00:1d:dd:52",
                "z_node_mac": "00:00:00:28:e6:a4",
                "a_node_name": "TEST.18-41.p1",
                "z_node_name": "TEST.18-61.P1",
                "name": "link-TEST.18-41.p1-TEST.18-61.P1",
            },
        ]
        with asynctest.patch(
            "tglib.clients.api_service_client.APIServiceClient.request", return_value={}
        ):
            self.assertTrue(await link_operation("test", "delLink", overrides[0]))
            self.assertTrue(await link_operation("test", "addLink", overrides[1]))
            self.assertTrue(await link_operation("test", "getLink", overrides[0]))
            self.assertFalse(await link_operation("test", "modifyLink", overrides[0]))
            self.assertFalse(await link_operation("test", "addLink", {}))

        with asynctest.patch(
            "tglib.clients.api_service_client.APIServiceClient.request",
            side_effect=[ClientRuntimeError()],
        ):
            self.assertFalse(await link_operation("test", "addLink", overrides[1]))


class BackupLinksSelectionTests(unittest.TestCase):
    def test_backup_links_selection(self) -> None:
        topology = {
            "name": "test",
            "nodes": [
                {
                    "name": "TEST.18-60.P2",
                    "node_type": 2,
                    "is_primary": True,
                    "wlan_mac_addrs": ["00:00:00:2f:eb:47"],
                    "pop_node": False,
                },
                {
                    "name": "TEST.Roof-16-North.P1",
                    "node_type": 2,
                    "is_primary": True,
                    "wlan_mac_addrs": ["00:00:00:28:e7:c4"],
                    "pop_node": True,
                },
                {
                    "name": "TEST.18-61.P1",
                    "node_type": 1,
                    "is_primary": True,
                    "wlan_mac_addrs": ["00:00:00:28:e6:a4"],
                    "pop_node": False,
                },
                {
                    "name": "TEST.18-41.p1",
                    "node_type": 2,
                    "is_primary": True,
                    "wlan_mac_addrs": ["00:00:00:1d:dd:52"],
                    "pop_node": False,
                },
            ],
            "links": [
                {
                    "name": "link-TEST.18-60.P2-TEST.18-61.P1",
                    "a_node_name": "TEST.18-60.P2",
                    "z_node_name": "TEST.18-61.P1",
                    "a_node_mac": "00:00:00:2f:eb:47",
                    "z_node_mac": "00:00:00:28:e6:a4",
                    "link_type": 1,
                    "is_alive": True,
                },
                {
                    "name": "link-TEST.18-61.P1-TEST.Roof-16-North.P1",
                    "a_node_name": "TEST.18-61.P1",
                    "z_node_name": "TEST.Roof-16-North.P1",
                    "a_node_mac": "00:00:00:28:e6:a4",
                    "z_node_mac": "00:00:00:28:e7:c4",
                    "link_type": 1,
                    "is_alive": False,
                    "is_backup_cn_link": True,
                },
            ],
        }
        conn_list = [
            {
                "is_n_day_avg": False,
                "tx_node": "00:00:00:28:e6:a4",
                "rx_node": "00:00:00:28:e7:c4",
                "routes": [[35, 29, 22]],
            },
            {
                "is_n_day_avg": False,
                "tx_node": "00:00:00:28:e6:aa",
                "rx_node": "00:00:00:1d:dd:51",
                "routes": [[31, 19, 20]],
            },
            {
                "is_n_day_avg": False,
                "tx_node": "00:00:00:28:e6:a4",
                "rx_node": "00:00:00:1d:dd:52",
                "routes": [[35, 29, 27]],
            },
        ]
        link_stats = {}
        overrides_del = []
        overrides_add = []
        backup_links_selection(
            "test", topology, 1, link_stats, conn_list, overrides_del, overrides_add
        )
        self.assertEqual(len(overrides_add), 1)
        self.assertEqual(len(overrides_del), 1)
