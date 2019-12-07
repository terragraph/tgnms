#!/usr/bin/env python3

"""
Read/Writes List of TimeSeries to Beringei database
"""

import logging
from typing import Optional, List
from module.beringei_db_access import BeringeiDbAccess

from facebook.gorilla.beringei_query import ttypes as bq


class TimeSeries(object):
    def __eq__(self, other: object) -> bool:
        if isinstance(other, TimeSeries):
            return (
                self.values == other.values
                and self.times == other.times
                and self.name == other.name
                and self.src_mac == other.src_mac
                and self.peer_mac == other.peer_mac
                and self.topology == other.topology
            )
        return False

    def __repr__(self):
        return "times={}, values={}, name={}, src_mac={}, peer_mac={}, topology={}".format(
            self.times,
            self.values,
            self.name,
            self.src_mac,
            self.peer_mac,
            self.topology,
        )

    def __init__(
        self,
        values: List,
        times: List,
        name: str,
        topology: str,
        src_mac: Optional[str] = None,
        peer_mac: Optional[str] = None,
    ) -> None:
        assert len(times) == len(values)
        self.times = times
        self.values = values
        self.name = name
        self.src_mac = None
        if src_mac:
            self.src_mac = src_mac.lower()
        self.peer_mac = None
        if peer_mac:
            self.peer_mac = peer_mac.lower()
        self.topology = topology

def write_time_series_list(
    time_series_list: List[TimeSeries], intervals: List[int]
) -> None:
    node_stats = []
    agg_stats = []
    for t in time_series_list:
        if t.src_mac:
            key = t.name
            if t.peer_mac:
                key = "link.{}.{}".format(t.peer_mac, t.name)
        else:
            key = "network.{}".format(t.name)
        stats = []
        for i in range(len(t.values)):
            stats.append(bq.Stat(key=key, ts=t.times[i], value=t.values[i]))
        if t.src_mac:
            node_stats.append(bq.NodeStats(mac=t.src_mac, stats=stats))
        else:
            agg_stats.append(bq.AggStats(topologyName=t.topology, stats=stats))
    uwr = bq.UnifiedWriteRequest(
        intervals=intervals, nodeStats=node_stats, aggStats=agg_stats
    )

    try:
        BeringeiDbAccess().write_node_and_agg_stats_beringei_db(uwr)
    except Exception as e:
        logging.error("Exception happened while writing beringei db")
        logging.warning("Exception: {}".format(e))
