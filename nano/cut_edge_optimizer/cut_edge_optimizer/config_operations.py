#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import json
import logging
from typing import Dict, List


def is_link_impairment_detection_configured(
    node_name: str, node_overrides: Dict[str, Dict], link_impairment_detection: bool
) -> bool:
    logging.debug(
        "Checking existing configuration of link_impairment_detection on node "
        f"{node_name}"
    )
    if (
        node_overrides.get("radioParamsBase", {})
        .get("fwParams", {})
        .get("linkImpairmentDetectionEnable")
        == link_impairment_detection
    ):
        logging.debug(
            "link_impairment_detection is already configured to appropriate value of "
            f"{link_impairment_detection}"
        )
        return True
    logging.debug(
        "link_impairment_detection needs to be configured to appropriate value of "
        f"{link_impairment_detection}"
    )
    return False


def is_link_flap_backoff_configured(
    node_name: str, node_overrides: Dict[str, Dict], link_flap_backoff: str
) -> bool:
    logging.debug(
        f"Checking existing configuration of link_flap_backoff on node: {node_name}"
    )
    if (
        node_overrides.get("envParams", {}).get("OPENR_LINK_FLAP_MAX_BACKOFF_MS")
        == link_flap_backoff
    ):
        logging.debug(
            "link_flap_backoff is already configured to appropriate value of "
            f"{link_flap_backoff}"
        )
        return True
    logging.debug(
        "link_flap_backoff needs to be configured to appropriate value of "
        f"{link_flap_backoff}"
    )
    return False


def prepare_node_config(
    node_name: str,
    link_impairment_detection: bool,
    link_flap_backoff: str,
    node_overrides: Dict[str, Dict],
) -> Dict[str, Dict]:
    # check if the configs for the node are already correct
    overrides_needed: Dict[str, Dict] = {node_name: {}}
    # if a config change needs to be made, create overrides message body
    if not is_link_impairment_detection_configured(
        node_name, node_overrides, link_impairment_detection
    ):
        link_impairment_detection_json = {
            "radioParamsBase": {
                "fwParams": {"linkImpairmentDetectionEnable": link_impairment_detection}
            }
        }
        overrides_needed[node_name].update(link_impairment_detection_json)
    if not is_link_flap_backoff_configured(
        node_name, node_overrides, link_flap_backoff
    ):
        link_flap_backoff_json = {
            "envParams": {"OPENR_LINK_FLAP_MAX_BACKOFF_MS": link_flap_backoff}
        }
        overrides_needed[node_name].update(link_flap_backoff_json)
    return overrides_needed


def prepare_all_configs(
    reponse: Dict[str, str], link_impairment_detection: bool, link_flap_backoff: str
) -> List[Dict]:
    overrides_needed_all: List[Dict] = []
    if reponse["overrides"]:
        overrides_current_all = json.loads(reponse["overrides"])
        for node_name, node_overrides in overrides_current_all.items():
            logging.debug(f"node: {node_name}, overrides: {node_overrides}")
            if node_overrides == "":
                node_overrides = {}
            overrides_needed = prepare_node_config(
                node_name, link_impairment_detection, link_flap_backoff, node_overrides
            )
            if overrides_needed[node_name]:
                logging.debug(
                    f"Config overrides needed for {node_name} are {overrides_needed}"
                )
                overrides_needed_all.append({"overrides": json.dumps(overrides_needed)})
    return overrides_needed_all
