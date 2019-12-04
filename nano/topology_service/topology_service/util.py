#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import logging
from typing import Dict


def sanitize_topology(topology: Dict) -> None:
    """
    1. Drop all configuration and state params from topology.
    2. Sort the list of nodes, links and sites.
    """
    logging.debug(f"{topology['name']} topology before clean up: {topology}")

    # remove the config param from topology
    del topology["config"]
    # remove status param for all nodes
    for node in topology["nodes"]:
        del node["status"]
    # remove status params for all links
    for link in topology["links"]:
        del link["is_alive"]
        del link["linkup_attempts"]

    # sort nodes by name
    topology["nodes"] = sorted(topology["nodes"], key=lambda node: (node["name"]))
    # sort links by name
    topology["links"] = sorted(topology["links"], key=lambda link: (link["name"]))
    # sort sites by name
    topology["sites"] = sorted(topology["sites"], key=lambda site: (site["name"]))

    logging.debug(f"{topology['name']} topology after clean up: {topology}")
