#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import ipaddress


def format_address(host: str, port: int) -> str:
    """Return a formatted IP address given the host and port.

    Args:
        host: The host IP address or name.
        port: The port number.

    Returns:
        An IPv4/v6 formatted address based on the host.

    Example:
        >>> format_address("127.0.0.1", 8080)
        127.0.0.1:8080
        >>> format_address("foo", 8080)
        foo:8080
        >>> format_address("::1", 8080)
        [::1]:8080
    """
    try:
        ipaddress.IPv6Address(host)
        return f"[{host}]:{port}"
    except ipaddress.AddressValueError:
        return f"{host}:{port}"
