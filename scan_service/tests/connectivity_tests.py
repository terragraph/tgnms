#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import json
from collections import defaultdict
from typing import List

import asynctest
import numpy as np
from bidict import bidict
from scan_service.analysis.connectivity import (
    analyze_connectivity,
    convert_order_to_beams,
    find_routes_all,
    find_routes_compute,
    get_connectivity_data,
    separate_beams,
)
from scan_service.utils.hardware_config import HardwareConfig
from scan_service.utils.topology import Topology


class ConnectivityTests(asynctest.TestCase):
    async def setUp(self) -> None:
        with open("tests/hardware_config.json") as f:
            hardware_config = json.load(f)
            HardwareConfig.set_config(hardware_config)

        # Reset Topology class variables before start of the tests
        Topology.topology = {}
        Topology.link_name_to_mac = defaultdict(dict)
        Topology.mac_to_link_name = defaultdict(dict)
        Topology.wlan_mac_to_site_name = defaultdict(dict)
        Topology.node_channel = defaultdict(dict)
        Topology.node_polarity = defaultdict(dict)

        network_A = {
            "name": "network_A",
            "nodes": [
                {"site_name": "site 0", "wlan_mac_addrs": ["00:00:00:00:00:00"]},
                {"site_name": "site 1", "wlan_mac_addrs": ["00:00:00:00:00:01"]},
                {"site_name": "site 2", "wlan_mac_addrs": ["00:00:00:00:00:02"]},
                {"site_name": "site 3", "wlan_mac_addrs": ["00:00:00:00:00:03"]},
            ],
            "links": [
                {
                    "name": "link-N0-N1",
                    "a_node_name": "N0",
                    "z_node_name": "N1",
                    "a_node_mac": "00:00:00:00:00:00",
                    "z_node_mac": "00:00:00:00:00:01",
                    "link_type": 1,
                },
                {
                    "name": "link-N0.p1-N2",
                    "a_node_name": "N0",
                    "z_node_name": "N2",
                    "a_node_mac": "00:00:00:00:00:00",
                    "z_node_mac": "00:00:00:00:00:02",
                    "link_type": 1,
                },
            ],
        }
        node_overrides_config_A = {
            "overrides": "{"
            '"TEST.18-41.s1": {'
            '    "radioParamsOverride": {'
            '        "00:00:00:2f:e6:ea": {"fwParams": {"channel": 1, "polarity": 2}}'
            "    }"
            "  },"
            '"TEST.18-61.P5": {'
            '    "radioParamsOverride": {'
            '        "00:00:00:2f:e9:43": {"fwParams": {"channel": 0, "polarity": 1}}'
            "    }"
            "  }"
            "}"
        }
        with asynctest.patch(
            "tglib.clients.api_service_client.APIServiceClient.request",
            side_effect=[network_A, node_overrides_config_A],
        ):
            await Topology.update_topologies("network_A")

    def test_seperate_beams(self) -> None:
        routes = [(0, 0, 11), (5, 0, 10), (20, 20, 5)]
        separate_beams(routes)
        self.assertEqual(routes, [(0, 0, 11), (20, 20, 5)])

    def test_seperate_beams_none(self) -> None:
        routes = [(0, 0, 10), (60, 60, 11), (20, 20, 5)]
        separate_beams(routes)
        self.assertEqual(routes, [(0, 0, 10), (60, 60, 11), (20, 20, 5)])

    def test_find_routes_compute_empty(self) -> None:
        beam_map = np.array([[0] * 64] * 64)
        routes = find_routes_compute(beam_map, 20, 10)
        self.assertEqual(routes, [])

    def test_find_routes_compute(self) -> None:
        beam_map = np.array([[0] * 64] * 64)
        beam_map[10][0] = 11
        beam_map[30][50] = 20
        routes = find_routes_compute(beam_map, 20, 10)
        self.assertEqual(routes, [(30, 50, 20), (10, 0, 11)])

    def test_find_routes_all(self) -> None:
        im_data = {
            "10_0": {"snr_avg": 11},
            "30_20": {"snr_avg": 20},
            "10_26": {"snr_avg": 15},
        }
        routes = find_routes_all(im_data, 10)
        self.assertEqual(routes, [(10, 0, 11), (10, 26, 15), (30, 20, 20)])

        im_data = {
            "10_0": {"snr_avg": 11},
            "30_20": {"snr_avg": 20},
            "10_7": {"snr_avg": 15},
        }
        routes = find_routes_all(im_data, 10)
        self.assertEqual(routes, [(10, 7, 15), (30, 20, 20)])

    def test_convert_order_to_beams(self) -> None:
        routes = [(1, 7, 20), (7, 2, 11)]
        tx_beam_map = HardwareConfig.BEAM_ORDER["1"]["0"]
        rx_beam_map = HardwareConfig.BEAM_ORDER["0"]["18"]
        routes = convert_order_to_beams(routes, tx_beam_map, rx_beam_map)
        self.assertEqual(routes, [(29, 15, 20), (16, 10, 11)])

    def test_get_connectivity_data(self) -> None:
        im_data = {
            "network_name": "network_A",
            "group_id": 5,
            "token": 10,
            "tx_node": "00:00:00:00:00:00",
            "current_avg_rx_responses": {
                "00:00:00:00:00:00": {},
                "00:00:00:00:00:01": {
                    "10_0": {"snr_avg": 11},
                    "30_20": {"snr_avg": 20},
                    "10_26": {"snr_avg": 15},
                },
                "00:00:00:00:00:02": {
                    "10_0": {"snr_avg": 11},
                    "30_20": {"snr_avg": 20},
                    "10_26": {"snr_avg": 15},
                },
                "00:00:00:00:00:03": {},
            },
        }
        rx1_result = {
            "group_id": 5,
            "token": 10,
            "tx_node": "00:00:00:00:00:00",
            "rx_node": "00:00:00:00:00:01",
            "is_n_day_avg": False,
            "routes": [(10, 0, 11), (10, 26, 15), (30, 20, 20)],
        }
        rx2_result = {**rx1_result, "rx_node": "00:00:00:00:00:02"}
        self.assertListEqual(
            get_connectivity_data(im_data, 10, False), [rx1_result, rx2_result]
        )

    def test_get_connectivity_data_no_site(self) -> None:
        im_data = {
            "network_name": "network_A",
            "group_id": 5,
            "token": 10,
            "tx_node": "00:00:00:00:00:05",
            "current_avg_rx_responses": {
                "00:00:00:00:00:06": {},
                "00:00:00:00:00:07": {
                    "10_0": {"snr_avg": 11},
                    "30_20": {"snr_avg": 20},
                    "10_26": {"snr_avg": 15},
                },
            },
        }
        rx_result = {
            "group_id": 5,
            "token": 10,
            "tx_node": "00:00:00:00:00:05",
            "rx_node": "00:00:00:00:00:07",
            "is_n_day_avg": False,
            "routes": [(10, 0, 11), (10, 26, 15), (30, 20, 20)],
        }
        self.assertListEqual(get_connectivity_data(im_data, 10, False), [rx_result])

    def test_analyze_connectivity(self) -> None:
        responses = {
            "00:00:00:00:00:01": {
                "10_0": {"snr_avg": 11},
                "30_20": {"snr_avg": 20},
                "10_26": {"snr_avg": 15},
            }
        }
        im_data = {
            "network_name": "network_A",
            "group_id": 5,
            "token": 10,
            "type": 2,
            "mode": 1,
            "tx_node": "00:00:00:00:00:00",
            "current_avg_rx_responses": responses,
            "n_day_avg_rx_responses": responses,
        }
        expected_result = {
            "group_id": 5,
            "token": 10,
            "tx_node": "00:00:00:00:00:00",
            "rx_node": "00:00:00:00:00:01",
            "is_n_day_avg": False,
            "routes": [(10, 0, 11), (10, 26, 15), (30, 20, 20)],
        }
        expected_result_n = {**expected_result, "is_n_day_avg": True}
        self.assertListEqual(
            analyze_connectivity(im_data, 30, 10), [expected_result, expected_result_n]
        )

    def test_analyze_connectivity_not_im(self) -> None:
        im_data = {
            "network_name": "network_A",
            "group_id": 5,
            "token": 10,
            "type": 2,
            "mode": 0,
            "tx_node": "00:00:00:00:00:00",
            "current_avg_rx_responses": {},
            "n_day_avg_rx_responses": {},
        }
        self.assertEqual(analyze_connectivity(im_data, 30, 10), None)

    def test_analyze_connectivity_empty(self) -> None:
        self.assertEqual(analyze_connectivity(None, 30, 10), None)
