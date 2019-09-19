#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import ipaddress


def format_address(host: str, port: int) -> str:
    try:
        ipaddress.IPv6Address(host)
        return f"[{host}]:{port}"
    except ipaddress.AddressValueError:
        return f"{host}:{port}"
