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
        self.src_mac = src_mac
        self.peer_mac = peer_mac
        self.topology = topology


# each RawReadQuery can contain multiple RawQueryKey
# but use only one RawQueryKey
# due to bug in Beringei or BQS/RawReadBeringeiData
def __get_copy_rrq(rrq: bq.RawReadQuery) -> bq.RawReadQuery:
    copy_rrq = bq.RawReadQuery()
    copy_rrq.startTimestamp = rrq.startTimestamp
    copy_rrq.endTimestamp = rrq.endTimestamp
    copy_rrq.interval = rrq.interval
    copy_rrq.queryKeyList = [bq.RawQueryKey()]
    copy_rrq.queryKeyList[0].topologyName = rrq.queryKeyList[0].topologyName
    copy_rrq.queryKeyList[0].metricName = rrq.queryKeyList[0].metricName
    copy_rrq.queryKeyList[0].sourceMac = rrq.queryKeyList[0].sourceMac
    copy_rrq.queryKeyList[0].peerMac = rrq.queryKeyList[0].peerMac
    return copy_rrq


def read_time_series_list(
    name: str,
    src_macs: List[str],
    peer_macs: List[str],
    start_time: int,
    end_time: int,
    interval: int,
    topology_name: str,
) -> List[TimeSeries]:
    src_macs = [m.lower() for m in src_macs]
    peer_macs = [m.lower() for m in peer_macs]
    name = name.lower()
    if len(peer_macs):
        assert len(src_macs) == len(peer_macs)
    rrqr = bq.RawReadQueryRequest()
    rrqr.queries = []
    rrq = bq.RawReadQuery()
    rrq.startTimestamp = start_time
    rrq.endTimestamp = end_time
    rrq.queryKeyList = [bq.RawQueryKey()]
    rrq.interval = interval
    rrq.queryKeyList[0].topologyName = topology_name
    rrq.queryKeyList[0].metricName = name
    if src_macs:
        for i in range(len(src_macs)):
            rrq.queryKeyList[0].sourceMac = src_macs[i]
            if len(peer_macs):
                rrq.queryKeyList[0].peerMac = peer_macs[i]
            else:
                rrq.queryKeyList[0].peerMac = None
            rrqr.queries.append(__get_copy_rrq(rrq))
    else:
        # unsupported in BQS
        rrq.queryKeyList[0].sourceMac = None
        rrq.queryKeyList[0].peerMac = None
        rrqr.queries.append(__get_copy_rrq(rrq))

    # execute query and convert non-empty time-series to list
    try:
        resp = BeringeiDbAccess().read_beringei_db(rrqr)
    except Exception as e:
        logging.error("Exception happened while reading beringei db")
        logging.warning("Exception: {}".format(e))
        return []

    time_series_list = []
    for q in range(len(rrqr.queries)):
        for k in range(len(rrqr.queries[q].queryKeyList)):
            ts = resp.queryReturnList[q].timeSeriesAndKeyList[k].timeSeries
            if len(ts):
                time_series = TimeSeries(
                    values=[p.value for p in ts],
                    times=[p.unixTime for p in ts],
                    name=rrqr.queries[q].queryKeyList[k].metricName,
                    src_mac=rrqr.queries[q].queryKeyList[k].sourceMac,
                    peer_mac=rrqr.queries[q].queryKeyList[k].peerMac,
                    topology=rrqr.queries[q].queryKeyList[k].topologyName,
                )
                time_series_list.append(time_series)

    return time_series_list


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
