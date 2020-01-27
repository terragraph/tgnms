#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import unittest
from datetime import datetime

from default_routes_service.routes import compute_routes_utilization


class RoutesUtilization(unittest.TestCase):
    def __init__(self, *args, **kwargs):
        super(RoutesUtilization, self).__init__(*args, **kwargs)
        self.start_dt = datetime.strptime("Jan 1 2020  12:00AM", "%b %d %Y %I:%M%p")
        self.end_dt = datetime.strptime("Jan 2 2020  12:00AM", "%b %d %Y %I:%M%p")

    def test_one_node_empty_routes(self) -> None:
        last_updated = datetime.strptime("Jan 1 2020  2:00PM", "%b %d %Y %I:%M%p")
        input = [
            {
                "node_name": "A",
                "routes": [],
                "prev_routes": [],
                "last_updated": last_updated,
            }
        ]
        expected_output = {"A": {"[]": 100}}
        actual_output = compute_routes_utilization(
            raw_routes_data=input, start_dt=self.start_dt, end_dt=self.end_dt
        )
        self.assertDictEqual(expected_output, actual_output)

    def test_one_routes_change(self) -> None:
        last_updated = datetime.strptime("Jan 1 2020  2:00PM", "%b %d %Y %I:%M%p")
        input = [
            {
                "node_name": "A",
                "routes": [["X", "Y", "Z"]],
                "prev_routes": [],
                "last_updated": last_updated,
            }
        ]
        expected_output = {"A": {"[]": 58.333, "[['X', 'Y', 'Z']]": 41.667}}
        actual_output = compute_routes_utilization(
            raw_routes_data=input, start_dt=self.start_dt, end_dt=self.end_dt
        )
        self.assertDictEqual(expected_output, actual_output)

    def test_one_node_ecmp(self) -> None:
        last_updated = datetime.strptime("Jan 1 2020  2:00PM", "%b %d %Y %I:%M%p")
        input = [
            {
                "node_name": "A",
                "routes": [["X", "Y", "Z"], ["A", "G", "H"]],
                "prev_routes": [],
                "last_updated": last_updated,
            }
        ]
        expected_output = {
            "A": {"[['X', 'Y', 'Z'], ['A', 'G', 'H']]": 41.667, "[]": 58.333}
        }
        actual_output = compute_routes_utilization(
            raw_routes_data=input, start_dt=self.start_dt, end_dt=self.end_dt
        )
        self.assertDictEqual(expected_output, actual_output)

    def test_one_node_routes_without_ecmp(self) -> None:
        last_updated_1 = datetime.strptime("Jan 1 2020  2:00PM", "%b %d %Y %I:%M%p")
        last_updated_2 = datetime.strptime("Jan 1 2020  6:00PM", "%b %d %Y %I:%M%p")
        input = [
            {
                "node_name": "A",
                "routes": [["X", "Y", "Z"]],
                "prev_routes": [],
                "last_updated": last_updated_1,
            },
            {
                "node_name": "A",
                "routes": [["D", "G", "H"]],
                "prev_routes": [["X", "Y", "Z"]],
                "last_updated": last_updated_2,
            },
        ]
        expected_output = {
            "A": {"[]": 58.333, "[['X', 'Y', 'Z']]": 16.667, "[['D', 'G', 'H']]": 25.0}
        }
        actual_output = compute_routes_utilization(
            raw_routes_data=input, start_dt=self.start_dt, end_dt=self.end_dt
        )
        self.assertDictEqual(expected_output, actual_output)

    def test_one_node_routes_with_ecmp(self) -> None:
        last_updated_1 = datetime.strptime("Jan 1 2020  2:00PM", "%b %d %Y %I:%M%p")
        last_updated_2 = datetime.strptime("Jan 1 2020  6:00PM", "%b %d %Y %I:%M%p")
        input = [
            {
                "node_name": "A",
                "routes": [["X", "Y", "Z"], ["X", "V", "Z"]],
                "prev_routes": [],
                "last_updated": last_updated_1,
            },
            {
                "node_name": "A",
                "routes": [["D", "G", "H"], ["D", "F", "H"]],
                "prev_routes": [["X", "Y", "Z"], ["X", "V", "Z"]],
                "last_updated": last_updated_2,
            },
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
        last_updated_1 = datetime.strptime("Jan 1 2020  2:00AM", "%b %d %Y %I:%M%p")
        last_updated_2 = datetime.strptime("Jan 1 2020  6:00PM", "%b %d %Y %I:%M%p")
        last_updated_3 = datetime.strptime("Jan 1 2020  7:00PM", "%b %d %Y %I:%M%p")
        input = [
            {
                "node_name": "A",
                "routes": [["X", "Y", "Z"], ["X", "V", "Z"]],
                "prev_routes": [],
                "last_updated": last_updated_1,
            },
            {
                "node_name": "A",
                "routes": [["X", "Y", "Z"]],
                "prev_routes": [["X", "Y", "Z"], ["X", "V", "Z"]],
                "last_updated": last_updated_2,
            },
            {
                "node_name": "A",
                "routes": [["X", "Y", "Z"], ["X", "V", "Z"]],
                "prev_routes": [["X", "Y", "Z"]],
                "last_updated": last_updated_3,
            },
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

    def test_multi_node_empty_routes(self) -> None:
        last_updated_A = datetime.strptime("Jan 1 2020  2:00PM", "%b %d %Y %I:%M%p")
        last_updated_B = datetime.strptime("Jan 1 2020  6:00PM", "%b %d %Y %I:%M%p")
        input = [
            {
                "node_name": "A",
                "routes": [],
                "prev_routes": [],
                "last_updated": last_updated_A,
            },
            {
                "node_name": "B",
                "routes": [],
                "prev_routes": [],
                "last_updated": last_updated_B,
            },
        ]
        expected_output = {"A": {"[]": 100}, "B": {"[]": 100}}
        actual_output = compute_routes_utilization(
            raw_routes_data=input, start_dt=self.start_dt, end_dt=self.end_dt
        )
        self.assertDictEqual(expected_output, actual_output)

    def test_multi_node_one_routes_change(self) -> None:
        last_updated_A = datetime.strptime("Jan 1 2020  2:00PM", "%b %d %Y %I:%M%p")
        last_updated_B = datetime.strptime("Jan 1 2020  6:00PM", "%b %d %Y %I:%M%p")
        input = [
            {
                "node_name": "A",
                "routes": [["X", "Y", "Z"]],
                "prev_routes": [],
                "last_updated": last_updated_A,
            },
            {
                "node_name": "B",
                "routes": [["G", "H", "I"]],
                "prev_routes": [],
                "last_updated": last_updated_B,
            },
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
        last_updated_A = datetime.strptime("Jan 1 2020  2:00PM", "%b %d %Y %I:%M%p")
        last_updated_B = datetime.strptime("Jan 1 2020  6:00PM", "%b %d %Y %I:%M%p")
        input = [
            {
                "node_name": "A",
                "routes": [["X", "Y", "Z"], ["X", "G", "Z"]],
                "prev_routes": [],
                "last_updated": last_updated_A,
            },
            {
                "node_name": "B",
                "routes": [["G", "T", "H"], ["G", "U", "H"]],
                "prev_routes": [],
                "last_updated": last_updated_B,
            },
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
        last_updated_A1 = datetime.strptime("Jan 1 2020  2:00PM", "%b %d %Y %I:%M%p")
        last_updated_A2 = datetime.strptime("Jan 1 2020  5:00PM", "%b %d %Y %I:%M%p")
        last_updated_B1 = datetime.strptime("Jan 1 2020  4:00PM", "%b %d %Y %I:%M%p")
        last_updated_B2 = datetime.strptime("Jan 1 2020  6:00PM", "%b %d %Y %I:%M%p")
        input = [
            {
                "node_name": "A",
                "routes": [["X", "Y", "Z"]],
                "prev_routes": [],
                "last_updated": last_updated_A1,
            },
            {
                "node_name": "A",
                "routes": [["D", "G", "H"]],
                "prev_routes": [["X", "Y", "Z"]],
                "last_updated": last_updated_A2,
            },
            {
                "node_name": "B",
                "routes": [["H", "U", "I"]],
                "prev_routes": [],
                "last_updated": last_updated_B1,
            },
            {
                "node_name": "B",
                "routes": [["E", "T", "M"]],
                "prev_routes": [["H", "U", "I"]],
                "last_updated": last_updated_B2,
            },
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
        last_updated_A1 = datetime.strptime("Jan 1 2020  2:00PM", "%b %d %Y %I:%M%p")
        last_updated_A2 = datetime.strptime("Jan 1 2020  5:00PM", "%b %d %Y %I:%M%p")
        last_updated_B1 = datetime.strptime("Jan 1 2020  4:00PM", "%b %d %Y %I:%M%p")
        last_updated_B2 = datetime.strptime("Jan 1 2020  6:00PM", "%b %d %Y %I:%M%p")
        input = [
            {
                "node_name": "A",
                "routes": [["X", "Y", "Z"], ["X", "Y", "V"]],
                "prev_routes": [],
                "last_updated": last_updated_A1,
            },
            {
                "node_name": "A",
                "routes": [["D", "G", "H"], ["D", "G", "F"]],
                "prev_routes": [["X", "Y", "Z"], ["X", "Y", "V"]],
                "last_updated": last_updated_A2,
            },
            {
                "node_name": "B",
                "routes": [["H", "U", "I"], ["H", "U", "D"]],
                "prev_routes": [],
                "last_updated": last_updated_B1,
            },
            {
                "node_name": "B",
                "routes": [["E", "T", "M"], ["E", "T", "R"]],
                "prev_routes": [["H", "U", "I"], ["H", "U", "D"]],
                "last_updated": last_updated_B2,
            },
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
