#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import unittest

from default_routes_service.routes import _get_default_routes_history_impl


class TestRoutesHistory(unittest.TestCase):
    def test_one_node_no_routes(self) -> None:
        input = [{"node_name": "A", "routes": [], "last_updated": "datetime_0"}]
        expected_output = {"A": {"datetime_0": []}}
        actual_output = _get_default_routes_history_impl(input)
        self.assertDictEqual(actual_output, expected_output)

    def test_one_node_one_route_no_change(self) -> None:
        input = [
            {
                "node_name": "A",
                "routes": [["X", "Y", "Z"]],
                "last_updated": "datetime_0",
            }
        ]
        expected_output = {"A": {"datetime_0": [["X", "Y", "Z"]]}}
        actual_output = _get_default_routes_history_impl(input)
        self.assertDictEqual(actual_output, expected_output)

    def test_one_node_two_routes_one_change(self) -> None:
        input = [
            {
                "node_name": "A",
                "routes": [["X", "Y", "Z"]],
                "last_updated": "datetime_0",
            },
            {
                "node_name": "A",
                "routes": [["A", "B", "C"]],
                "last_updated": "datetime_3",
            },
        ]
        expected_output = {
            "A": {"datetime_0": [["X", "Y", "Z"]], "datetime_3": [["A", "B", "C"]]}
        }
        actual_output = _get_default_routes_history_impl(input)
        self.assertDictEqual(actual_output, expected_output)

    def test_one_node_two_routes_two_changes(self) -> None:
        input = [
            {
                "node_name": "A",
                "routes": [["X", "Y", "Z"]],
                "last_updated": "datetime_0",
            },
            {
                "node_name": "A",
                "routes": [["A", "B", "C"]],
                "last_updated": "datetime_3",
            },
            {
                "node_name": "A",
                "routes": [["X", "Y", "Z"]],
                "last_updated": "datetime_6",
            },
        ]
        expected_output = {
            "A": {
                "datetime_0": [["X", "Y", "Z"]],
                "datetime_3": [["A", "B", "C"]],
                "datetime_6": [["X", "Y", "Z"]],
            }
        }
        actual_output = _get_default_routes_history_impl(input)
        self.assertDictEqual(actual_output, expected_output)

    def test_one_node_one_ecmp_route_no_change(self) -> None:
        input = [
            {
                "node_name": "A",
                "routes": [["X", "U", "Z"], ["X", "Y", "Z"]],
                "last_updated": "datetime_0",
            }
        ]
        expected_output = {"A": {"datetime_0": [["X", "U", "Z"], ["X", "Y", "Z"]]}}
        actual_output = _get_default_routes_history_impl(input)
        self.assertDictEqual(actual_output, expected_output)

    def test_one_node_two_ecmp_routes_one_change(self) -> None:
        input = [
            {
                "node_name": "A",
                "routes": [["X", "Y", "Z"], ["X", "Y", "Z"]],
                "last_updated": "datetime_0",
            },
            {
                "node_name": "A",
                "routes": [["A", "B", "C"], ["A", "G", "C"]],
                "last_updated": "datetime_3",
            },
        ]
        expected_output = {
            "A": {
                "datetime_0": [["X", "Y", "Z"], ["X", "Y", "Z"]],
                "datetime_3": [["A", "B", "C"], ["A", "G", "C"]],
            }
        }
        actual_output = _get_default_routes_history_impl(input)
        self.assertDictEqual(actual_output, expected_output)

    def test_one_node_two_ecmp_routes_two_changes(self) -> None:
        input = [
            {
                "node_name": "A",
                "routes": [["X", "Y", "Z"], ["X", "T", "Z"]],
                "last_updated": "datetime_0",
            },
            {
                "node_name": "A",
                "routes": [["A", "B", "C"], ["A", "G", "C"]],
                "last_updated": "datetime_3",
            },
            {
                "node_name": "A",
                "routes": [["X", "Y", "Z"], ["X", "T", "Z"]],
                "last_updated": "datetime_6",
            },
        ]
        expected_output = {
            "A": {
                "datetime_0": [["X", "Y", "Z"], ["X", "T", "Z"]],
                "datetime_3": [["A", "B", "C"], ["A", "G", "C"]],
                "datetime_6": [["X", "Y", "Z"], ["X", "T", "Z"]],
            }
        }
        actual_output = _get_default_routes_history_impl(input)
        self.assertDictEqual(actual_output, expected_output)

    def test_one_ecmp_one_normal_route_two_changes(self) -> None:
        input = [
            {
                "node_name": "A",
                "routes": [["X", "Y", "Z"], ["X", "E", "Z"]],
                "last_updated": "datetime_0",
            },
            {
                "node_name": "A",
                "routes": [["A", "B", "C"]],
                "last_updated": "datetime_3",
            },
            {
                "node_name": "A",
                "routes": [["X", "Y", "Z"], ["X", "E", "Z"]],
                "last_updated": "datetime_8",
            },
        ]
        expected_output = {
            "A": {
                "datetime_0": [["X", "Y", "Z"], ["X", "E", "Z"]],
                "datetime_3": [["A", "B", "C"]],
                "datetime_8": [["X", "Y", "Z"], ["X", "E", "Z"]],
            }
        }
        actual_output = _get_default_routes_history_impl(input)
        self.assertDictEqual(actual_output, expected_output)

    def test_multi_node_no_routes(self) -> None:
        input = [
            {"node_name": "A", "routes": [], "last_updated": "datetime_0"},
            {"node_name": "B", "routes": [], "last_updated": "datetime_0"},
        ]
        expected_output = {"A": {"datetime_0": []}, "B": {"datetime_0": []}}
        actual_output = _get_default_routes_history_impl(input)
        self.assertDictEqual(actual_output, expected_output)

    def test_multi_node_one_route_no_change(self) -> None:
        input = [
            {
                "node_name": "A",
                "routes": [["X", "Y", "Z"]],
                "last_updated": "datetime_0",
            },
            {
                "node_name": "B",
                "routes": [["D", "G", "Y"]],
                "last_updated": "datetime_0",
            },
        ]
        expected_output = {
            "A": {"datetime_0": [["X", "Y", "Z"]]},
            "B": {"datetime_0": [["D", "G", "Y"]]},
        }
        actual_output = _get_default_routes_history_impl(input)
        self.assertDictEqual(actual_output, expected_output)

    def test_multi_node_two_routes_one_change(self) -> None:
        input = [
            {
                "node_name": "A",
                "routes": [["X", "Y", "Z"]],
                "last_updated": "datetime_0",
            },
            {
                "node_name": "A",
                "routes": [["A", "B", "C"]],
                "last_updated": "datetime_3",
            },
            {
                "node_name": "B",
                "routes": [["E", "R", "T"]],
                "last_updated": "datetime_0",
            },
            {
                "node_name": "B",
                "routes": [["U", "I", "O"]],
                "last_updated": "datetime_7",
            },
        ]
        expected_output = {
            "A": {"datetime_0": [["X", "Y", "Z"]], "datetime_3": [["A", "B", "C"]]},
            "B": {"datetime_0": [["E", "R", "T"]], "datetime_7": [["U", "I", "O"]]},
        }
        actual_output = _get_default_routes_history_impl(input)
        self.assertDictEqual(actual_output, expected_output)

    def test_multi_node_two_routes_two_changes(self) -> None:
        input = [
            {
                "node_name": "A",
                "routes": [["X", "Y", "Z"]],
                "last_updated": "datetime_0",
            },
            {
                "node_name": "A",
                "routes": [["A", "B", "C"]],
                "last_updated": "datetime_3",
            },
            {
                "node_name": "A",
                "routes": [["X", "Y", "Z"]],
                "last_updated": "datetime_6",
            },
            {
                "node_name": "B",
                "routes": [["X", "Y", "Z"]],
                "last_updated": "datetime_0",
            },
            {
                "node_name": "B",
                "routes": [["A", "B", "C"]],
                "last_updated": "datetime_3",
            },
            {
                "node_name": "B",
                "routes": [["X", "Y", "Z"]],
                "last_updated": "datetime_6",
            },
        ]
        expected_output = {
            "A": {
                "datetime_0": [["X", "Y", "Z"]],
                "datetime_3": [["A", "B", "C"]],
                "datetime_6": [["X", "Y", "Z"]],
            },
            "B": {
                "datetime_0": [["X", "Y", "Z"]],
                "datetime_3": [["A", "B", "C"]],
                "datetime_6": [["X", "Y", "Z"]],
            },
        }
        actual_output = _get_default_routes_history_impl(input)
        self.assertDictEqual(actual_output, expected_output)

    def test_multi_node_one_ecmp_route_no_change(self) -> None:
        input = [
            {
                "node_name": "A",
                "routes": [["X", "U", "Z"], ["X", "Y", "Z"]],
                "last_updated": "datetime_0",
            },
            {
                "node_name": "B",
                "routes": [["B", "G", "D"], ["B", "J", "D"]],
                "last_updated": "datetime_0",
            },
        ]
        expected_output = {
            "A": {"datetime_0": [["X", "U", "Z"], ["X", "Y", "Z"]]},
            "B": {"datetime_0": [["B", "G", "D"], ["B", "J", "D"]]},
        }
        actual_output = _get_default_routes_history_impl(input)
        self.assertDictEqual(actual_output, expected_output)

    def test_multi_node_two_ecmp_routes_one_change(self) -> None:
        input = [
            {
                "node_name": "A",
                "routes": [["X", "Y", "Z"], ["X", "Y", "Z"]],
                "last_updated": "datetime_0",
            },
            {
                "node_name": "A",
                "routes": [["A", "B", "C"], ["A", "G", "C"]],
                "last_updated": "datetime_3",
            },
            {
                "node_name": "B",
                "routes": [["X", "Y", "Z"], ["X", "Y", "Z"]],
                "last_updated": "datetime_0",
            },
            {
                "node_name": "B",
                "routes": [["A", "B", "C"], ["A", "G", "C"]],
                "last_updated": "datetime_3",
            },
        ]
        expected_output = {
            "A": {
                "datetime_0": [["X", "Y", "Z"], ["X", "Y", "Z"]],
                "datetime_3": [["A", "B", "C"], ["A", "G", "C"]],
            },
            "B": {
                "datetime_0": [["X", "Y", "Z"], ["X", "Y", "Z"]],
                "datetime_3": [["A", "B", "C"], ["A", "G", "C"]],
            },
        }
        actual_output = _get_default_routes_history_impl(input)
        self.assertDictEqual(actual_output, expected_output)

    def test_multi_node_two_ecmp_routes_two_changes(self) -> None:
        input = [
            {
                "node_name": "A",
                "routes": [["X", "Y", "Z"], ["X", "T", "Z"]],
                "last_updated": "datetime_0",
            },
            {
                "node_name": "A",
                "routes": [["A", "B", "C"], ["A", "G", "C"]],
                "last_updated": "datetime_3",
            },
            {
                "node_name": "A",
                "routes": [["X", "Y", "Z"], ["X", "T", "Z"]],
                "last_updated": "datetime_6",
            },
            {
                "node_name": "B",
                "routes": [["X", "Y", "Z"], ["X", "T", "Z"]],
                "last_updated": "datetime_0",
            },
            {
                "node_name": "B",
                "routes": [["A", "B", "C"], ["A", "G", "C"]],
                "last_updated": "datetime_3",
            },
            {
                "node_name": "B",
                "routes": [["X", "Y", "Z"], ["X", "T", "Z"]],
                "last_updated": "datetime_6",
            },
        ]
        expected_output = {
            "A": {
                "datetime_0": [["X", "Y", "Z"], ["X", "T", "Z"]],
                "datetime_3": [["A", "B", "C"], ["A", "G", "C"]],
                "datetime_6": [["X", "Y", "Z"], ["X", "T", "Z"]],
            },
            "B": {
                "datetime_0": [["X", "Y", "Z"], ["X", "T", "Z"]],
                "datetime_3": [["A", "B", "C"], ["A", "G", "C"]],
                "datetime_6": [["X", "Y", "Z"], ["X", "T", "Z"]],
            },
        }
        actual_output = _get_default_routes_history_impl(input)
        self.assertDictEqual(actual_output, expected_output)

    def test_multi_ecmp_one_normal_route_two_changes(self) -> None:
        input = [
            {
                "node_name": "A",
                "routes": [["X", "Y", "Z"], ["X", "E", "Z"]],
                "last_updated": "datetime_0",
            },
            {
                "node_name": "A",
                "routes": [["A", "B", "C"]],
                "last_updated": "datetime_3",
            },
            {
                "node_name": "A",
                "routes": [["X", "Y", "Z"], ["X", "E", "Z"]],
                "last_updated": "datetime_8",
            },
            {
                "node_name": "B",
                "routes": [["X", "Y", "Z"], ["X", "E", "Z"]],
                "last_updated": "datetime_0",
            },
            {
                "node_name": "B",
                "routes": [["A", "B", "C"]],
                "last_updated": "datetime_3",
            },
            {
                "node_name": "B",
                "routes": [["X", "Y", "Z"], ["X", "E", "Z"]],
                "last_updated": "datetime_8",
            },
        ]
        expected_output = {
            "A": {
                "datetime_0": [["X", "Y", "Z"], ["X", "E", "Z"]],
                "datetime_3": [["A", "B", "C"]],
                "datetime_8": [["X", "Y", "Z"], ["X", "E", "Z"]],
            },
            "B": {
                "datetime_0": [["X", "Y", "Z"], ["X", "E", "Z"]],
                "datetime_3": [["A", "B", "C"]],
                "datetime_8": [["X", "Y", "Z"], ["X", "E", "Z"]],
            },
        }
        actual_output = _get_default_routes_history_impl(input)
        self.assertDictEqual(actual_output, expected_output)
