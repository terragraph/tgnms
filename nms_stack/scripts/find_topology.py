#!/usr/bin/env python3

# Copyright (c) Meta Platforms, Inc. and affiliates.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

import argparse
import asyncio
from typing import List, Any, Dict, Tuple
import dataclasses
import pprint
import json

parser = argparse.ArgumentParser(description="Process some nodes.")
parser.add_argument("--ips", nargs="+")

args = parser.parse_args()


@dataclasses.dataclass
class Node:
    id_mac: str
    radio_macs: List[str]
    ip: str


UNKNOWN = Node(id_mac="idk", radio_macs=[], ip="unknown")


@dataclasses.dataclass
class Link:
    a: Node
    aMac: str
    bMac: str
    b: Node


def read_env(s):
    result = {}
    for line in s.split("\n"):
        if line.startswith("#"):
            continue
        if line.strip() == "":
            continue
        key, value = line.split("=")
        key = key.strip('"')
        value = value.strip('"')
        result[key] = value

    return result


async def fetch_node(ip):
    proc = await asyncio.create_subprocess_shell(
        f"ssh {ip} cat /tmp/node_info",
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )

    stdout, stderr = await proc.communicate()

    env = read_env(stdout.decode("utf-8"))
    macs = [v for k, v in env.items() if k.startswith("MAC_")]

    print(f"Loaded {ip}")

    return Node(id_mac=env["NODE_ID"], ip=ip, radio_macs=macs)


async def fetch_existing_links(node, node_lookup):
    proc = await asyncio.create_subprocess_shell(
        f"ssh {node.ip} tg2 minion links --json",
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )

    stdout, stderr = await proc.communicate()

    raw_links = json.loads(stdout.decode("utf-8"))["linkStatusDump"]
    links = {}

    for other_mac, info in raw_links.items():
        this_mac = info["radioMac"]
        link = Link(
            a=node, b=node_lookup.get(other_mac, UNKNOWN), aMac=this_mac, bMac=other_mac
        )
        links[this_mac] = link

    return links


async def fetch_toposcan_links(node, node_lookup):
    proc = await asyncio.create_subprocess_shell(
        f"ssh {node.ip} tg2 minion gps_enable",
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout, stderr = await proc.communicate()

    proc = await asyncio.create_subprocess_shell(
        f"ssh {node.ip} tg2 minion set_params -c 2",
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout, stderr = await proc.communicate()

    links = {}

    for radio_mac in node.radio_macs:
        # print("scanning", radio_mac, "on", node.ip)
        proc = await asyncio.create_subprocess_shell(
            f"ssh {node.ip} tg2 minion topo_scan --json --radio_mac {radio_mac}",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await proc.communicate()
        try:
            scan = json.loads(stdout.decode("utf-8"))
        except:  # noqa
            # print("Failed to scan", stdout.decode("utf-8"))
            continue
        for _, resp in scan.get("topoResps", {}).items():
            other_mac = resp["addr"]
            link = Link(
                a=node,
                b=node_lookup.get(other_mac, UNKNOWN),
                aMac=radio_mac,
                bMac=other_mac,
            )
            links[radio_mac] = link

    return links


def header(s):
    print(f" ======= {s} =======")


async def main():
    # print("Fetching nodes...")
    nodes = await asyncio.gather(*[fetch_node(ip) for ip in args.ips])
    # pprint.pprint(nodes)
    header("Nodes")
    for node in nodes:
        print(f"[{node.ip}] {node.id_mac}")
        for mac in node.radio_macs:
            print(f"\t{mac}")

    node_lookup = {node.id_mac: node for node in nodes}
    for node in nodes:
        for mac in node.radio_macs:
            node_lookup[mac] = node

    # print("Fetching links")
    existing_links = await asyncio.gather(
        *[fetch_existing_links(node, node_lookup) for node in nodes]
    )
    existing_links = {k: v for d in existing_links for k, v in d.items()}
    # pprint.pprint(existing_links)
    print("\n")
    header("Existing Links")
    for mac, link in existing_links.items():
        print(f"[{link.a.ip}] {link.aMac} -> [{link.b.ip}] {link.bMac}")

    toposcan_links = await asyncio.gather(
        *[fetch_toposcan_links(node, node_lookup) for node in nodes]
    )
    toposcan_links = {k: v for d in toposcan_links for k, v in d.items()}
    print("\n")
    header("Toposcan Links")
    for mac, link in toposcan_links.items():
        print(f"[{link.a.ip}] {link.aMac} -> [{link.b.ip}] {link.bMac}")

    # proc = await asyncio.create_subprocess_shell(
    #     cmd,
    #     stdout=asyncio.subprocess.PIPE,
    #     stderr=asyncio.subprocess.PIPE)

    # stdout, stderr = await proc.communicate()

    # print(f'[{cmd!r} exited with {proc.returncode}]')
    # if stdout:
    #     print(f'[stdout]\n{stdout.decode()}')
    # if stderr:
    #     print(f'[stderr]\n{stderr.decode()}')


asyncio.run(main())
