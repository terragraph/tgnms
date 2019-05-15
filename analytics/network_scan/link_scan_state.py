#!/usr/bin/env python3

import os
import requests
import sys

from scan import ScanTypeNames
from scan_db import ScanDb
from module.topology_handler import TopologyHelper

USAGE_MSG = (
    "Usage: python link_scan_state.py [ network name ]\n"
    "Example: python link_scan_state.py \"TG RF test network\""
)

if len(sys.argv) != 2:
    print(USAGE_MSG)
    sys.exit(1)

network_name = sys.argv[1]

# Get db credentials from env
MYSQL_ENV_VARS = ["MYSQL_HOST", "MYSQL_USER", "MYSQL_PASS"]
for var in MYSQL_ENV_VARS:
    if var not in os.environ:
        print("Error missing {} from environment".format(var))
        sys.exit(1)
DB_HOST = os.environ["MYSQL_HOST"]
DB_USER = os.environ["MYSQL_USER"]
DB_PASS = os.environ["MYSQL_PASS"]
DB_NAME = "cxl"

print("Fetching topology from Controller...")
scan_db = ScanDb(DB_HOST, DB_USER, DB_PASS, DB_NAME)
topology_helper = TopologyHelper(network_name)
if not topology_helper:
    sys.exit(1)
topology = topology_helper.get_topology_from_api_service()

links = {}
link_states = {}
link_index = {}
n_links_needed = 0

print("Reading scan data from db...")
scans = scan_db.get_scans(network_name, decompress_scan_resp=False)

print("Processing scan data...")
for link in topology["links"]:
    link_states[link["name"]] = {
        "a-z": None,
        "z-a": None
    }
    link_index[link["a_node_name"]] = {
        "link": link["name"],
        "pos": "a",
        "opp": link["z_node_name"]
    }
    link_index[link["z_node_name"]] = {
        "link": link["name"],
        "pos": "z",
        "opp": link["a_node_name"]
    }
    n_links_needed += 2

print("Calculating link scan states...")
for scan in scans:
    if scan.tx_node_name not in link_index:
        continue
    link_name = link_index[scan.tx_node_name]["link"]
    target_rx_name = link_index[scan.tx_node_name]["opp"]
    if any(resp["rx_node_name"] == target_rx_name for resp in scan.rx_responses):
        if link_index[scan.tx_node_name]["pos"] == "a" and not link_states[link_name]["a-z"]:
            link_states[link_name]["a-z"] = scan.scan_type
            n_links_needed -= 1
        elif link_index[scan.tx_node_name]["pos"] == "z" and not link_states[link_name]["z-a"]:
            link_states[link_name]["z-a"] = scan.scan_type
            n_links_needed -= 1
    if n_links_needed == 0:
        break

print("Current scan state of links:")
for link, state in link_states.items():
    print("\tLink: {}".format(link))
    if state["a-z"] is not None:
        print("\t\tScan State (a-z): {}".format(ScanTypeNames[state["a-z"]]))
    else:
        print("\t\tScan State at (a-z) not found")
    if state["z-a"] is not None:
        print("\t\tScan State (z-a): {}".format(ScanTypeNames[state["z-a"]]))
    else:
        print("\t\tScan State at (z-a) not found")
print("Number of links with missing scan data: {}".format(n_links_needed))
