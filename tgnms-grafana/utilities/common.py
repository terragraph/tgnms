#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import ipaddress

# creates something like "http://[::1]:3000" or "http://bqs:8086"
def genUrl(addr, port):
    try:
        ipaddr = ipaddress.ip_address(addr.strip("[]"))
        if ipaddr.version == 6:
            return "http://[" + addr + "]:" + str(port)
        else:
            return "http://" + addr + ":" + str(port)
    except ValueError:
        return "http://" + addr + ":" + str(port)
