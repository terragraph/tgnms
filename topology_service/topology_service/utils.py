#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import logging
from typing import Any, Dict


def sanitize_topology(topology: Dict[str, Any]) -> None:
    """Sanitize the topology object, in place, of all ephemeral values.

    1. Drop all configuration and state params from topology.
    2. Sort the list of nodes, links and sites.
    """
    logging.debug(f"{topology['name']} topology before clean up: {topology}")

    # Remove the extra params from the topology
    del topology["config"]
    for node in topology["nodes"]:
        del node["status"]
    for link in topology["links"]:
        del link["is_alive"]
        del link["linkup_attempts"]

    # Sort nodes, links, and sites by name
    topology["nodes"] = sorted(topology["nodes"], key=lambda node: (node["name"]))
    topology["links"] = sorted(topology["links"], key=lambda link: (link["name"]))
    topology["sites"] = sorted(topology["sites"], key=lambda site: (site["name"]))
    logging.debug(f"{topology['name']} topology after clean up: {topology}")
