#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import asyncio
import json
import logging
from collections import defaultdict
from copy import deepcopy
from typing import Any, DefaultDict, Dict, List, Optional, Set, Tuple

import networkx as nx
from tglib.clients import APIServiceClient
from tglib.exceptions import ClientRuntimeError

from ..utils.db import (
    delete_node_entries,
    get_previous_overrides_configs,
    insert_overrides_configs,
)
from ..utils.dict import deep_update
from ..utils.stats import get_link_status
from .flow_graph import FlowGraph
from .graph import (
    build_topology_graph,
    estimate_capacity,
    find_all_p2mp,
    find_cn_cut_edges,
    remove_low_uptime_links,
)


def prepare_changes(
    network_name: str,
    current_overrides_configs: Dict[str, str],
    previous_overrides_configs: Dict[str, Dict[str, Any]],
    link_impairment_detection: int,
    link_flap_backoff_ms: str,
) -> Tuple[List[Tuple[bool, Dict]], List[Dict], defaultdict]:
    """Prepare node overrides config changes and updates to the database.

    Prepare the node overrides config changes for nodes in current cut edges.
    Also, prepare entries that need to be inserted to the db and entries that need to
    be deleted from the db.
    """
    overrides: List[Tuple[bool, Dict]] = []
    entries_to_insert: List[Dict] = []
    entries_to_delete: DefaultDict = defaultdict(set)

    if current_overrides_configs["overrides"]:
        curr_overrides_configs = json.loads(current_overrides_configs["overrides"])

        # Prepare overrides config changes for nodes that are in cut edges
        prepare_overrides_config_updates(
            network_name,
            curr_overrides_configs,
            previous_overrides_configs,
            link_impairment_detection,
            link_flap_backoff_ms,
            entries_to_insert,
            overrides,
        )

        # Revert overrides config changes on nodes that are no longer in cut edges
        prepare_overrides_config_reverts(
            network_name,
            curr_overrides_configs,
            previous_overrides_configs,
            entries_to_delete,
            overrides,
        )

    return overrides, entries_to_insert, entries_to_delete


def prepare_overrides_config_updates(
    network_name: str,
    curr_overrides_configs: Dict,
    previous_overrides_configs: Dict,
    link_impairment_detection: int,
    link_flap_backoff_ms: str,
    entries_to_insert: List[Dict],
    overrides: List[Tuple[bool, Dict]],
) -> None:
    """Prepare overrides config changes for all cut-edge nodes.

    Check if the current values of 'link_impairment_detection' and
    'link_flap_backoff_ms', for all nodes that are in current cut edges,
    are equal to their corresponding expected values. If the values do not match,
    update the node's overrides config with the expected values.

    If the node has any overrides config changes, store the node's current values
    to the db.
    """
    for node_name, node_overrides in curr_overrides_configs.items():
        if node_overrides == "":
            node_overrides = {}

        curr_link_impairment_detection = (
            node_overrides.get("radioParamsBase", {})
            .get("fwParams", {})
            .get("linkImpairmentDetectionEnable")
        )
        curr_link_flap_backoff_ms = node_overrides.get("envParams", {}).get(
            "OPENR_LINK_FLAP_MAX_BACKOFF_MS"
        )

        # If node entry is found in the db, drop previous config entry
        # as the node is still in a cut edge
        if previous_overrides_configs.get(node_name) is not None:
            del previous_overrides_configs[node_name]

        # If the current param value is not as expected, modify the param values in the
        # node's override config
        modify_overrides: Dict[str, Dict] = {node_name: {}}
        if curr_link_impairment_detection != link_impairment_detection:
            modify_overrides[node_name]["radioParamsBase"] = {
                "fwParams": {"linkImpairmentDetectionEnable": link_impairment_detection}
            }
        if curr_link_flap_backoff_ms != link_flap_backoff_ms:
            modify_overrides[node_name]["envParams"] = {
                "OPENR_LINK_FLAP_MAX_BACKOFF_MS": link_flap_backoff_ms
            }

        if modify_overrides[node_name]:
            # Insert the current override config in the db
            entries_to_insert.append(
                {
                    "network_name": network_name,
                    "node_name": node_name,
                    "link_flap_backoff_ms": curr_link_flap_backoff_ms,
                    "link_impairment_detection": curr_link_impairment_detection,
                }
            )

            logging.debug(f"Config overrides for {node_name}: {modify_overrides}")
            overrides.append((True, {"overrides": json.dumps(modify_overrides)}))


def prepare_overrides_config_reverts(
    network_name: str,
    curr_overrides_configs: Dict,
    previous_overrides_configs: Dict,
    entries_to_delete: DefaultDict,
    overrides: List[Tuple[bool, Dict]],
) -> None:
    """Revert overrides config for non-cut edge nodes.

    Overrides config for nodes that are no longer in cut edges have to be
    reverted to it's previous state. If previous param value is None, then unset
    the param from the current overrides config and set that as the node's
    overrides config.

    Entries for nodes that are no longer in the current cut edges have to be
    deleted from the db.
    """
    # Process previous configs of nodes that are no longer in current cut edges
    for node_name, prev_config in previous_overrides_configs.items():
        # Delete all entries for the node of that network from db
        entries_to_delete["networks"].add(network_name)
        entries_to_delete["nodes"].add(node_name)

        # Get current node overrides config
        node_overrides = curr_overrides_configs[node_name]

        # Revert params in config overrides to the previous value.
        modify_overrides: Dict[str, Dict] = {node_name: {}}
        set_overrides: Dict[str, Dict] = {node_name: {}}

        if prev_config["link_impairment_detection"] is not None:
            modify_overrides[node_name].update(
                {
                    "radioParamsBase": {
                        "fwParams": {
                            "linkImpairmentDetectionEnable": prev_config[
                                "link_impairment_detection"
                            ]
                        }
                    }
                }
            )
        else:
            # Unset param from current overrides config
            del node_overrides["radioParamsBase"]["fwParams"][
                "linkImpairmentDetectionEnable"
            ]
            set_overrides[node_name] = node_overrides

        if prev_config["link_flap_backoff_ms"] is not None:
            modify_overrides[node_name].update(
                {
                    "envParams": {
                        "OPENR_LINK_FLAP_MAX_BACKOFF_MS": prev_config[
                            "link_flap_backoff_ms"
                        ]
                    }
                }
            )
        else:
            # Unset param from current overrides config
            del node_overrides["envParams"]["OPENR_LINK_FLAP_MAX_BACKOFF_MS"]
            set_overrides[node_name] = node_overrides

        if modify_overrides[node_name]:
            overrides.append((True, {"overrides": json.dumps(modify_overrides)}))
        if set_overrides[node_name]:
            overrides.append((False, {"overrides": json.dumps(set_overrides)}))


async def update_overrides_configs(
    api_client: APIServiceClient,
    network_name: str,
    overrides: List[Tuple[bool, Dict]],
    config_change_interval: int,
) -> None:
    """Apply overrides config changes to nodes of the network.

    Use either 'modifyNodeOverridesConfig' or 'setNodeOverridesConfig' API request.
    Sleep for interval duration before applying the next config change.
    """
    logging.info(f"Updating overrides config in {network_name}")
    for is_modify, node_overrides in overrides:
        try:
            response = await api_client.request(
                network_name,
                endpoint=(
                    "modifyNodeOverridesConfig"
                    if is_modify
                    else "setNodeOverridesConfig"
                ),
                params=node_overrides,
            )
            logging.info(f"Overrides config response in {network_name} is {response}")
        except ClientRuntimeError:
            logging.exception("Failed to udpate node overrides config")
            continue

        await asyncio.sleep(config_change_interval)


async def get_current_overrides_configs(
    api_client: APIServiceClient, network_name: str, node_set: Set
) -> Optional[Dict[str, str]]:
    """Get current config overrides for all nodes.

    Use the 'getNodeOverridesConfig' API request to fetch current node overrides config
    for all requested set of nodes.
    """
    try:
        response: Dict[str, str] = await api_client.request(
            network_name,
            endpoint="getNodeOverridesConfig",
            params={"nodes": list(node_set)},
        )
        return response
    except ClientRuntimeError:
        logging.exception("getNodeOverridesConfig call failed")
        return None


async def get_cn_cut_edges(
    network_name: str,
    topology: Dict,
    cns: Set[str],
    topology_graph: nx.Graph,
    window_s: int,
    link_uptime_threshold: Optional[float] = None,
) -> Optional[Set]:
    """Find all edges that when down cut off one or more CNs."""
    cn_cut_edges: Set = set()
    if link_uptime_threshold and 0 <= link_uptime_threshold < 1:
        modified_graph = deepcopy(topology_graph)
        active_links = await get_link_status(topology, window_s)
        remove_low_uptime_links(modified_graph, active_links, link_uptime_threshold)
        cn_cut_edges.update(find_cn_cut_edges(modified_graph, cns))
    cn_cut_edges.update(find_cn_cut_edges(topology_graph, cns))
    if not cn_cut_edges:
        logging.info(f"{network_name} has no CN cut edges")
        return None
    logging.info(f"{len(cn_cut_edges)} edges in {network_name} cut off one or more CNs")
    return cn_cut_edges


async def process_cut_edges(
    topologies: Dict[str, Dict],
    window_s: int,
    link_flap_backoff_ms: str,
    link_impairment_detection: int,
    config_change_delay_s: int,
    link_uptime_threshold: Optional[float] = None,
    dry_run: bool = False,
) -> None:
    """Process cut edges for all nodes of all networks.

    Find all edges that split the network and isolate a CN if that edge is
    cut/removed. Fetch the current overrides config for all nodes that are in the
    cut edges and check if those nodes have expected values for the following params:
    -   link_impairment_detection
    -   link_flap_backoff_ms

    Update the node's overrides config if any current overrides config param is not as
    expected. Update the db with the corresponding change.
    """
    api_client = APIServiceClient(timeout=2)

    # Build topology graph and find all cut edges for each network
    cn_cut_edges: List = []
    for network_name, topology in topologies.items():
        logging.info(f"Running cut edge config optimization for {network_name}.")

        # Create topology graph
        topology_graph, cns = build_topology_graph(topology)
        if not cns:
            logging.info(f"{network_name} has no CNs")
            continue

        cn_cut_edges.append(
            get_cn_cut_edges(
                network_name,
                topology,
                cns,
                topology_graph,
                window_s,
                link_uptime_threshold,
            )
        )
    all_cn_cut_edges = await asyncio.gather(*cn_cut_edges)

    # Get current config overrides for all nodes in cut edges of each network
    overrides_configs = []
    network_cn_cut_edges = zip(topologies.keys(), all_cn_cut_edges)
    for network_name, cn_cut_edges in network_cn_cut_edges:
        if cn_cut_edges is None:
            del topologies[network_name]
            continue

        # To avoid repeating for the common node in P2MP
        node_set = {node_name for edge in cn_cut_edges for node_name in edge}

        overrides_configs.append(
            get_current_overrides_configs(api_client, network_name, node_set)
        )
    all_overrides_configs = await asyncio.gather(*overrides_configs)

    # Get previous config overrides for all nodes in cut edges of each network
    previous_config = await get_previous_overrides_configs(topologies.keys())

    # Prepare config overrides for all nodes that need config changes in each network
    # Apply changes on the network if its not a dry run
    apply_config_changes = []
    total_insert_entries = []
    total_delete_entries: Dict = {}
    network_overrides_configs = zip(topologies.keys(), all_overrides_configs)
    for network_name, current_overrides_configs in network_overrides_configs:
        if current_overrides_configs is None:
            continue

        overrides, entries_to_insert, entries_to_delete = prepare_changes(
            network_name,
            current_overrides_configs,
            previous_config.get(network_name, {}),
            link_impairment_detection,
            link_flap_backoff_ms,
        )

        if overrides:
            logging.info(
                f"{network_name} requires cut edge config "
                f"changes to {len(overrides)} nodes"
            )
            if not dry_run:
                # Aggregate all db changes
                total_insert_entries += entries_to_insert
                deep_update(total_delete_entries, entries_to_delete, join_sets=True)

                # Aggregate all overrides config changes
                apply_config_changes.append(
                    update_overrides_configs(
                        api_client, network_name, overrides, config_change_delay_s
                    )
                )
        else:
            logging.info(f"{network_name} does not require any cut edge config changes")

    await asyncio.gather(
        *apply_config_changes,
        insert_overrides_configs(total_insert_entries),
        delete_node_entries(total_delete_entries),
    )


def create_tideal_configs(p2mp_nodes: Dict, flow_graph: FlowGraph) -> DefaultDict:
    """Create config overrides for txIdeal and rxIdeal on P2MP nodes."""
    overrides: DefaultDict = defaultdict(lambda: defaultdict(lambda: defaultdict(dict)))
    for node, wl_links in p2mp_nodes.items():
        sum_tideal = 0
        for link in wl_links:
            if link["name"] in flow_graph.edges:
                sum_tideal += flow_graph.edges[link["name"]].time.value
        for link in wl_links:
            peer_mac = (
                link["z_node_mac"]
                if link["a_node_name"] == node
                else link["a_node_mac"]
            )
            if not peer_mac:
                logging.warning(
                    f"Could not find mac address for node in {link['name']}"
                )
                continue

            if not sum_tideal or link["name"] not in flow_graph.edges:
                tideal = 0
                logging.warning(
                    f"{link['name']}  not assigned any time or does not "
                    "have a flow_edge element"
                )
            else:
                tideal = int(
                    flow_graph.edges[link["name"]].time.value * 10000 / sum_tideal
                )
            overrides[node]["linkParamsOverride"][peer_mac] = {
                "airtimeConfig": {"txIdeal": tideal, "rxIdeal": tideal}
            }
    return overrides


def run_tideal_optimization(
    topology: Dict, wireless_capacity_mbps: int, wired_capacity_mbps: int
) -> Optional[Dict]:
    """ Run optimization and create configs.

    Estimate the maximum simultaneous throughput to all CNs in the topology
    and create correspondibg tx_ideal and rx_ideal config overrides.
    """

    network_name = topology["name"]
    logging.info(f"Analyzing topology {network_name}")
    topology_graph, cns = build_topology_graph(topology)

    if not cns:
        logging.info(f"{network_name} has no CNs")
        return None

    p2mp_nodes = find_all_p2mp(topology_graph)
    if not p2mp_nodes:
        logging.info(f"{network_name} has no wireless links that share airtime")
        return None

    flow_graph = estimate_capacity(
        topology_graph, cns, wireless_capacity_mbps, wired_capacity_mbps
    )
    if not flow_graph.result:
        logging.info(f"Could not solve tideal optimization problem for {network_name}")
        return None

    logging.info(
        f"The maximum achievable simultaneous throughput to all CNs in {network_name} "
        f"is {flow_graph.result} Mbps"
    )
    overrides = create_tideal_configs(p2mp_nodes, flow_graph)
    if not overrides:
        logging.info(f"No tideal config needed for {network_name}")
        return None

    overrides_all = {"overrides": json.dumps(overrides)}
    logging.debug(f"The optimized tideal configs are: {overrides_all}")
    return overrides_all
