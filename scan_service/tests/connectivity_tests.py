#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import json
import unittest
from collections import defaultdict
from typing import List

import numpy as np
from bidict import bidict
from scan_service.analysis.connectivity import (
    convert_order_to_beams,
    find_routes_all,
    find_routes_compute,
    separate_beams,
)
from scan_service.utils.hardware_config import HardwareConfig


class ConnectivityTests(unittest.TestCase):
    def setUp(self) -> None:
        with open("tests/hardware_config.json") as f:
            hardware_config = json.load(f)
            HardwareConfig.set_config(hardware_config)

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

    def test_find_routes_snr(self) -> None:

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
