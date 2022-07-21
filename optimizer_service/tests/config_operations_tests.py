#!/usr/bin/env python3

# Copyright (c) Meta Platforms, Inc. and affiliates.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

import json
import unittest
from collections import defaultdict

from optimizer_service.optimizations.config_operations import (
    prepare_changes,
    prepare_overrides_config_reverts,
    prepare_overrides_config_updates,
    run_tideal_optimization,
)


class ConfigOperationsTests(unittest.TestCase):
    def setUp(self) -> None:
        self.network_name = "test_network"
        self.node_name = "test_node"
        self.link_flap_backoff_ms = "1000"
        self.link_impairment_detection = 0

        self.curr_overrides_configs = {
            self.node_name: {
                "radioParamsBase": {"fwParams": {"linkImpairmentDetectionEnable": 0}},
                "envParams": {"OPENR_LINK_FLAP_MAX_BACKOFF_MS": "1000"},
            }
        }
        self.curr_overrides_configs_different_values = {
            self.node_name: {
                "radioParamsBase": {"fwParams": {"linkImpairmentDetectionEnable": 1}},
                "envParams": {"OPENR_LINK_FLAP_MAX_BACKOFF_MS": "5500"},
            }
        }
        self.curr_overrides_configs_empty = {self.node_name: ""}

        self.current_overrides_configs = {
            "overrides": json.dumps(self.curr_overrides_configs)
        }
        self.current_overrides_configs_different_values = {
            "overrides": json.dumps(self.curr_overrides_configs_different_values)
        }
        self.current_overrides_configs_empty = {
            "overrides": json.dumps(self.curr_overrides_configs_empty)
        }

        self.previous_overrides_configs = {
            self.node_name: {
                "link_impairment_detection": 1,
                "link_flap_backoff_ms": "5500",
            }
        }
        self.previous_overrides_configs_none = {
            self.node_name: {
                "link_impairment_detection": None,
                "link_flap_backoff_ms": None,
            }
        }
        self.previous_overrides_configs_missing = {}

    def test_prepare_changes(self) -> None:
        expected_output = (
            [
                (
                    True,
                    {
                        "overrides": (
                            '{"test_node": {"radioParamsBase": {"fwParams": '
                            '{"linkImpairmentDetectionEnable": 0}}, "envParams": '
                            '{"OPENR_LINK_FLAP_MAX_BACKOFF_MS": "1000"}}}'
                        )
                    },
                )
            ],
            [
                {
                    "network_name": "test_network",
                    "node_name": "test_node",
                    "link_flap_backoff_ms": "5500",
                    "link_impairment_detection": 1,
                }
            ],
            {},
        )
        actual_output = prepare_changes(
            self.network_name,
            self.current_overrides_configs_different_values,
            self.previous_overrides_configs_missing,
            self.link_impairment_detection,
            self.link_flap_backoff_ms,
        )
        self.assertTupleEqual(actual_output, expected_output)

    def test_prepare_changes_empty_current_config(self) -> None:
        expected_output = (
            [
                (
                    True,
                    {
                        "overrides": (
                            '{"test_node": {"radioParamsBase": {"fwParams": '
                            '{"linkImpairmentDetectionEnable": 0}}, "envParams": '
                            '{"OPENR_LINK_FLAP_MAX_BACKOFF_MS": "1000"}}}'
                        )
                    },
                )
            ],
            [
                {
                    "network_name": "test_network",
                    "node_name": "test_node",
                    "link_flap_backoff_ms": None,
                    "link_impairment_detection": None,
                }
            ],
            {},
        )
        actual_output = prepare_changes(
            self.network_name,
            self.current_overrides_configs_empty,
            self.previous_overrides_configs_missing,
            self.link_impairment_detection,
            self.link_flap_backoff_ms,
        )
        self.assertTupleEqual(actual_output, expected_output)

    def test_prepare_overrides_config_updates(self) -> None:
        overrides = []
        expected_overrides = [
            (
                True,
                {
                    "overrides": (
                        '{"test_node": {"radioParamsBase": {"fwParams": '
                        '{"linkImpairmentDetectionEnable": 0}}, "envParams": '
                        '{"OPENR_LINK_FLAP_MAX_BACKOFF_MS": "1000"}}}'
                    )
                },
            )
        ]
        entries_to_insert = []
        expected_entries_to_insert = [
            {
                "network_name": "test_network",
                "node_name": "test_node",
                "link_flap_backoff_ms": "5500",
                "link_impairment_detection": 1,
            }
        ]

        prepare_overrides_config_updates(
            self.network_name,
            self.curr_overrides_configs_different_values,
            self.previous_overrides_configs_missing,
            self.link_impairment_detection,
            self.link_flap_backoff_ms,
            entries_to_insert,
            overrides,
        )
        self.assertListEqual(overrides, expected_overrides)
        self.assertListEqual(entries_to_insert, expected_entries_to_insert)

    def test_prepare_overrides_config_updates_same_values(self) -> None:
        overrides = []
        expected_overrides = []
        entries_to_insert = []
        expected_entries_to_insert = []

        prepare_overrides_config_updates(
            self.network_name,
            self.curr_overrides_configs,
            self.previous_overrides_configs,
            self.link_impairment_detection,
            self.link_flap_backoff_ms,
            entries_to_insert,
            overrides,
        )
        self.assertListEqual(overrides, expected_overrides)
        self.assertListEqual(entries_to_insert, expected_entries_to_insert)

    def test_prepare_overrides_config_updates_empty_current_config(self) -> None:
        overrides = []
        expected_overrides = [
            (
                True,
                {
                    "overrides": (
                        '{"test_node": {"radioParamsBase": {"fwParams": '
                        '{"linkImpairmentDetectionEnable": 0}}, "envParams": '
                        '{"OPENR_LINK_FLAP_MAX_BACKOFF_MS": "1000"}}}'
                    )
                },
            )
        ]
        entries_to_insert = []
        expected_entries_to_insert = [
            {
                "network_name": "test_network",
                "node_name": "test_node",
                "link_flap_backoff_ms": None,
                "link_impairment_detection": None,
            }
        ]

        prepare_overrides_config_updates(
            self.network_name,
            self.curr_overrides_configs_empty,
            self.previous_overrides_configs_missing,
            self.link_impairment_detection,
            self.link_flap_backoff_ms,
            entries_to_insert,
            overrides,
        )
        self.assertListEqual(overrides, expected_overrides)
        self.assertListEqual(entries_to_insert, expected_entries_to_insert)

    def test_prepare_overrides_config_reverts(self) -> None:
        overrides = []
        expected_overrides = [
            (
                True,
                {
                    "overrides": '{"test_node": {"radioParamsBase": {"fwParams": '
                    '{"linkImpairmentDetectionEnable": 1}}, "envParams": '
                    '{"OPENR_LINK_FLAP_MAX_BACKOFF_MS": "5500"}}}'
                },
            )
        ]
        entries_to_delete = defaultdict(set)
        expected_entries_to_delete = {
            "networks": {"test_network"},
            "nodes": {"test_node"},
        }

        prepare_overrides_config_reverts(
            self.network_name,
            self.curr_overrides_configs,
            self.previous_overrides_configs,
            entries_to_delete,
            overrides,
        )
        self.assertListEqual(overrides, expected_overrides)
        self.assertDictEqual(entries_to_delete, expected_entries_to_delete)

    def test_prepare_overrides_config_reverts_no_previous_config(self) -> None:
        overrides = []
        expected_overrides = [
            (
                False,
                {
                    "overrides": (
                        '{"test_node": {"radioParamsBase": '
                        '{"fwParams": {}}, "envParams": {}}}'
                    )
                },
            )
        ]
        entries_to_delete = defaultdict(set)
        expected_entries_to_delete = {
            "networks": {"test_network"},
            "nodes": {"test_node"},
        }

        prepare_overrides_config_reverts(
            self.network_name,
            self.curr_overrides_configs,
            self.previous_overrides_configs_none,
            entries_to_delete,
            overrides,
        )
        self.assertListEqual(overrides, expected_overrides)
        self.assertDictEqual(entries_to_delete, expected_entries_to_delete)

    def test_create_tideal_configs(self) -> None:
        topology = {
            "name": "test",
            "nodes": [
                {
                    "name": "TEST.18-60.P2",
                    "node_type": 2,
                    "is_primary": True,
                    "pop_node": False,
                },
                {
                    "name": "TEST.Roof-16-North.P1",
                    "node_type": 2,
                    "is_primary": True,
                    "pop_node": True,
                },
                {
                    "name": "TEST.18-61.P1",
                    "node_type": 1,
                    "is_primary": True,
                    "pop_node": False,
                },
            ],
            "links": [
                {
                    "name": "link-TEST.18-60.P2-TEST.18-61.P1",
                    "a_node_name": "TEST.18-60.P2",
                    "z_node_name": "TEST.18-61.P1",
                    "a_node_mac": "00:P2",
                    "z_node_mac": "00:P1",
                    "link_type": 1,
                },
                {
                    "name": "link-TEST.18-60.P2-TEST.Roof-16-North.P1",
                    "a_node_name": "TEST.18-60.P2",
                    "z_node_name": "TEST.Roof-16-North.P1",
                    "a_node_mac": "00:P2",
                    "z_node_mac": "00:PP",
                    "link_type": 1,
                },
            ],
        }
        overrides = run_tideal_optimization(topology, 1000, 20000)
        overrides_expected = {
            "TEST.18-60.P2": {
                "linkParamsOverride": {
                    "00:P1": {"airtimeConfig": {"txIdeal": 4999, "rxIdeal": 4999}},
                    "00:PP": {"airtimeConfig": {"txIdeal": 5000, "rxIdeal": 5000}},
                }
            }
        }
        expected_output = {"overrides": json.dumps(overrides_expected)}
        self.assertDictEqual(overrides, expected_output)
