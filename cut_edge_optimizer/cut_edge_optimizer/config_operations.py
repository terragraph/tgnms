#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import asyncio
import json
import logging
from copy import deepcopy
from typing import Dict, List, Optional, Set

from tglib import ClientType, init
from tglib.clients import APIServiceClient
from tglib.exceptions import ClientRuntimeError

from .graph_analysis import (
    build_topology_graph,
    find_cn_cut_edges,
    remove_low_uptime_links,
)
from .utils import get_link_status


def is_link_impairment_detection_configured(
    node_name: str, node_overrides: Dict[str, Dict], link_impairment_detection: int
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
    node_name: str, node_overrides: Dict[str, Dict], link_flap_backoff_ms: str
) -> bool:
    logging.debug(
        f"Checking existing configuration of link_flap_backoff on node: {node_name}"
    )
    if (
        node_overrides.get("envParams", {}).get("OPENR_LINK_FLAP_MAX_BACKOFF_MS")
        == link_flap_backoff_ms
    ):
        logging.debug(
            "link_flap_backoff is already configured to appropriate value of "
            f"{link_flap_backoff_ms}"
        )
        return True
    logging.debug(
        "link_flap_backoff needs to be configured to appropriate value of "
        f"{link_flap_backoff_ms}"
    )
    return False


def prepare_node_config(
    node_name: str,
    link_impairment_detection: int,
    link_flap_backoff_ms: str,
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
        node_name, node_overrides, link_flap_backoff_ms
    ):
        link_flap_backoff_json = {
            "envParams": {"OPENR_LINK_FLAP_MAX_BACKOFF_MS": link_flap_backoff_ms}
        }
        overrides_needed[node_name].update(link_flap_backoff_json)
    return overrides_needed


def prepare_all_configs(
    response: Dict[str, str], link_impairment_detection: int, link_flap_backoff_ms: str
) -> List[Dict]:
    overrides_needed_all: List[Dict] = []
    if response["overrides"]:
        overrides_current_all = json.loads(response["overrides"])
        for node_name, node_overrides in overrides_current_all.items():
            logging.debug(f"node: {node_name}, overrides: {node_overrides}")
            if node_overrides == "":
                node_overrides = {}
            overrides_needed = prepare_node_config(
                node_name,
                link_impairment_detection,
                link_flap_backoff_ms,
                node_overrides,
            )
            if overrides_needed[node_name]:
                logging.debug(
                    f"Config overrides needed for {node_name} are {overrides_needed}"
                )
                overrides_needed_all.append({"overrides": json.dumps(overrides_needed)})
    return overrides_needed_all


async def modify_all_cut_edge_configs(
    network_name: str, configs_all: List[Dict], config_change_interval: int
) -> None:
    client = APIServiceClient(timeout=5)
    for node_config in configs_all:
        logging.info(f"Modifying config overrides in {network_name} with {node_config}")
        try:
            response = await client.request(
                network_name, endpoint="modifyNodeOverridesConfig", params=node_config
            )
            logging.info(
                f"modifyNodeOverridesConfig response in {network_name} is {response}"
            )
        except ClientRuntimeError:
            logging.exception(f"modifyNodeOverridesConfig call failed")
            continue
        await asyncio.sleep(config_change_interval)


async def get_all_cut_edge_configs(
    topology: Dict,
    window_s: int,
    link_flap_backoff_ms: str,
    link_impairment_detection: int,
    config_change_delay_s: int,
    link_uptime_threshold: Optional[float] = None,
    dry_run: bool = False,
) -> List[Dict]:
    network_name = topology["name"]
    logging.info(f"Running cut edge config optimization for {network_name}.")
    configs_all: List[Dict] = []

    # create topology graph
    topology_graph, cns = build_topology_graph(topology)
    if not cns:
        logging.info(f"{network_name} has no CNs")
        return configs_all

    # find all edges that when down cut off one or more CNs
    cn_cut_edges: Set = set()
    if link_uptime_threshold and 0 <= link_uptime_threshold < 1:
        modified_graph = deepcopy(topology_graph)
        active_links = await get_link_status(topology, window_s)
        remove_low_uptime_links(modified_graph, active_links, link_uptime_threshold)
        cn_cut_edges.update(find_cn_cut_edges(modified_graph, cns))
    cn_cut_edges.update(find_cn_cut_edges(topology_graph, cns))
    if not cn_cut_edges:
        logging.info(f"{network_name} has no CN cut edges")
        return configs_all
    logging.info(
        f"{network_name} has {len(cn_cut_edges)} edges that cut off one or more CNs"
    )

    # to avoid repeating for the common node in P2MP
    node_set = {node_name for edge in cn_cut_edges for node_name in edge}
    # get the current config overrides for all nodes in cut edges
    try:
        response = await APIServiceClient(timeout=5).request(
            network_name,
            endpoint="getNodeOverridesConfig",
            params={"nodes": list(node_set)},
        )
    except ClientRuntimeError:
        logging.exception(f"getNodeOverridesConfig call failed")
        return configs_all

    # prepare config overrides for all nodes that need config changes
    configs_all = prepare_all_configs(
        response, link_impairment_detection, link_flap_backoff_ms
    )
    if configs_all:
        logging.info(
            f"{network_name} requires cut edge config "
            f"changes to {len(configs_all)} nodes"
        )
        if not dry_run:
            await modify_all_cut_edge_configs(
                network_name, configs_all, config_change_delay_s
            )
    else:
        logging.info(f"{network_name} does not require any cut edge config changes")

    return configs_all
