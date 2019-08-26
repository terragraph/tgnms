#!/usr/bin/env python3

import getpass
from datetime import datetime, timedelta

from datainfra.presto.client_lib import GATEWAY_HOST, GATEWAY_PORT_HTTPS, _PrestoClient
from modules.addon_misc import get_range
from pytz import timezone


def _get_ds_ts(start_time, end_time):
    """
    input is in pacific time zone
    output ds is in pacific time zone
    output ts is in UTC time zone, (probably because it is unaffected by DST)
    e.g.
    IN '2017-11-06 20:05:00', '2017-11-06 20:15:00')
    OUT ['2017-11-06'] ['2017-11-07+04:00:99']
    --
    IN '2017-10-30 20:05:00', '2017-11-05 20:15:00'
    OUT ['2017-10-30', '2017-10-31', '2017-11-01', '2017-11-02', '2017-11-03',
        '2017-11-04', '2017-11-05'] []
    --
    IN '2017-11-05 20:05:00', '2017-11-05 23:15:00'
    OUT ['2017-11-05'] ['2017-11-07+04:00:99', '2017-11-07+05:00:99',
        '2017-11-07+06:00:99', '2017-11-07+07:00:99']
    --
    IN '2017-11-06 01:00:00', '2017-11-06 23:00:00'
    OUT ['2017-11-06'] ['2017-11-06+09:00:99', '2017-11-06+10:00:99', ...,
        '2017-11-06+11:00:99', '2017-11-06+22:00:99', '2017-11-06+23:00:99',
        '2017-11-07+00:00:99', '2017-11-07+01:00:99', ...,
        '2017-11-07+06:00:99', '2017-11-07+07:00:99']
    """
    fmt = "%Y-%m-%d %H:%M:%S"
    start_time = datetime.strptime(start_time, fmt)
    start_time = timezone("US/Pacific").localize(start_time)
    end_time = datetime.strptime(end_time, fmt)
    end_time = timezone("US/Pacific").localize(end_time)
    # get ds
    diff = end_time - start_time
    ds = [start_time + timedelta(days=idx) for idx in range(diff.days + 1)]
    ds = [d.strftime("%Y-%m-%d") for d in ds]
    # get ts
    start_time = start_time.astimezone(timezone("UTC"))
    end_time = end_time.astimezone(timezone("UTC"))
    diff = int(diff.seconds / 3600)
    if len(ds) == 1:
        ts = [start_time + timedelta(hours=idx) for idx in range(diff + 1)]
        ts = [t.strftime("%Y-%m-%d+%H:00:99") for t in ts]
    else:
        ts = []
    return ds, ts


def _create_presto_query(keys, nodes, begin_time, end_time):
    ds, ts = _get_ds_ts(begin_time, end_time)
    begin_time, end_time = get_range(begin_time, end_time, -1, -1)
    query_nodes = (
        "node IN (" + ", ".join(["'" + mac.lower() + "'" for mac in nodes]) + ")"
    )
    query_keys = "(" + " OR ".join(["key LIKE '%" + key + "'" for key in keys]) + ")"
    query_ds = "ds IN (" + ", ".join(["'" + d + "'" for d in ds]) + ")"
    if ts:
        query_ts = " AND ts IN (" + ", ".join(["'" + t + "'" for t in ts]) + ")"
    else:
        query_ts = ""
    query_time = "(time >= " + str(begin_time) + " AND time <= " + str(end_time) + ")"
    query = (
        "SELECT * FROM scuba_terragraph_mpk_stats WHERE "
        + query_ds
        + query_ts
        + " AND "
        + query_time
        + " AND "
        + query_nodes
        + " AND "
        + query_keys
    )
    return query


def _exec_presto_query(query):
    presto = _PrestoClient(
        schema="infrastructure",
        # prism for interactive, prism_batch for batch
        catalog="prism",
        user=getpass.getuser(),
        # use this to identify your queries
        source="tg_try_presto",
        query=query,
        host=GATEWAY_HOST,
        port=GATEWAY_PORT_HTTPS,
    )
    return list(presto.execute())


def _cleanup(samples):
    # clean up keys, add peer for samples
    DEFAULT_MAC = "00:00:00:00:00:00"
    for samp in samples:
        samp["node"] = samp["node"].lower()
        key = samp["key"]
        peer_mac = DEFAULT_MAC
        prefix = "tgf."
        if prefix == key[0 : len(prefix)]:
            key = key[len(prefix) :]
            peer_mac = key[: len(peer_mac)]
            key = key[len(peer_mac) + 1 :]
        samp["key"] = key
        samp["peer"] = peer_mac


def fetch_presto_rows(keys, nodes, begin_time, end_time):
    """
    fetch rows from presto, might take minutes
    check status at https://our.intern.facebook.com/intern/presto/query_status/
    """
    query = _create_presto_query(keys, nodes, begin_time, end_time)
    results = _exec_presto_query(query)
    _cleanup(results)
    return results
