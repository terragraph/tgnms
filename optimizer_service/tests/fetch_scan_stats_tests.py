#!/usr/bin/env python3

# Copyright (c) Meta Platforms, Inc. and affiliates.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

from collections import defaultdict

import aiohttp
import asynctest
from optimizer_service.utils.stats import fetch_scan_stats
from tglib.exceptions import ClientRuntimeError


class FetchScanStatsTests(asynctest.TestCase):
    @asynctest.patch("aiohttp.ClientSession.get")
    async def test_fetch_scan_stats(self, get) -> None:
        conn_list = []
        link_stats = {"network_A": defaultdict(lambda: defaultdict())}

        async with aiohttp.ClientSession() as session:
            get.return_value.__aenter__.return_value.status = 500
            await fetch_scan_stats("network_A", 0, 3600, link_stats, conn_list, session)
            self.assertDictEqual(link_stats, {"network_A": defaultdict()})

            get.return_value.__aenter__.return_value.status = 200
            get.return_value.__aenter__.return_value.read = asynctest.CoroutineMock(
                return_value="{}"
            )
            await fetch_scan_stats("network_A", 0, 3600, link_stats, conn_list, session)
            self.assertDictEqual(link_stats, {"network_A": defaultdict()})

            get.return_value.__aenter__.return_value.read = asynctest.CoroutineMock(
                side_effect=[
                    '{"executions": [{"id": 0}, {"id": 1}, {"id": 2}]}',
                    '{"aggregated_inr": {}, "results": {"1234": {}}}',
                ]
            )
            await fetch_scan_stats("network_A", 0, 3600, link_stats, conn_list, session)
            self.assertDictEqual(link_stats, {"network_A": defaultdict()})

            get.side_effect = aiohttp.ClientError()
            await fetch_scan_stats("network_A", 0, 3600, link_stats, conn_list, session)
            self.assertDictEqual(link_stats, {"network_A": defaultdict()})

            get.side_effect = None
            get.return_value.__aenter__.return_value.read = asynctest.CoroutineMock(
                side_effect=[
                    '{"executions": [{"id": 0}, {"id": 1}, {"id": 2}]}',
                    '{"aggregated_inr": {"n_day_avg": {"link": [{"inr_curr_power": 2}, {"inr_curr_power": 4}]}}, "results": {"1234": {"connectivity": [{"is_n_day_avg": false}]}}}',
                ]
            )
            await fetch_scan_stats("network_A", 0, 3600, link_stats, conn_list, session)
            self.assertDictEqual(
                link_stats, {"network_A": {"link": {"interference": 4.0}}}
            )
            self.assertDictEqual(conn_list[0], {"is_n_day_avg": False})
