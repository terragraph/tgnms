#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import json
import unittest
from typing import List

import numpy as np
from bidict import bidict
from scan_service.analysis.connectivity import (
    find_routes,
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
        self.assertEqual(routes, [(33, 18, 20), (53, 63, 11)])

    def test_find_routes_snr(self) -> None:
        im_data = {"10_0": {"snr_est": 11}, "30_50": {"snr_est": 20}}
        routes = find_routes(im_data, 10, False)
        self.assertEqual(routes, [(30, 50, 20), (10, 0, 11)])

    def test_find_routes_rssi(self) -> None:
        im_data = {"10_0": {"snr_est": -50}, "30_50": {"snr_est": -60}}
        routes = find_routes(im_data, 10, False)
        self.assertEqual(routes, [])
        im_data = {"10_0": {"rssi": -50}, "30_50": {"rssi": -60}}
        routes = find_routes(im_data, -70, True)
        self.assertEqual(routes, [(10, 0, -50), (30, 50, -60)])
