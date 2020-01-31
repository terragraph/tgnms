#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import ipaddress


def format_address(host: str, port: int) -> str:
    """Return a formatted IP address given the host and port."""
    try:
        ipaddress.IPv6Address(host)
        return f"[{host}]:{port}"
    except ipaddress.AddressValueError:
        return f"{host}:{port}"
