#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import unittest

from default_routes_service.routes import _compute_routes_utilization_impl


class RoutesUtilization(unittest.TestCase):
    def test_one_node_empty_routes(self) -> None:
        input = [{"node_name": "A", "routes": []}, {"node_name": "A", "routes": []}]
        expected_output = {"A": {"[]": 100}}
        actual_output = _compute_routes_utilization_impl(input)
        self.assertDictEqual(expected_output, actual_output)

    def test_one_route_hundred_percent(self) -> None:
        input = [{"node_name": "A", "routes": [["X", "Y", "Z"]]}]
        expected_output = {"A": {"[['X', 'Y', 'Z']]": 100}}
        actual_output = _compute_routes_utilization_impl(input)
        self.assertDictEqual(expected_output, actual_output)

    def test_one_node_ecmp(self) -> None:
        input = [{"node_name": "A", "routes": [["X", "Y", "Z"], ["A", "G", "H"]]}]
        expected_output = {"A": {"[['X', 'Y', 'Z'], ['A', 'G', 'H']]": 100}}
        actual_output = _compute_routes_utilization_impl(input)
        self.assertDictEqual(expected_output, actual_output)

    def test_one_node_ecmp_multi_routes_without_ecmp(self) -> None:
        input = [
            {"node_name": "A", "routes": [["X", "Y", "Z"]]},
            {"node_name": "A", "routes": [["D", "G", "H"]]},
        ]
        expected_output = {"A": {"[['X', 'Y', 'Z']]": 50, "[['D', 'G', 'H']]": 50}}
        actual_output = _compute_routes_utilization_impl(input)
        self.assertDictEqual(expected_output, actual_output)

    def test_one_node_ecmp_multi_routes_with_ecmp(self) -> None:
        input = [
            {"node_name": "A", "routes": [["X", "Y", "Z"], ["X", "Y", "V"]]},
            {"node_name": "A", "routes": [["D", "G", "H"], ["D", "G", "F"]]},
        ]
        expected_output = {
            "A": {
                "[['D', 'G', 'H'], ['D', 'G', 'F']]": 50,
                "[['X', 'Y', 'Z'], ['X', 'Y', 'V']]": 50,
            }
        }
        actual_output = _compute_routes_utilization_impl(input)
        self.assertDictEqual(expected_output, actual_output)

    def test_one_node_ecmp_to_no_ecmp(self) -> None:
        input = [
            {"node_name": "A", "routes": [["X", "Y", "Z"], ["X", "Y", "V"]]},
            {"node_name": "A", "routes": [["X", "Y", "Z"]]},
            {"node_name": "A", "routes": [["X", "Y", "Z"], ["X", "Y", "V"]]},
        ]
        expected_output = {
            "A": {
                "[['X', 'Y', 'Z'], ['X', 'Y', 'V']]": 66.67,
                "[['X', 'Y', 'Z']]": 33.33,
            }
        }
        actual_output = _compute_routes_utilization_impl(input)
        self.assertDictEqual(expected_output, actual_output)

    def test_multi_node_empty_routes(self) -> None:
        input = [{"node_name": "A", "routes": []}, {"node_name": "B", "routes": []}]
        expected_output = {"A": {"[]": 100}, "B": {"[]": 100}}
        actual_output = _compute_routes_utilization_impl(input)
        self.assertDictEqual(expected_output, actual_output)

    def test_multi_node_hundred_percent(self) -> None:
        input = [
            {"node_name": "A", "routes": [["X", "Y", "Z"]]},
            {"node_name": "B", "routes": [["G", "H", "I"]]},
        ]
        expected_output = {
            "A": {"[['X', 'Y', 'Z']]": 100},
            "B": {"[['G', 'H', 'I']]": 100},
        }
        actual_output = _compute_routes_utilization_impl(input)
        self.assertDictEqual(expected_output, actual_output)

    def test_multi_node_ecmp(self) -> None:
        input = [
            {"node_name": "A", "routes": [["X", "Y", "Z"], ["X", "G", "Z"]]},
            {"node_name": "B", "routes": [["G", "T", "H"], ["G", "U", "H"]]},
        ]
        expected_output = {
            "A": {"[['X', 'Y', 'Z'], ['X', 'G', 'Z']]": 100},
            "B": {"[['G', 'T', 'H'], ['G', 'U', 'H']]": 100},
        }
        actual_output = _compute_routes_utilization_impl(input)
        self.assertDictEqual(expected_output, actual_output)

    def test_multi_node_ecmp_multi_routes_without_ecmp(self) -> None:
        input = [
            {"node_name": "A", "routes": [["X", "Y", "Z"]]},
            {"node_name": "A", "routes": [["D", "G", "H"]]},
            {"node_name": "B", "routes": [["H", "U", "I"]]},
            {"node_name": "B", "routes": [["E", "T", "M"]]},
        ]
        expected_output = {
            "A": {"[['X', 'Y', 'Z']]": 50, "[['D', 'G', 'H']]": 50},
            "B": {"[['H', 'U', 'I']]": 50, "[['E', 'T', 'M']]": 50},
        }
        actual_output = _compute_routes_utilization_impl(input)
        self.assertDictEqual(expected_output, actual_output)

    def test_multi_node_ecmp_multi_routes_with_ecmp(self) -> None:
        input = [
            {"node_name": "A", "routes": [["X", "Y", "Z"], ["X", "Y", "V"]]},
            {"node_name": "A", "routes": [["D", "G", "H"], ["D", "G", "F"]]},
            {"node_name": "B", "routes": [["H", "U", "I"], ["H", "U", "D"]]},
            {"node_name": "B", "routes": [["E", "T", "M"], ["E", "T", "R"]]},
        ]
        expected_output = {
            "A": {
                "[['X', 'Y', 'Z'], ['X', 'Y', 'V']]": 50,
                "[['D', 'G', 'H'], ['D', 'G', 'F']]": 50,
            },
            "B": {
                "[['H', 'U', 'I'], ['H', 'U', 'D']]": 50,
                "[['E', 'T', 'M'], ['E', 'T', 'R']]": 50,
            },
        }
        actual_output = _compute_routes_utilization_impl(input)
        self.assertDictEqual(expected_output, actual_output)
