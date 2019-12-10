#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import json
import unittest

from cut_edge_optimizer.config_operations import (
    is_link_flap_backoff_configured,
    is_link_impairment_detection_configured,
    prepare_all_configs,
    prepare_node_config,
)


class ConfigOperationsTests(unittest.TestCase):
    def test_is_link_flap_backoff_configured_empty(self) -> None:
        node_name = "test_node"
        config = {}
        link_flap_backoff = "1000"
        output = is_link_flap_backoff_configured(node_name, config, link_flap_backoff)
        self.assertFalse(output)

    def test_is_link_impairment_detection_configured_empty(self) -> None:
        node_name = "test_node"
        config = {}
        link_impairment_detection = 0
        output = is_link_impairment_detection_configured(
            node_name, config, link_impairment_detection
        )
        self.assertFalse(output)

    def test_is_link_flap_backoff_configured_different(self) -> None:
        node_name = "test_node"
        config = {"linkParamsOverride": {"fwParams": {"tpcEnable": 0}}}
        link_flap_backoff = "1000"
        output = is_link_flap_backoff_configured(node_name, config, link_flap_backoff)
        self.assertFalse(output)

    def test_is_link_impairment_detection_configured_different(self) -> None:
        node_name = "test_node"
        config = {"radioParamsBase": {"fwParams": {"linkImpairmentDetectionEnable": 1}}}
        link_impairment_detection = 0
        output = is_link_impairment_detection_configured(
            node_name, config, link_impairment_detection
        )
        self.assertFalse(output)

    def test_is_link_flap_backoff_configured_true(self) -> None:
        node_name = "test_node"
        link_flap_backoff = "1000"
        config = {"envParams": {"OPENR_LINK_FLAP_MAX_BACKOFF_MS": link_flap_backoff}}
        output = is_link_flap_backoff_configured(node_name, config, link_flap_backoff)
        self.assertTrue(output)

    def test_is_link_impairment_detection_configured_true(self) -> None:
        node_name = "test_node"
        link_impairment_detection = 0
        config = {
            "radioParamsBase": {
                "fwParams": {"linkImpairmentDetectionEnable": link_impairment_detection}
            }
        }
        output = is_link_impairment_detection_configured(
            node_name, config, link_impairment_detection
        )
        self.assertTrue(output)

    def test_prepare_node_config(self) -> None:
        node_name = "test_node"
        link_flap_backoff = "1000"
        link_impairment_detection = 0
        config = {
            "radioParamsBase": {
                "fwParams": {"linkImpairmentDetectionEnable": link_impairment_detection}
            }
        }
        expected_output = {
            node_name: {
                "envParams": {"OPENR_LINK_FLAP_MAX_BACKOFF_MS": link_flap_backoff}
            }
        }
        actual_output = prepare_node_config(
            node_name, link_impairment_detection, link_flap_backoff, config
        )
        self.assertDictEqual(expected_output, actual_output)

    def test_prepare_all_configs(self) -> None:
        node1_name = "test_node1"
        node2_name = "test_node2"
        link_flap_backoff = "1000"
        link_impairment_detection = 0
        config = {"overrides": json.dumps({node1_name: "", node2_name: ""})}
        out_config = {
            "radioParamsBase": {
                "fwParams": {"linkImpairmentDetectionEnable": link_impairment_detection}
            },
            "envParams": {"OPENR_LINK_FLAP_MAX_BACKOFF_MS": link_flap_backoff},
        }
        expected_output = [
            {"overrides": json.dumps({node1_name: out_config})},
            {"overrides": json.dumps({node2_name: out_config})},
        ]
        actual_output = prepare_all_configs(
            config, link_impairment_detection, link_flap_backoff
        )
        self.assertListEqual(actual_output, expected_output)
