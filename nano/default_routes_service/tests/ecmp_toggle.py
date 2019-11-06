#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import unittest

from default_routes_service.routes import _count_ecmp_toggles_impl


class EcmpToggle(unittest.TestCase):
    def test_one_node_input_true(self) -> None:
        input = [{"node_name": "A", "is_ecmp": True}]
        expected_output = {"A": 0}
        actual_output = _count_ecmp_toggles_impl(input)
        self.assertDictEqual(expected_output, actual_output)

    def test_one_node_input_false(self) -> None:
        input = [{"node_name": "A", "is_ecmp": False}]
        expected_output = {"A": 0}
        actual_output = _count_ecmp_toggles_impl(input)
        self.assertDictEqual(expected_output, actual_output)

    def test_one_node_zero_toggles_flase(self) -> None:
        input = [
            {"node_name": "A", "is_ecmp": False},
            {"node_name": "A", "is_ecmp": False},
            {"node_name": "A", "is_ecmp": False},
            {"node_name": "A", "is_ecmp": False},
        ]
        expected_output = {"A": 0}
        actual_output = _count_ecmp_toggles_impl(input)
        self.assertDictEqual(expected_output, actual_output)

    def test_one_node_zero_toggles_true(self) -> None:
        input = [
            {"node_name": "A", "is_ecmp": True},
            {"node_name": "A", "is_ecmp": True},
            {"node_name": "A", "is_ecmp": True},
            {"node_name": "A", "is_ecmp": True},
        ]
        expected_output = {"A": 0}
        actual_output = _count_ecmp_toggles_impl(input)
        self.assertDictEqual(expected_output, actual_output)

    def test_one_node_one_toggle(self) -> None:
        input = [
            {"node_name": "A", "is_ecmp": False},
            {"node_name": "A", "is_ecmp": False},
            {"node_name": "A", "is_ecmp": True},
            {"node_name": "A", "is_ecmp": True},
        ]
        expected_output = {"A": 1}
        actual_output = _count_ecmp_toggles_impl(input)
        self.assertDictEqual(expected_output, actual_output)

    def test_one_node_multi_toggles(self) -> None:
        input = [
            {"node_name": "A", "is_ecmp": True},
            {"node_name": "A", "is_ecmp": True},
            {"node_name": "A", "is_ecmp": False},
            {"node_name": "A", "is_ecmp": False},
            {"node_name": "A", "is_ecmp": True},
            {"node_name": "A", "is_ecmp": True},
            {"node_name": "A", "is_ecmp": False},
            {"node_name": "A", "is_ecmp": False},
        ]
        expected_output = {"A": 3}
        actual_output = _count_ecmp_toggles_impl(input)
        self.assertDictEqual(expected_output, actual_output)

    def test_multi_node_input_true(self) -> None:
        input = [
            {"node_name": "A", "is_ecmp": True},
            {"node_name": "B", "is_ecmp": True},
        ]
        expected_output = {"A": 0, "B": 0}
        actual_output = _count_ecmp_toggles_impl(input)
        self.assertDictEqual(expected_output, actual_output)

    def test_multi_node_input_false(self) -> None:
        input = [
            {"node_name": "A", "is_ecmp": False},
            {"node_name": "B", "is_ecmp": False},
        ]
        expected_output = {"A": 0, "B": 0}
        actual_output = _count_ecmp_toggles_impl(input)
        self.assertDictEqual(expected_output, actual_output)

    def test_multi_node_zero_toggles_flase(self) -> None:
        input = [
            {"node_name": "A", "is_ecmp": False},
            {"node_name": "B", "is_ecmp": False},
            {"node_name": "A", "is_ecmp": False},
            {"node_name": "B", "is_ecmp": False},
            {"node_name": "A", "is_ecmp": False},
            {"node_name": "A", "is_ecmp": False},
            {"node_name": "B", "is_ecmp": False},
            {"node_name": "B", "is_ecmp": False},
        ]
        expected_output = {"A": 0, "B": 0}
        actual_output = _count_ecmp_toggles_impl(input)
        self.assertDictEqual(expected_output, actual_output)

    def test_multi_node_zero_toggles_true(self) -> None:
        input = [
            {"node_name": "A", "is_ecmp": True},
            {"node_name": "B", "is_ecmp": True},
            {"node_name": "A", "is_ecmp": True},
            {"node_name": "B", "is_ecmp": True},
            {"node_name": "A", "is_ecmp": True},
            {"node_name": "A", "is_ecmp": True},
            {"node_name": "B", "is_ecmp": True},
            {"node_name": "B", "is_ecmp": True},
        ]
        expected_output = {"A": 0, "B": 0}
        actual_output = _count_ecmp_toggles_impl(input)
        self.assertDictEqual(expected_output, actual_output)

    def test_multi_node_one_toggle(self) -> None:
        input = [
            {"node_name": "B", "is_ecmp": False},
            {"node_name": "A", "is_ecmp": False},
            {"node_name": "A", "is_ecmp": False},
            {"node_name": "B", "is_ecmp": False},
            {"node_name": "A", "is_ecmp": True},
            {"node_name": "B", "is_ecmp": True},
            {"node_name": "A", "is_ecmp": True},
            {"node_name": "B", "is_ecmp": True},
        ]
        expected_output = {"A": 1, "B": 1}
        actual_output = _count_ecmp_toggles_impl(input)
        self.assertDictEqual(expected_output, actual_output)

    def test_multi_node_multi_toggles(self) -> None:
        input = [
            {"node_name": "A", "is_ecmp": True},
            {"node_name": "A", "is_ecmp": True},
            {"node_name": "A", "is_ecmp": False},
            {"node_name": "A", "is_ecmp": False},
            {"node_name": "A", "is_ecmp": True},
            {"node_name": "A", "is_ecmp": True},
            {"node_name": "A", "is_ecmp": False},
            {"node_name": "A", "is_ecmp": False},
            {"node_name": "B", "is_ecmp": True},
            {"node_name": "B", "is_ecmp": True},
            {"node_name": "B", "is_ecmp": False},
            {"node_name": "B", "is_ecmp": False},
            {"node_name": "B", "is_ecmp": True},
            {"node_name": "B", "is_ecmp": True},
            {"node_name": "B", "is_ecmp": False},
            {"node_name": "B", "is_ecmp": True},
        ]
        expected_output = {"A": 3, "B": 4}
        actual_output = _count_ecmp_toggles_impl(input)
        self.assertDictEqual(expected_output, actual_output)
