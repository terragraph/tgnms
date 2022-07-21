#!/usr/bin/env python3

# Copyright (c) Meta Platforms, Inc. and affiliates.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

import unittest
from datetime import datetime
from typing import List
from unittest.mock import Mock

from default_routes_service.utils.utilization import (
    compute_routes_utilization,
    to_list,
    to_tuple,
)


class RoutesUtilizationTests(unittest.TestCase):
    def setUp(self) -> None:
        self.start_dt = datetime.fromisoformat("2020-01-01T00:00:00")
        self.end_dt = datetime.fromisoformat("2020-01-02T00:00:00")

    def test_no_previous_entry(self) -> None:
        input = []
        expected_output = {}
        actual_output = compute_routes_utilization(
            raw_routes_data=input, start_dt=self.start_dt, end_dt=self.end_dt
        )
        self.assertDictEqual(expected_output, actual_output)

    def test_no_routes_in_window(self) -> None:
        last_updated = datetime.fromisoformat("2019-12-31T00:00:00")
        input = [Mock(node_name="A", routes=[], last_updated=last_updated)]
        expected_output = {"A": [{"routes": [], "percentage": 100}]}
        actual_output = compute_routes_utilization(
            raw_routes_data=input, start_dt=self.start_dt, end_dt=self.end_dt
        )
        self.assertDictEqual(expected_output, actual_output)

    def test_one_routes_in_window_no_previous_entry(self) -> None:
        last_updated = datetime.fromisoformat("2020-01-01T14:00:00")
        input = [Mock(node_name="A", routes=[], last_updated=last_updated)]
        expected_output = {
            "A": [
                {"routes": None, "percentage": 58.333},
                {"routes": [], "percentage": 41.667},
            ]
        }
        actual_output = compute_routes_utilization(
            raw_routes_data=input, start_dt=self.start_dt, end_dt=self.end_dt
        )
        self.assertDictEqual(expected_output, actual_output)

    def test_one_routes_change(self) -> None:
        last_updated_0 = datetime.fromisoformat("2019-12-31T00:00:00")
        last_updated_1 = datetime.fromisoformat("2020-01-01T14:00:00")
        input = [
            Mock(node_name="A", routes=[], last_updated=last_updated_0),
            Mock(node_name="A", routes=[["X", "Y", "Z"]], last_updated=last_updated_1),
        ]
        expected_output = {
            "A": [
                {"routes": [], "percentage": 58.333},
                {"routes": [["X", "Y", "Z"]], "percentage": 41.667},
            ]
        }
        actual_output = compute_routes_utilization(
            raw_routes_data=input, start_dt=self.start_dt, end_dt=self.end_dt
        )
        self.assertDictEqual(expected_output, actual_output)

    def test_one_node_ecmp(self) -> None:
        last_updated_0 = datetime.fromisoformat("2019-12-31T00:00:00")
        last_updated_1 = datetime.fromisoformat("2020-01-01T14:00:00")
        input = [
            Mock(node_name="A", routes=[], last_updated=last_updated_0),
            Mock(
                node_name="A",
                routes=[["X", "Y", "Z"], ["A", "G", "H"]],
                last_updated=last_updated_1,
            ),
        ]
        expected_output = {
            "A": [
                {"routes": [], "percentage": 58.333},
                {"routes": [["X", "Y", "Z"], ["A", "G", "H"]], "percentage": 41.667},
            ]
        }
        actual_output = compute_routes_utilization(
            raw_routes_data=input, start_dt=self.start_dt, end_dt=self.end_dt
        )
        self.assertDictEqual(expected_output, actual_output)

    def test_one_node_routes_without_ecmp(self) -> None:
        last_updated_0 = datetime.fromisoformat("2019-12-31T00:00:00")
        last_updated_1 = datetime.fromisoformat("2020-01-01T14:00:00")
        last_updated_2 = datetime.fromisoformat("2020-01-01T18:00:00")
        input = [
            Mock(node_name="A", routes=[], last_updated=last_updated_0),
            Mock(node_name="A", routes=[["X", "Y", "Z"]], last_updated=last_updated_1),
            Mock(node_name="A", routes=[["D", "G", "H"]], last_updated=last_updated_2),
        ]
        expected_output = {
            "A": [
                {"routes": [], "percentage": 58.333},
                {"routes": [["X", "Y", "Z"]], "percentage": 16.667},
                {"routes": [["D", "G", "H"]], "percentage": 25.0},
            ]
        }
        actual_output = compute_routes_utilization(
            raw_routes_data=input, start_dt=self.start_dt, end_dt=self.end_dt
        )
        self.assertDictEqual(expected_output, actual_output)

    def test_one_node_routes_with_ecmp(self) -> None:
        last_updated_0 = datetime.fromisoformat("2019-12-31T00:00:00")
        last_updated_1 = datetime.fromisoformat("2020-01-01T14:00:00")
        last_updated_2 = datetime.fromisoformat("2020-01-01T18:00:00")
        input = [
            Mock(node_name="A", routes=[], last_updated=last_updated_0),
            Mock(
                node_name="A",
                routes=[["X", "Y", "Z"], ["X", "V", "Z"]],
                last_updated=last_updated_1,
            ),
            Mock(
                node_name="A",
                routes=[["D", "G", "H"], ["D", "F", "H"]],
                last_updated=last_updated_2,
            ),
        ]
        expected_output = {
            "A": [
                {"routes": [], "percentage": 58.333},
                {"routes": [["X", "Y", "Z"], ["X", "V", "Z"]], "percentage": 16.667},
                {"routes": [["D", "G", "H"], ["D", "F", "H"]], "percentage": 25.0},
            ]
        }
        actual_output = compute_routes_utilization(
            raw_routes_data=input, start_dt=self.start_dt, end_dt=self.end_dt
        )
        self.assertDictEqual(expected_output, actual_output)

    def test_one_node_ecmp_to_no_ecmp(self) -> None:
        last_updated_0 = datetime.fromisoformat("2019-12-31T00:00:00")
        last_updated_1 = datetime.fromisoformat("2020-01-01T02:00:00")
        last_updated_2 = datetime.fromisoformat("2020-01-01T18:00:00")
        last_updated_3 = datetime.fromisoformat("2020-01-01T19:00:00")
        input = [
            Mock(node_name="A", routes=[], last_updated=last_updated_0),
            Mock(
                node_name="A",
                routes=[["X", "Y", "Z"], ["X", "V", "Z"]],
                last_updated=last_updated_1,
            ),
            Mock(node_name="A", routes=[["X", "Y", "Z"]], last_updated=last_updated_2),
            Mock(
                node_name="A",
                routes=[["X", "Y", "Z"], ["X", "V", "Z"]],
                last_updated=last_updated_3,
            ),
        ]
        expected_output = {
            "A": [
                {"routes": [], "percentage": 8.333},
                {"routes": [["X", "Y", "Z"], ["X", "V", "Z"]], "percentage": 87.5},
                {"routes": [["X", "Y", "Z"]], "percentage": 4.167},
            ]
        }
        actual_output = compute_routes_utilization(
            raw_routes_data=input, start_dt=self.start_dt, end_dt=self.end_dt
        )
        self.assertDictEqual(expected_output, actual_output)

    def test_multi_node_no_routes_in_window_two_nodes(self) -> None:
        last_updated = datetime.fromisoformat("2019-12-31T00:00:00")
        input = [
            Mock(node_name="A", routes=[], last_updated=last_updated),
            Mock(node_name="B", routes=[], last_updated=last_updated),
        ]
        expected_output = {
            "A": [{"routes": [], "percentage": 100}],
            "B": [{"routes": [], "percentage": 100}],
        }
        actual_output = compute_routes_utilization(
            raw_routes_data=input, start_dt=self.start_dt, end_dt=self.end_dt
        )
        self.assertDictEqual(expected_output, actual_output)

    def test_multi_node_one_routes_in_window_no_previous_entry(self) -> None:
        last_updated = datetime.fromisoformat("2020-01-01T14:00:00")
        input = [
            Mock(node_name="A", routes=[], last_updated=last_updated),
            Mock(node_name="B", routes=[], last_updated=last_updated),
        ]
        expected_output = {
            "A": [
                {"routes": None, "percentage": 58.333},
                {"routes": [], "percentage": 41.667},
            ],
            "B": [
                {"routes": None, "percentage": 58.333},
                {"routes": [], "percentage": 41.667},
            ],
        }
        actual_output = compute_routes_utilization(
            raw_routes_data=input, start_dt=self.start_dt, end_dt=self.end_dt
        )
        self.assertDictEqual(expected_output, actual_output)

    def test_multi_node_empty_routes(self) -> None:
        last_updated = datetime.fromisoformat("2019-12-31T00:00:00")
        last_updated_A = datetime.fromisoformat("2020-01-01T14:00:00")
        last_updated_B = datetime.fromisoformat("2020-01-01T18:00:00")
        input = [
            Mock(node_name="A", routes=[], last_updated=last_updated),
            Mock(node_name="A", routes=[], last_updated=last_updated_A),
            Mock(node_name="B", routes=[], last_updated=last_updated),
            Mock(node_name="B", routes=[], last_updated=last_updated_B),
        ]
        expected_output = {
            "A": [{"routes": [], "percentage": 100}],
            "B": [{"routes": [], "percentage": 100}],
        }
        actual_output = compute_routes_utilization(
            raw_routes_data=input, start_dt=self.start_dt, end_dt=self.end_dt
        )
        self.assertDictEqual(expected_output, actual_output)

    def test_multi_node_one_routes_change(self) -> None:
        last_updated_0 = datetime.fromisoformat("2019-12-31T00:00:00")
        last_updated_A = datetime.fromisoformat("2020-01-01T14:00:00")
        last_updated_B = datetime.fromisoformat("2020-01-01T18:00:00")
        input = [
            Mock(node_name="A", routes=[], last_updated=last_updated_0),
            Mock(node_name="A", routes=[["X", "Y", "Z"]], last_updated=last_updated_A),
            Mock(node_name="B", routes=[], last_updated=last_updated_0),
            Mock(node_name="B", routes=[["G", "H", "I"]], last_updated=last_updated_B),
        ]
        expected_output = {
            "A": [
                {"routes": [], "percentage": 58.333},
                {"routes": [["X", "Y", "Z"]], "percentage": 41.667},
            ],
            "B": [
                {"routes": [], "percentage": 75.0},
                {"routes": [["G", "H", "I"]], "percentage": 25.0},
            ],
        }
        actual_output = compute_routes_utilization(
            raw_routes_data=input, start_dt=self.start_dt, end_dt=self.end_dt
        )
        self.assertDictEqual(expected_output, actual_output)

    def test_multi_node_ecmp(self) -> None:
        last_updated_0 = datetime.fromisoformat("2019-12-31T00:00:00")
        last_updated_A = datetime.fromisoformat("2020-01-01T14:00:00")
        last_updated_B = datetime.fromisoformat("2020-01-01T18:00:00")
        input = [
            Mock(node_name="A", routes=[], last_updated=last_updated_0),
            Mock(
                node_name="A",
                routes=[["X", "Y", "Z"], ["X", "G", "Z"]],
                last_updated=last_updated_A,
            ),
            Mock(node_name="B", routes=[], last_updated=last_updated_0),
            Mock(
                node_name="B",
                routes=[["G", "T", "H"], ["G", "U", "H"]],
                last_updated=last_updated_B,
            ),
        ]
        expected_output = {
            "A": [
                {"routes": [], "percentage": 58.333},
                {"routes": [["X", "Y", "Z"], ["X", "G", "Z"]], "percentage": 41.667},
            ],
            "B": [
                {"routes": [], "percentage": 75.0},
                {"routes": [["G", "T", "H"], ["G", "U", "H"]], "percentage": 25.0},
            ],
        }
        actual_output = compute_routes_utilization(
            raw_routes_data=input, start_dt=self.start_dt, end_dt=self.end_dt
        )
        self.assertDictEqual(expected_output, actual_output)

    def test_multi_node_multi_routes_without_ecmp(self) -> None:
        last_updated_0 = datetime.fromisoformat("2019-12-31T00:00:00")
        last_updated_A1 = datetime.fromisoformat("2020-01-01T14:00:00")
        last_updated_A2 = datetime.fromisoformat("2020-01-01T17:00:00")
        last_updated_B1 = datetime.fromisoformat("2020-01-01T16:00:00")
        last_updated_B2 = datetime.fromisoformat("2020-01-01T18:00:00")
        input = [
            Mock(node_name="A", routes=[], last_updated=last_updated_0),
            Mock(node_name="A", routes=[["X", "Y", "Z"]], last_updated=last_updated_A1),
            Mock(node_name="A", routes=[["D", "G", "H"]], last_updated=last_updated_A2),
            Mock(node_name="B", routes=[], last_updated=last_updated_0),
            Mock(node_name="B", routes=[["H", "U", "I"]], last_updated=last_updated_B1),
            Mock(node_name="B", routes=[["E", "T", "M"]], last_updated=last_updated_B2),
        ]
        expected_output = {
            "A": [
                {"routes": [], "percentage": 58.333},
                {"routes": [["X", "Y", "Z"]], "percentage": 12.5},
                {"routes": [["D", "G", "H"]], "percentage": 29.167},
            ],
            "B": [
                {"routes": [], "percentage": 66.667},
                {"routes": [["H", "U", "I"]], "percentage": 8.333},
                {"routes": [["E", "T", "M"]], "percentage": 25.0},
            ],
        }
        actual_output = compute_routes_utilization(
            raw_routes_data=input, start_dt=self.start_dt, end_dt=self.end_dt
        )
        self.assertDictEqual(expected_output, actual_output)

    def test_multi_node_ecmp_multi_routes_with_ecmp(self) -> None:
        last_updated_0 = datetime.fromisoformat("2019-12-31T00:00:00")
        last_updated_A1 = datetime.fromisoformat("2020-01-01T14:00:00")
        last_updated_A2 = datetime.fromisoformat("2020-01-01T17:00:00")
        last_updated_B1 = datetime.fromisoformat("2020-01-01T16:00:00")
        last_updated_B2 = datetime.fromisoformat("2020-01-01T18:00:00")
        input = [
            Mock(node_name="A", routes=[], last_updated=last_updated_0),
            Mock(
                node_name="A",
                routes=[["X", "Y", "Z"], ["X", "Y", "V"]],
                last_updated=last_updated_A1,
            ),
            Mock(
                node_name="A",
                routes=[["D", "G", "H"], ["D", "G", "F"]],
                last_updated=last_updated_A2,
            ),
            Mock(node_name="B", routes=[], last_updated=last_updated_0),
            Mock(
                node_name="B",
                routes=[["H", "U", "I"], ["H", "U", "D"]],
                last_updated=last_updated_B1,
            ),
            Mock(
                node_name="B",
                routes=[["E", "T", "M"], ["E", "T", "R"]],
                last_updated=last_updated_B2,
            ),
        ]
        expected_output = {
            "A": [
                {"routes": [], "percentage": 58.333},
                {"routes": [["X", "Y", "Z"], ["X", "Y", "V"]], "percentage": 12.5},
                {"routes": [["D", "G", "H"], ["D", "G", "F"]], "percentage": 29.167},
            ],
            "B": [
                {"routes": [], "percentage": 66.667},
                {"routes": [["H", "U", "I"], ["H", "U", "D"]], "percentage": 8.333},
                {"routes": [["E", "T", "M"], ["E", "T", "R"]], "percentage": 25.0},
            ],
        }
        actual_output = compute_routes_utilization(
            raw_routes_data=input, start_dt=self.start_dt, end_dt=self.end_dt
        )
        self.assertDictEqual(expected_output, actual_output)

    def test_to_tuple(self) -> None:
        input = [["H", "U", "I"], ["H", "U", "D"]]
        expected_output = (("H", "U", "I"), ("H", "U", "D"))
        self.assertTupleEqual(to_tuple(input), expected_output)
        self.assertIsNone(to_tuple(None))

    def test_to_list(self) -> None:
        input = (("H", "U", "I"), ("H", "U", "D"))
        expected_output = [["H", "U", "I"], ["H", "U", "D"]]
        self.assertListEqual(to_list(input), expected_output)
        self.assertIsNone(to_list(None))
