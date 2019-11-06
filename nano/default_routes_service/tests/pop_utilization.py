#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import unittest

from default_routes_service.routes import _compute_pop_utilization_impl


class PopUtilization(unittest.TestCase):
    def test_one_node_empty_routes(self) -> None:
        input = [{"node_name": "A", "routes": []}]
        expected_output = {"A": {}}
        actual_output = _compute_pop_utilization_impl(input)
        self.assertDictEqual(expected_output, actual_output)

    def test_one_node_hundred_percent(self) -> None:
        input = [{"node_name": "A", "routes": [["X", "Y", "Z"]]}]
        expected_output = {"A": {"Z": 100}}
        actual_output = _compute_pop_utilization_impl(input)
        self.assertDictEqual(expected_output, actual_output)

    def test_one_node_ecmp(self) -> None:
        input = [{"node_name": "A", "routes": [["X", "Y", "Z"], ["X", "T", "Z"]]}]
        expected_output = {"A": {"Z": 100}}
        actual_output = _compute_pop_utilization_impl(input)
        self.assertDictEqual(expected_output, actual_output)

    def test_one_node_ecmp_pop_zero_cost(self) -> None:
        input = [{"node_name": "A", "routes": [["X", "Y", "Z"], ["X", "Y", "V"]]}]
        expected_output = {"A": {"V": 100, "Z": 100}}
        actual_output = _compute_pop_utilization_impl(input)
        self.assertDictEqual(expected_output, actual_output)

    def test_one_node_ecmp_multi_pop_with_zero_cost(self) -> None:
        input = [
            {
                "node_name": "A",
                "routes": [["X", "Y", "Z"], ["X", "Y", "V"], ["D", "G", "H"]],
            },
            {"node_name": "A", "routes": [["X", "Y", "Z"], ["X", "Y", "V"]]},
            {
                "node_name": "A",
                "routes": [["X", "Y", "Z"], ["X", "Y", "V"], ["D", "G", "H"]],
            },
        ]
        expected_output = {"A": {"H": 66.67, "V": 100, "Z": 100}}
        actual_output = _compute_pop_utilization_impl(input)
        self.assertDictEqual(expected_output, actual_output)

    def test_one_node_ecmp_to_no_ecmp(self) -> None:
        input = [
            {"node_name": "A", "routes": [["X", "Y", "Z"], ["X", "T", "Z"]]},
            {"node_name": "A", "routes": [["X", "Y", "Z"]]},
            {"node_name": "A", "routes": [["X", "Y", "Z"], ["X", "T", "Z"]]},
        ]
        expected_output = {"A": {"Z": 100}}
        actual_output = _compute_pop_utilization_impl(input)
        self.assertDictEqual(expected_output, actual_output)

    def test_multi_node_empty_routes(self) -> None:
        input = [{"node_name": "A", "routes": []}, {"node_name": "B", "routes": []}]
        expected_output = {"A": {}, "B": {}}
        actual_output = _compute_pop_utilization_impl(input)
        self.assertDictEqual(expected_output, actual_output)

    def test_multi_node_hundred_percent(self) -> None:
        input = [
            {"node_name": "A", "routes": [["X", "Y", "Z"]]},
            {"node_name": "B", "routes": [["G", "H", "I"]]},
        ]
        expected_output = {"A": {"Z": 100}, "B": {"I": 100}}
        actual_output = _compute_pop_utilization_impl(input)
        self.assertDictEqual(expected_output, actual_output)

    def test_multi_node_ecmp(self) -> None:
        input = [
            {"node_name": "A", "routes": [["X", "Y", "Z"], ["X", "G", "Z"]]},
            {"node_name": "B", "routes": [["G", "T", "H"], ["G", "U", "H"]]},
        ]
        expected_output = {"A": {"Z": 100}, "B": {"H": 100}}
        actual_output = _compute_pop_utilization_impl(input)
        self.assertDictEqual(expected_output, actual_output)

    def test_multi_node_ecmp_pop_zero_cost(self) -> None:
        input = [
            {"node_name": "A", "routes": [["X", "Y", "Z"], ["X", "Y", "V"]]},
            {"node_name": "B", "routes": [["D", "B", "Z"], ["D", "B", "M"]]},
        ]
        expected_output = {"A": {"V": 100, "Z": 100}, "B": {"M": 100, "Z": 100}}
        actual_output = _compute_pop_utilization_impl(input)
        self.assertDictEqual(expected_output, actual_output)

    def test_multi_node_ecmp_multi_pop_with_zero_cost(self) -> None:
        input = [
            {
                "node_name": "A",
                "routes": [["X", "Y", "Z"], ["X", "Y", "V"], ["D", "G", "H"]],
            },
            {
                "node_name": "B",
                "routes": [["H", "U", "I"], ["H", "U", "D"], ["E", "T", "M"]],
            },
        ]
        expected_output = {
            "A": {"H": 100, "V": 100, "Z": 100},
            "B": {"D": 100, "I": 100, "M": 100},
        }
        actual_output = _compute_pop_utilization_impl(input)
        self.assertDictEqual(expected_output, actual_output)

    def test_multi_node_ecmp_multi_pop_with_zero_cost_with_toggle(self) -> None:
        input = [
            {
                "node_name": "A",
                "routes": [["X", "Y", "Z"], ["X", "R", "Z"], ["D", "G", "H"]],
            },
            {"node_name": "A", "routes": [["X", "Y", "Z"], ["X", "R", "Z"]]},
            {
                "node_name": "A",
                "routes": [["X", "Y", "Z"], ["X", "R", "Z"], ["D", "G", "H"]],
            },
            {
                "node_name": "B",
                "routes": [["H", "U", "I"], ["H", "Y", "I"], ["E", "T", "M"]],
            },
            {"node_name": "B", "routes": [["H", "U", "I"], ["H", "Y", "I"]]},
            {
                "node_name": "B",
                "routes": [["H", "U", "I"], ["H", "Y", "I"], ["E", "T", "M"]],
            },
        ]
        expected_output = {"A": {"Z": 100, "H": 66.67}, "B": {"M": 66.67, "I": 100}}
        actual_output = _compute_pop_utilization_impl(input)
        self.assertDictEqual(expected_output, actual_output)

    def test_multi_node_multi_ecmp_routes(self) -> None:
        input = [
            {"node_name": "A", "routes": [["X", "Y", "Z"], ["X", "Y", "V"]]},
            {"node_name": "A", "routes": [["R", "T", "Y"], ["R", "T", "E"]]},
            {"node_name": "B", "routes": [["H", "U", "I"], ["H", "U", "D"]]},
            {"node_name": "B", "routes": [["Q", "E", "R"], ["Q", "E", "W"]]},
        ]
        expected_output = {
            "A": {"V": 50, "Z": 50, "Y": 50, "E": 50},
            "B": {"I": 50, "D": 50, "R": 50, "W": 50},
        }
        actual_output = _compute_pop_utilization_impl(input)
        self.assertDictEqual(expected_output, actual_output)

    def test_multi_node_ecmp_to_no_ecmp(self) -> None:
        input = [
            {"node_name": "A", "routes": [["X", "Y", "Z"], ["X", "T", "Z"]]},
            {"node_name": "A", "routes": [["X", "Y", "Z"]]},
            {"node_name": "A", "routes": [["X", "Y", "Z"], ["X", "T", "Z"]]},
            {"node_name": "B", "routes": [["X", "Y", "Z"], ["X", "T", "Z"]]},
            {"node_name": "B", "routes": [["X", "Y", "Z"]]},
            {"node_name": "B", "routes": [["X", "Y", "Z"], ["X", "T", "Z"]]},
        ]
        expected_output = {"A": {"Z": 100}, "B": {"Z": 100}}
        actual_output = _compute_pop_utilization_impl(input)
        self.assertDictEqual(expected_output, actual_output)
