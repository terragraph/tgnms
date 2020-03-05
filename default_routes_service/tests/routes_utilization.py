#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import unittest
from datetime import datetime
from typing import List
from unittest.mock import Mock

from default_routes_service.routes import compute_routes_utilization


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
        input = [
            Mock(node_name="A", routes=[], last_updated=last_updated, in_window=False)
        ]
        expected_output = {"A": {"[]": 100}}
        actual_output = compute_routes_utilization(
            raw_routes_data=input, start_dt=self.start_dt, end_dt=self.end_dt
        )
        self.assertDictEqual(expected_output, actual_output)

    def test_one_routes_in_window_no_previous_entry(self) -> None:
        last_updated = datetime.fromisoformat("2020-01-01T14:00:00")
        input = [
            Mock(node_name="A", routes=[], last_updated=last_updated, in_window=True)
        ]
        expected_output = {"A": {"None": 58.333, "[]": 41.667}}
        actual_output = compute_routes_utilization(
            raw_routes_data=input, start_dt=self.start_dt, end_dt=self.end_dt
        )
        self.assertDictEqual(expected_output, actual_output)

    def test_one_routes_change(self) -> None:
        last_updated_0 = datetime.fromisoformat("2019-12-31T00:00:00")
        last_updated_1 = datetime.fromisoformat("2020-01-01T14:00:00")
        input = [
            Mock(
                node_name="A", routes=[], last_updated=last_updated_0, in_window=False
            ),
            Mock(
                node_name="A",
                routes=[["X", "Y", "Z"]],
                last_updated=last_updated_1,
                in_window=True,
            ),
        ]
        expected_output = {"A": {"[]": 58.333, "[['X', 'Y', 'Z']]": 41.667}}
        actual_output = compute_routes_utilization(
            raw_routes_data=input, start_dt=self.start_dt, end_dt=self.end_dt
        )
        self.assertDictEqual(expected_output, actual_output)

    def test_one_node_ecmp(self) -> None:
        last_updated_0 = datetime.fromisoformat("2019-12-31T00:00:00")
        last_updated_1 = datetime.fromisoformat("2020-01-01T14:00:00")
        input = [
            Mock(
                node_name="A", routes=[], last_updated=last_updated_0, in_window=False
            ),
            Mock(
                node_name="A",
                routes=[["X", "Y", "Z"], ["A", "G", "H"]],
                last_updated=last_updated_1,
                in_window=True,
            ),
        ]
        expected_output = {
            "A": {"[['X', 'Y', 'Z'], ['A', 'G', 'H']]": 41.667, "[]": 58.333}
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
            Mock(
                node_name="A", routes=[], last_updated=last_updated_0, in_window=False
            ),
            Mock(
                node_name="A",
                routes=[["X", "Y", "Z"]],
                last_updated=last_updated_1,
                in_window=True,
            ),
            Mock(
                node_name="A",
                routes=[["D", "G", "H"]],
                last_updated=last_updated_2,
                in_window=True,
            ),
        ]
        expected_output = {
            "A": {"[]": 58.333, "[['X', 'Y', 'Z']]": 16.667, "[['D', 'G', 'H']]": 25.0}
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
            Mock(
                node_name="A", routes=[], last_updated=last_updated_0, in_window=False
            ),
            Mock(
                node_name="A",
                routes=[["X", "Y", "Z"], ["X", "V", "Z"]],
                last_updated=last_updated_1,
                in_window=True,
            ),
            Mock(
                node_name="A",
                routes=[["D", "G", "H"], ["D", "F", "H"]],
                last_updated=last_updated_2,
                in_window=True,
            ),
        ]
        expected_output = {
            "A": {
                "[]": 58.333,
                "[['X', 'Y', 'Z'], ['X', 'V', 'Z']]": 16.667,
                "[['D', 'G', 'H'], ['D', 'F', 'H']]": 25.0,
            }
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
            Mock(
                node_name="A", routes=[], last_updated=last_updated_0, in_window=False
            ),
            Mock(
                node_name="A",
                routes=[["X", "Y", "Z"], ["X", "V", "Z"]],
                last_updated=last_updated_1,
                in_window=True,
            ),
            Mock(
                node_name="A",
                routes=[["X", "Y", "Z"]],
                last_updated=last_updated_2,
                in_window=True,
            ),
            Mock(
                node_name="A",
                routes=[["X", "Y", "Z"], ["X", "V", "Z"]],
                last_updated=last_updated_3,
                in_window=True,
            ),
        ]
        expected_output = {
            "A": {
                "[]": 8.333,
                "[['X', 'Y', 'Z'], ['X', 'V', 'Z']]": 87.5,
                "[['X', 'Y', 'Z']]": 4.167,
            }
        }
        actual_output = compute_routes_utilization(
            raw_routes_data=input, start_dt=self.start_dt, end_dt=self.end_dt
        )
        self.assertDictEqual(expected_output, actual_output)

    def test_multi_node_no_routes_in_window_two_nodes(self) -> None:
        last_updated = datetime.fromisoformat("2019-12-31T00:00:00")
        input = [
            Mock(node_name="A", routes=[], last_updated=last_updated, in_window=False),
            Mock(node_name="B", routes=[], last_updated=last_updated, in_window=False),
        ]
        expected_output = {"A": {"[]": 100}, "B": {"[]": 100}}
        actual_output = compute_routes_utilization(
            raw_routes_data=input, start_dt=self.start_dt, end_dt=self.end_dt
        )
        self.assertDictEqual(expected_output, actual_output)

    def test_multi_node_one_routes_in_window_no_previous_entry(self) -> None:
        last_updated = datetime.fromisoformat("2020-01-01T14:00:00")
        input = [
            Mock(node_name="A", routes=[], last_updated=last_updated, in_window=True),
            Mock(node_name="B", routes=[], last_updated=last_updated, in_window=True),
        ]
        expected_output = {
            "A": {"None": 58.333, "[]": 41.667},
            "B": {"None": 58.333, "[]": 41.667},
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
            Mock(node_name="A", routes=[], last_updated=last_updated, in_window=False),
            Mock(node_name="A", routes=[], last_updated=last_updated_A, in_window=True),
            Mock(node_name="B", routes=[], last_updated=last_updated, in_window=False),
            Mock(node_name="B", routes=[], last_updated=last_updated_B, in_window=True),
        ]
        expected_output = {"A": {"[]": 100}, "B": {"[]": 100}}
        actual_output = compute_routes_utilization(
            raw_routes_data=input, start_dt=self.start_dt, end_dt=self.end_dt
        )
        self.assertDictEqual(expected_output, actual_output)

    def test_multi_node_one_routes_change(self) -> None:
        last_updated_0 = datetime.fromisoformat("2019-12-31T00:00:00")
        last_updated_A = datetime.fromisoformat("2020-01-01T14:00:00")
        last_updated_B = datetime.fromisoformat("2020-01-01T18:00:00")
        input = [
            Mock(
                node_name="A", routes=[], last_updated=last_updated_0, in_window=False
            ),
            Mock(
                node_name="A",
                routes=[["X", "Y", "Z"]],
                last_updated=last_updated_A,
                in_window=True,
            ),
            Mock(
                node_name="B", routes=[], last_updated=last_updated_0, in_window=False
            ),
            Mock(
                node_name="B",
                routes=[["G", "H", "I"]],
                last_updated=last_updated_B,
                in_window=True,
            ),
        ]
        expected_output = {
            "A": {"[]": 58.333, "[['X', 'Y', 'Z']]": 41.667},
            "B": {"[]": 75.0, "[['G', 'H', 'I']]": 25.0},
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
            Mock(
                node_name="A", routes=[], last_updated=last_updated_0, in_window=False
            ),
            Mock(
                node_name="A",
                routes=[["X", "Y", "Z"], ["X", "G", "Z"]],
                last_updated=last_updated_A,
                in_window=True,
            ),
            Mock(
                node_name="B", routes=[], last_updated=last_updated_0, in_window=False
            ),
            Mock(
                node_name="B",
                routes=[["G", "T", "H"], ["G", "U", "H"]],
                last_updated=last_updated_B,
                in_window=True,
            ),
        ]
        expected_output = {
            "A": {"[]": 58.333, "[['X', 'Y', 'Z'], ['X', 'G', 'Z']]": 41.667},
            "B": {"[]": 75.0, "[['G', 'T', 'H'], ['G', 'U', 'H']]": 25.0},
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
            Mock(
                node_name="A", routes=[], last_updated=last_updated_0, in_window=False
            ),
            Mock(
                node_name="A",
                routes=[["X", "Y", "Z"]],
                last_updated=last_updated_A1,
                in_window=True,
            ),
            Mock(
                node_name="A",
                routes=[["D", "G", "H"]],
                last_updated=last_updated_A2,
                in_window=True,
            ),
            Mock(
                node_name="B", routes=[], last_updated=last_updated_0, in_window=False
            ),
            Mock(
                node_name="B",
                routes=[["H", "U", "I"]],
                last_updated=last_updated_B1,
                in_window=True,
            ),
            Mock(
                node_name="B",
                routes=[["E", "T", "M"]],
                last_updated=last_updated_B2,
                in_window=True,
            ),
        ]
        expected_output = {
            "A": {"[['D', 'G', 'H']]": 29.167, "[['X', 'Y', 'Z']]": 12.5, "[]": 58.333},
            "B": {"[['E', 'T', 'M']]": 25, "[['H', 'U', 'I']]": 8.333, "[]": 66.667},
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
            Mock(
                node_name="A", routes=[], last_updated=last_updated_0, in_window=False
            ),
            Mock(
                node_name="A",
                routes=[["X", "Y", "Z"], ["X", "Y", "V"]],
                last_updated=last_updated_A1,
                in_window=True,
            ),
            Mock(
                node_name="A",
                routes=[["D", "G", "H"], ["D", "G", "F"]],
                last_updated=last_updated_A2,
                in_window=True,
            ),
            Mock(
                node_name="B", routes=[], last_updated=last_updated_0, in_window=False
            ),
            Mock(
                node_name="B",
                routes=[["H", "U", "I"], ["H", "U", "D"]],
                last_updated=last_updated_B1,
                in_window=True,
            ),
            Mock(
                node_name="B",
                routes=[["E", "T", "M"], ["E", "T", "R"]],
                last_updated=last_updated_B2,
                in_window=True,
            ),
        ]
        expected_output = {
            "A": {
                "[['D', 'G', 'H'], ['D', 'G', 'F']]": 29.167,
                "[['X', 'Y', 'Z'], ['X', 'Y', 'V']]": 12.5,
                "[]": 58.333,
            },
            "B": {
                "[['E', 'T', 'M'], ['E', 'T', 'R']]": 25,
                "[['H', 'U', 'I'], ['H', 'U', 'D']]": 8.333,
                "[]": 66.667,
            },
        }
        actual_output = compute_routes_utilization(
            raw_routes_data=input, start_dt=self.start_dt, end_dt=self.end_dt
        )
        self.assertDictEqual(expected_output, actual_output)
