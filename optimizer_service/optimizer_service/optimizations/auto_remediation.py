#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import asyncio
import logging
from collections import defaultdict
from typing import Any, DefaultDict, Dict, List, Tuple

import aiohttp
from terragraph_thrift.Topology.ttypes import NodeType
from tglib.clients import APIServiceClient
from tglib.exceptions import ClientRuntimeError

from ..utils.stats import fetch_scan_stats


async def link_operation(
    network_name: str,
    mode: str,
    link_item: DefaultDict,
) -> bool:
    """
    The link_operation function is used to call api service to operate a link.

    Keyword arguments:
    mode -- the mode to operate the link ("addLink", "delLink", "getLink")
    network_name -- the network that has the link
    link_item -- the link you want to add/remove/check
    """
    # Check the operational mode for the link
    # If the mode is not addLink, delLink, or getLink, it will fail
    if not link_item:
        return False

    link_request_item: Dict[str, Any] = {}
    if mode == "addLink":
        link_request_item = {"link": link_item}
    elif mode == "delLink":
        link_request_item = {
            "aNodeName": link_item["a_node_name"],
            "zNodeName": link_item["z_node_name"],
            "force": True,
        }
    elif mode == "getLink":
        link_request_item = {"name": link_item["name"]}
    else:
        logging.error(
            f"The {mode} mode for {link_item['name']} is not supported in {network_name}!"
        )
        return False

    # The api call to operate the link
    try:
        logging.info(f"Operate link {link_item['name']} in {network_name}")
        response = await APIServiceClient(timeout=2).request(
            network_name,
            endpoint=mode,
            params=link_request_item,
        )
        logging.info(
            f"{mode} response for {link_item['name']} in {network_name} is {response}"
        )
        return True
    except ClientRuntimeError:
        logging.exception(f"Failed to {mode} for {link_item['name']} to {network_name}")
        return False


def get_all_backup_links(
    network_name: str,
    node_mac_map: DefaultDict,
    link_name_map: Dict[str, Dict],
    conn_list: List,
) -> DefaultDict:
    """
    Extract all the feasible backup links from the conn_list.

    Keyword arguments:
    node_mac_map -- the Dict mapping mac address to node name
    link_name_map -- the Dict containing all the active links
    conn_list -- the List containing all the potential backup links
    """
    backup_links: DefaultDict = defaultdict(dict)
    for conn_list_item in conn_list:
        tx_node_mac = conn_list_item["tx_node"]
        rx_node_mac = conn_list_item["rx_node"]
        backup_link_candidate = {
            "link_type": 1,
            "linkup_attempts": 0,
            "is_alive": False,
            "name": "",
            "is_backup_cn_link": True,
        }

        if tx_node_mac not in node_mac_map or rx_node_mac not in node_mac_map:
            logging.debug(f"One of the mac addresses is not in {network_name}.")
            continue

        # TODO: This part will be used in the later version.
        # No CNs can be tested at this point in the live network.
        # Will come back to complete the logic later on.
        tx_node_type = node_mac_map[tx_node_mac]["type"]
        rx_node_type = node_mac_map[rx_node_mac]["type"]
        if tx_node_type == NodeType.CN or rx_node_type == NodeType.CN:
            backup_link_candidate["is_backup_cn_link"] = True

        if node_mac_map[tx_node_mac]["name"] < node_mac_map[rx_node_mac]["name"]:
            backup_link_candidate["a_node_mac"] = tx_node_mac
            backup_link_candidate["z_node_mac"] = rx_node_mac
            backup_link_candidate["a_node_name"] = node_mac_map[tx_node_mac]["name"]
            backup_link_candidate["z_node_name"] = node_mac_map[rx_node_mac]["name"]
        else:
            backup_link_candidate["a_node_mac"] = rx_node_mac
            backup_link_candidate["z_node_mac"] = tx_node_mac
            backup_link_candidate["a_node_name"] = node_mac_map[rx_node_mac]["name"]
            backup_link_candidate["z_node_name"] = node_mac_map[tx_node_mac]["name"]

        backup_link_candidate_name = (
            f"link-{backup_link_candidate['a_node_name']}"
            f"-{backup_link_candidate['z_node_name']}"
        )
        backup_link_candidate["name"] = backup_link_candidate_name
        # Do not process any active links in the topology file
        # TODO: check whether this part is necessary.
        # If it is the case, we need to check node macs instead of link name only.
        if backup_link_candidate_name not in link_name_map:
            backup_links[backup_link_candidate_name]["link"] = backup_link_candidate
            if len(conn_list_item["routes"]) != 0:
                (_tx_beam_idx, _rx_beam_idx, snr) = conn_list_item["routes"][0]
                backup_links[backup_link_candidate_name]["snr"] = snr

    return backup_links


def backup_links_selection(
    network_name: str,
    topology: Dict[str, Dict],
    max_num_of_backup_links: int,
    link_stats: Dict[str, Dict],
    conn_list: List,
    overrides_del: List,
    overrides_add: List,
) -> None:
    """
    Select/add the potential backup links into a list to be processed.

    Keyword arguments:
    network_name -- the network you want to add backup links
    max_num_of_backup_links -- maximum number of backup links you want to add
    topology -- the topology file includes links, nodes, sites
    link_stats -- the Dict has all interfering links
    conn_list -- the List has all the potential backup links
    overrides_del -- the List has all the backup links which need to be removed
    overrides_add -- the List has all the backup links which need to be added
    """
    logging.debug(f"Running backup links selection for {network_name}")
    # Step 1: process topology file to get the current active and backup links
    # Get the link information from the topology file.
    # If a link is not a backup link, add it to the map.
    # Otherwise, add it to overrides_del for removing.
    link_name_map: Dict[str, Dict] = {}
    for link in topology["links"]:
        if "is_backup_cn_link" not in link or not link["is_backup_cn_link"]:
            link_name_map[link["name"]] = link
        else:
            overrides_del += [link_operation(network_name, "delLink", link)]

    # Get the node information from the topology file
    node_mac_map: DefaultDict = defaultdict(dict)
    for node in topology["nodes"]:
        for mac in node["wlan_mac_addrs"]:
            node_mac_map[mac]["name"] = node["name"]
            node_mac_map[mac]["type"] = node["node_type"]

    # Step 2: process IM scan data to get the information of all the links
    # get the name of those potential backup links
    backup_links = get_all_backup_links(
        network_name, node_mac_map, link_name_map, conn_list
    )

    # Step 3: sort the backup links in the decending order of the SNR value
    sorted_backup_links = sorted(
        backup_links.items(), key=lambda item: item[1]["snr"], reverse=True
    )

    # Step 4: add the new bakcup links to the topology file
    for link_idx, (_link_name, backup_link_candidate) in enumerate(sorted_backup_links):
        if link_idx >= max_num_of_backup_links:
            break
        overrides_add += [
            link_operation(network_name, "addLink", backup_link_candidate["link"])
        ]


async def run_auto_remediation(
    start_time: int,
    window_s: int,
    max_num_of_backup_links: int,
    network_name: str,
    topology: Dict[str, Dict],
) -> bool:
    """
    Get the backup links from the IM scan data, sort the links, and update.

    Keyword arguments:
    max_num_of_backup_links -- maximum number of backup links you want to add
    network_name -- the network you want to add backup links
    topology -- the topology file includes links, nodes, sites
    """
    logging.info(f"Starting auto-remediation for {network_name}")
    if "links" not in topology or "nodes" not in topology:
        logging.error(f"This is a invalid topology file for {network_name}.")
        return False

    # Step 2.1 : load IM scan data
    link_stats: Dict[str, Dict] = {}
    conn_list: List = []
    async with aiohttp.ClientSession() as session:
        logging.debug(f"Get IM scan data from network name: {network_name}")
        link_stats[network_name] = defaultdict(lambda: defaultdict())
        await fetch_scan_stats(
            network_name,
            start_time,
            window_s,
            link_stats,
            conn_list,
            session,
        )

    # Step 2.2: run backup links selection
    overrides_del: List = []
    overrides_add: List = []
    backup_links_selection(
        network_name,
        topology,
        max_num_of_backup_links,
        link_stats,
        conn_list,
        overrides_del,
        overrides_add,
    )

    await asyncio.gather(*overrides_del, return_exceptions=True)
    await asyncio.gather(*overrides_add, return_exceptions=True)

    return True
