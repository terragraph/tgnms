#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import unittest

from default_routes_service.routes import _get_default_routes_history_impl


class TestRoutesHistory(unittest.TestCase):
    def test_one_node_no_routes(self) -> None:
        input = [
            {
                "node_name": "A",
                "routes": [],
                "last_updated": "datetime_0",
                "hop_count": 0,
            }
        ]
        expected_output = {"A": {"datetime_0": {"routes": [], "hop_count": 0}}}
        actual_output = _get_default_routes_history_impl(input)
        self.assertDictEqual(actual_output, expected_output)

    def test_one_node_one_route_no_change(self) -> None:
        input = [
            {
                "node_name": "A",
                "routes": [["X", "Y", "Z"]],
                "last_updated": "datetime_0",
                "hop_count": 2,
            }
        ]
        expected_output = {
            "A": {"datetime_0": {"routes": [["X", "Y", "Z"]], "hop_count": 2}}
        }
        actual_output = _get_default_routes_history_impl(input)
        self.assertDictEqual(actual_output, expected_output)

    def test_one_node_two_routes_one_change(self) -> None:
        input = [
            {
                "node_name": "A",
                "routes": [["X", "Y", "Z"]],
                "last_updated": "datetime_0",
                "hop_count": 2,
            },
            {
                "node_name": "A",
                "routes": [["A", "B", "C"]],
                "last_updated": "datetime_3",
                "hop_count": 2,
            },
        ]
        expected_output = {
            "A": {
                "datetime_0": {"routes": [["X", "Y", "Z"]], "hop_count": 2},
                "datetime_3": {"routes": [["A", "B", "C"]], "hop_count": 2},
            }
        }
        actual_output = _get_default_routes_history_impl(input)
        self.assertDictEqual(actual_output, expected_output)

    def test_one_node_two_routes_two_changes(self) -> None:
        input = [
            {
                "node_name": "A",
                "routes": [["X", "Y", "Z"]],
                "last_updated": "datetime_0",
                "hop_count": 2,
            },
            {
                "node_name": "A",
                "routes": [["A", "B", "C"]],
                "last_updated": "datetime_3",
                "hop_count": 2,
            },
            {
                "node_name": "A",
                "routes": [["X", "Y", "Z"]],
                "last_updated": "datetime_6",
                "hop_count": 2,
            },
        ]
        expected_output = {
            "A": {
                "datetime_0": {"routes": [["X", "Y", "Z"]], "hop_count": 2},
                "datetime_3": {"routes": [["A", "B", "C"]], "hop_count": 2},
                "datetime_6": {"routes": [["X", "Y", "Z"]], "hop_count": 2},
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
                "hop_count": 2,
            }
        ]
        expected_output = {
            "A": {
                "datetime_0": {
                    "routes": [["X", "U", "Z"], ["X", "Y", "Z"]],
                    "hop_count": 2,
                }
            }
        }
        actual_output = _get_default_routes_history_impl(input)
        self.assertDictEqual(actual_output, expected_output)

    def test_one_node_two_ecmp_routes_one_change(self) -> None:
        input = [
            {
                "node_name": "A",
                "routes": [["X", "Y", "Z"], ["X", "Y", "Z"]],
                "last_updated": "datetime_0",
                "hop_count": 2,
            },
            {
                "node_name": "A",
                "routes": [["A", "B", "C"], ["A", "G", "C"]],
                "last_updated": "datetime_3",
                "hop_count": 2,
            },
        ]
        expected_output = {
            "A": {
                "datetime_0": {
                    "routes": [["X", "Y", "Z"], ["X", "Y", "Z"]],
                    "hop_count": 2,
                },
                "datetime_3": {
                    "routes": [["A", "B", "C"], ["A", "G", "C"]],
                    "hop_count": 2,
                },
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
                "hop_count": 2,
            },
            {
                "node_name": "A",
                "routes": [["A", "B", "C"], ["A", "G", "C"]],
                "last_updated": "datetime_3",
                "hop_count": 2,
            },
            {
                "node_name": "A",
                "routes": [["X", "Y", "Z"], ["X", "T", "Z"]],
                "last_updated": "datetime_6",
                "hop_count": 2,
            },
        ]
        expected_output = {
            "A": {
                "datetime_0": {
                    "routes": [["X", "Y", "Z"], ["X", "T", "Z"]],
                    "hop_count": 2,
                },
                "datetime_3": {
                    "routes": [["A", "B", "C"], ["A", "G", "C"]],
                    "hop_count": 2,
                },
                "datetime_6": {
                    "routes": [["X", "Y", "Z"], ["X", "T", "Z"]],
                    "hop_count": 2,
                },
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
                "hop_count": 2,
            },
            {
                "node_name": "A",
                "routes": [["A", "B", "C"]],
                "last_updated": "datetime_3",
                "hop_count": 2,
            },
            {
                "node_name": "A",
                "routes": [["X", "Y", "Z"], ["X", "E", "Z"]],
                "last_updated": "datetime_8",
                "hop_count": 2,
            },
        ]
        expected_output = {
            "A": {
                "datetime_0": {
                    "routes": [["X", "Y", "Z"], ["X", "E", "Z"]],
                    "hop_count": 2,
                },
                "datetime_3": {"routes": [["A", "B", "C"]], "hop_count": 2},
                "datetime_8": {
                    "routes": [["X", "Y", "Z"], ["X", "E", "Z"]],
                    "hop_count": 2,
                },
            }
        }
        actual_output = _get_default_routes_history_impl(input)
        self.assertDictEqual(actual_output, expected_output)

    def test_multi_node_no_routes(self) -> None:
        input = [
            {
                "node_name": "A",
                "routes": [],
                "last_updated": "datetime_0",
                "hop_count": 0,
            },
            {
                "node_name": "B",
                "routes": [],
                "last_updated": "datetime_0",
                "hop_count": 0,
            },
        ]
        expected_output = {
            "A": {"datetime_0": {"routes": [], "hop_count": 0}},
            "B": {"datetime_0": {"routes": [], "hop_count": 0}},
        }
        actual_output = _get_default_routes_history_impl(input)
        self.assertDictEqual(actual_output, expected_output)

    def test_multi_node_one_route_no_change(self) -> None:
        input = [
            {
                "node_name": "A",
                "routes": [["X", "Y", "Z"]],
                "last_updated": "datetime_0",
                "hop_count": 2,
            },
            {
                "node_name": "B",
                "routes": [["D", "G", "Y"]],
                "last_updated": "datetime_0",
                "hop_count": 2,
            },
        ]
        expected_output = {
            "A": {"datetime_0": {"routes": [["X", "Y", "Z"]], "hop_count": 2}},
            "B": {"datetime_0": {"routes": [["D", "G", "Y"]], "hop_count": 2}},
        }
        actual_output = _get_default_routes_history_impl(input)
        self.assertDictEqual(actual_output, expected_output)

    def test_multi_node_two_routes_one_change(self) -> None:
        input = [
            {
                "node_name": "A",
                "routes": [["X", "Y", "Z"]],
                "last_updated": "datetime_0",
                "hop_count": 2,
            },
            {
                "node_name": "A",
                "routes": [["A", "B", "C"]],
                "last_updated": "datetime_3",
                "hop_count": 2,
            },
            {
                "node_name": "B",
                "routes": [["E", "R", "T"]],
                "last_updated": "datetime_0",
                "hop_count": 2,
            },
            {
                "node_name": "B",
                "routes": [["U", "I", "O"]],
                "last_updated": "datetime_7",
                "hop_count": 2,
            },
        ]
        expected_output = {
            "A": {
                "datetime_0": {"routes": [["X", "Y", "Z"]], "hop_count": 2},
                "datetime_3": {"routes": [["A", "B", "C"]], "hop_count": 2},
            },
            "B": {
                "datetime_0": {"routes": [["E", "R", "T"]], "hop_count": 2},
                "datetime_7": {"routes": [["U", "I", "O"]], "hop_count": 2},
            },
        }
        actual_output = _get_default_routes_history_impl(input)
        self.assertDictEqual(actual_output, expected_output)

    def test_multi_node_two_routes_two_changes(self) -> None:
        input = [
            {
                "node_name": "A",
                "routes": [["X", "Y", "Z"]],
                "last_updated": "datetime_0",
                "hop_count": 2,
            },
            {
                "node_name": "A",
                "routes": [["A", "B", "C"]],
                "last_updated": "datetime_3",
                "hop_count": 2,
            },
            {
                "node_name": "A",
                "routes": [["X", "Y", "Z"]],
                "last_updated": "datetime_6",
                "hop_count": 2,
            },
            {
                "node_name": "B",
                "routes": [["X", "Y", "Z"]],
                "last_updated": "datetime_0",
                "hop_count": 2,
            },
            {
                "node_name": "B",
                "routes": [["A", "B", "C"]],
                "last_updated": "datetime_3",
                "hop_count": 2,
            },
            {
                "node_name": "B",
                "routes": [["X", "Y", "Z"]],
                "last_updated": "datetime_6",
                "hop_count": 2,
            },
        ]
        expected_output = {
            "A": {
                "datetime_0": {"routes": [["X", "Y", "Z"]], "hop_count": 2},
                "datetime_3": {"routes": [["A", "B", "C"]], "hop_count": 2},
                "datetime_6": {"routes": [["X", "Y", "Z"]], "hop_count": 2},
            },
            "B": {
                "datetime_0": {"routes": [["X", "Y", "Z"]], "hop_count": 2},
                "datetime_3": {"routes": [["A", "B", "C"]], "hop_count": 2},
                "datetime_6": {"routes": [["X", "Y", "Z"]], "hop_count": 2},
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
                "hop_count": 2,
            },
            {
                "node_name": "B",
                "routes": [["B", "G", "D"], ["B", "J", "D"]],
                "last_updated": "datetime_0",
                "hop_count": 2,
            },
        ]
        expected_output = {
            "A": {
                "datetime_0": {
                    "routes": [["X", "U", "Z"], ["X", "Y", "Z"]],
                    "hop_count": 2,
                }
            },
            "B": {
                "datetime_0": {
                    "routes": [["B", "G", "D"], ["B", "J", "D"]],
                    "hop_count": 2,
                }
            },
        }
        actual_output = _get_default_routes_history_impl(input)
        self.assertDictEqual(actual_output, expected_output)

    def test_multi_node_two_ecmp_routes_one_change(self) -> None:
        input = [
            {
                "node_name": "A",
                "routes": [["X", "Y", "Z"], ["X", "Y", "Z"]],
                "last_updated": "datetime_0",
                "hop_count": 2,
            },
            {
                "node_name": "A",
                "routes": [["A", "B", "C"], ["A", "G", "C"]],
                "last_updated": "datetime_3",
                "hop_count": 2,
            },
            {
                "node_name": "B",
                "routes": [["X", "Y", "Z"], ["X", "Y", "Z"]],
                "last_updated": "datetime_0",
                "hop_count": 2,
            },
            {
                "node_name": "B",
                "routes": [["A", "B", "C"], ["A", "G", "C"]],
                "last_updated": "datetime_3",
                "hop_count": 2,
            },
        ]
        expected_output = {
            "A": {
                "datetime_0": {
                    "routes": [["X", "Y", "Z"], ["X", "Y", "Z"]],
                    "hop_count": 2,
                },
                "datetime_3": {
                    "routes": [["A", "B", "C"], ["A", "G", "C"]],
                    "hop_count": 2,
                },
            },
            "B": {
                "datetime_0": {
                    "routes": [["X", "Y", "Z"], ["X", "Y", "Z"]],
                    "hop_count": 2,
                },
                "datetime_3": {
                    "routes": [["A", "B", "C"], ["A", "G", "C"]],
                    "hop_count": 2,
                },
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
                "hop_count": 2,
            },
            {
                "node_name": "A",
                "routes": [["A", "B", "C"], ["A", "G", "C"]],
                "last_updated": "datetime_3",
                "hop_count": 2,
            },
            {
                "node_name": "A",
                "routes": [["X", "Y", "Z"], ["X", "T", "Z"]],
                "last_updated": "datetime_6",
                "hop_count": 2,
            },
            {
                "node_name": "B",
                "routes": [["X", "Y", "Z"], ["X", "T", "Z"]],
                "last_updated": "datetime_0",
                "hop_count": 2,
            },
            {
                "node_name": "B",
                "routes": [["A", "B", "C"], ["A", "G", "C"]],
                "last_updated": "datetime_3",
                "hop_count": 2,
            },
            {
                "node_name": "B",
                "routes": [["X", "Y", "Z"], ["X", "T", "Z"]],
                "last_updated": "datetime_6",
                "hop_count": 2,
            },
        ]
        expected_output = {
            "A": {
                "datetime_0": {
                    "routes": [["X", "Y", "Z"], ["X", "T", "Z"]],
                    "hop_count": 2,
                },
                "datetime_3": {
                    "routes": [["A", "B", "C"], ["A", "G", "C"]],
                    "hop_count": 2,
                },
                "datetime_6": {
                    "routes": [["X", "Y", "Z"], ["X", "T", "Z"]],
                    "hop_count": 2,
                },
            },
            "B": {
                "datetime_0": {
                    "routes": [["X", "Y", "Z"], ["X", "T", "Z"]],
                    "hop_count": 2,
                },
                "datetime_3": {
                    "routes": [["A", "B", "C"], ["A", "G", "C"]],
                    "hop_count": 2,
                },
                "datetime_6": {
                    "routes": [["X", "Y", "Z"], ["X", "T", "Z"]],
                    "hop_count": 2,
                },
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
                "hop_count": 2,
            },
            {
                "node_name": "A",
                "routes": [["A", "B", "C"]],
                "last_updated": "datetime_3",
                "hop_count": 2,
            },
            {
                "node_name": "A",
                "routes": [["X", "Y", "Z"], ["X", "E", "Z"]],
                "last_updated": "datetime_8",
                "hop_count": 2,
            },
            {
                "node_name": "B",
                "routes": [["X", "Y", "Z"], ["X", "E", "Z"]],
                "last_updated": "datetime_0",
                "hop_count": 2,
            },
            {
                "node_name": "B",
                "routes": [["A", "B", "C"]],
                "last_updated": "datetime_3",
                "hop_count": 2,
            },
            {
                "node_name": "B",
                "routes": [["X", "Y", "Z"], ["X", "E", "Z"]],
                "last_updated": "datetime_8",
                "hop_count": 2,
            },
        ]
        expected_output = {
            "A": {
                "datetime_0": {
                    "routes": [["X", "Y", "Z"], ["X", "E", "Z"]],
                    "hop_count": 2,
                },
                "datetime_3": {"routes": [["A", "B", "C"]], "hop_count": 2},
                "datetime_8": {
                    "routes": [["X", "Y", "Z"], ["X", "E", "Z"]],
                    "hop_count": 2,
                },
            },
            "B": {
                "datetime_0": {
                    "routes": [["X", "Y", "Z"], ["X", "E", "Z"]],
                    "hop_count": 2,
                },
                "datetime_3": {"routes": [["A", "B", "C"]], "hop_count": 2},
                "datetime_8": {
                    "routes": [["X", "Y", "Z"], ["X", "E", "Z"]],
                    "hop_count": 2,
                },
            },
        }
        actual_output = _get_default_routes_history_impl(input)
        self.assertDictEqual(actual_output, expected_output)
