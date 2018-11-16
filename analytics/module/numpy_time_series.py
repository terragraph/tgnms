#!/usr/bin/env python3

"""
Read/Writes Time Series for entire topology to beringei db as numpy array
Assumes these shapes/axis
StatType.LINK:    num_links x num_dirs x num_times
StatType.NODE:    num_nodes x        1 x num_times
StatType.NETWORK:         1 x        1 x num_times
"""
from enum import Enum
import numpy as np
import os
from math import ceil, floor, fabs, pi, sqrt, cos
import sys
from typing import Any, Dict, List, Optional
from module.topology_handler import fetch_network_info
import module.beringei_time_series as bts
import module.numpy_operations as npo

sys.path.append(
    os.path.abspath(os.path.join(os.path.dirname(__file__), "..") + "/interface/gen-py")
)
from facebook.gorilla.Topology.ttypes import LinkType


# link stats have src_mac and peer_mac
# node stats have src_mac
# link stats are neither
class StatType(Enum):
    LINK = 1
    NODE = 2
    NETWORK = 3


class NumpyTimeSeries(object):
    NUM_DIR = 2
    NODE_AXIS = 0
    LINK_AXIS = 0
    DIR_AXIS = 1
    TIME_AXIS = 2

    def __init__(
        self,
        start_time: int,
        end_time: int,
        read_interval: int,
        network_info: Optional[Dict] = None,
    ) -> None:
        self._read_interval = read_interval
        self._start_time = ceil(start_time / read_interval) * read_interval
        self._end_time = floor(end_time / read_interval) * read_interval
        self._times_to_idx = {
            t: i
            for i, t in enumerate(
                range(self._start_time, self._end_time + 1, read_interval)
            )
        }
        self._num_times = len(self._times_to_idx)
        # process topologies
        if not network_info:
            network_info = fetch_network_info()
        self._topologies = [n["topology"] for _, n in network_info.items()]
        self._tmap = []
        for t in self._topologies:
            # for node stats
            node_mac_to_idx = {}
            node_idx_to_mac = {}
            node_macs = []
            for i, n in enumerate(t["nodes"]):
                node_mac_to_idx[n["mac_addr"]] = i
                node_idx_to_mac[i] = n["mac_addr"]
                node_macs.append(n["mac_addr"])
            num_nodes = len(node_mac_to_idx)
            # for link stats
            node_name_to_mac = {n["name"]: n["mac_addr"] for n in t["nodes"]}
            link_macs_to_idx = {}
            link_idx_to_macs = {}
            src_macs = []
            peer_macs = []
            num_links = 0
            for l in t["links"]:
                if l["link_type"] == LinkType.WIRELESS:
                    a_node_mac = node_name_to_mac[l["a_node_name"]]
                    z_node_mac = node_name_to_mac[l["z_node_name"]]
                    link_macs_to_idx[(a_node_mac, z_node_mac)] = (num_links, 0)
                    link_macs_to_idx[(z_node_mac, a_node_mac)] = (num_links, 1)
                    link_idx_to_macs[(num_links, 0)] = (a_node_mac, z_node_mac)
                    link_idx_to_macs[(num_links, 1)] = (z_node_mac, a_node_mac)
                    src_macs.extend([a_node_mac, z_node_mac])
                    peer_macs.extend([z_node_mac, a_node_mac])
                    num_links += 1
            self._tmap.append(
                {
                    "name": t["name"],
                    "num_nodes": num_nodes,
                    "node_mac_to_idx": node_mac_to_idx,
                    "node_idx_to_mac": node_idx_to_mac,
                    "node_macs": node_macs,
                    "num_links": num_links,
                    "link_macs_to_idx": link_macs_to_idx,
                    "link_idx_to_macs": link_idx_to_macs,
                    "src_macs": src_macs,
                    "peer_macs": peer_macs,
                }
            )

    def t2i(self, t: int) -> int:
        return self._times_to_idx[floor(t / self._read_interval) * self._read_interval]

    def read_stats(self, name: str, stat_type: StatType) -> List[np.ndarray]:
        np_time_series_list = []
        for t in self._tmap:
            if stat_type == StatType.LINK:
                tsl = bts.read_time_series_list(
                    name,
                    t["src_macs"],
                    t["peer_macs"],
                    self._start_time,
                    self._end_time,
                    self._read_interval,
                    t["name"],
                )
                data = npo.nan_arr((t["num_links"], self.NUM_DIR, self._num_times))
                for ts in tsl:
                    t_idx = [self.t2i(x) for x in ts.times]
                    l_idx = t["link_macs_to_idx"][(ts.src_mac, ts.peer_mac)]
                    data[l_idx[0], l_idx[1], t_idx] = ts.values
            elif stat_type == StatType.NODE:
                tsl = bts.read_time_series_list(
                    name,
                    t["node_macs"],
                    [],
                    self._start_time,
                    self._end_time,
                    self._read_interval,
                    t["name"],
                )
                data = npo.nan_arr((t["num_nodes"], 1, self._num_times))
                for ts in tsl:
                    t_idx = [self.t2i(x) for x in ts.times]
                    n_idx = t["node_mac_to_idx"][ts.src_mac]
                    data[n_idx, 0, t_idx] = ts.values
            else:
                # network stats read is not supported
                data = npo.nan_arr((1, 1, self._num_times))
            np_time_series_list.append(data)
        return np_time_series_list

    def write_stats(
        self,
        name: str,
        np_time_series_list: List[np.ndarray],
        stat_type: StatType,
        write_interval: int,
    ) -> List[bts.TimeSeries]:
        tsl = []
        end_time = floor(self._end_time / write_interval) * write_interval
        for topo_idx, topo in enumerate(self._tmap):
            np_ts = np_time_series_list[topo_idx]
            times = end_time - (
                np.array(range(np_ts.shape[self.TIME_AXIS] - 1, -1, -1))
                * write_interval
            )
            if stat_type == StatType.LINK:
                assert np_ts.shape[self.LINK_AXIS] == topo["num_links"]
                assert np_ts.shape[self.DIR_AXIS] == self.NUM_DIR
                for l_idx in range(topo["num_links"]):
                    for d_idx in range(self.NUM_DIR):
                        valids = npo.is_valid(np_ts[l_idx, d_idx, :])
                        values = np_ts[l_idx, d_idx, valids]
                        if len(values):
                            src_mac, peer_mac = topo["link_idx_to_macs"][(l_idx, d_idx)]
                            ts = bts.TimeSeries(
                                values=list(values),
                                times=list(times[valids]),
                                name=name,
                                topology=topo["name"],
                                src_mac=src_mac,
                                peer_mac=peer_mac,
                            )
                            tsl.append(ts)
            elif stat_type == StatType.NODE:
                assert np_ts.shape[self.NODE_AXIS] == topo["num_nodes"]
                assert np_ts.shape[self.DIR_AXIS] == 1
                for n_idx in range(topo["num_nodes"]):
                    valids = npo.is_valid(np_ts[n_idx, 0, :])
                    values = np_ts[n_idx, 0, valids]
                    if len(values):
                        src_mac = topo["node_idx_to_mac"][n_idx]
                        ts = bts.TimeSeries(
                            values=list(values),
                            times=list(times[valids]),
                            name=name,
                            topology=topo["name"],
                            src_mac=src_mac,
                        )
                        tsl.append(ts)
            elif stat_type == StatType.NETWORK:
                assert np_ts.shape[self.NODE_AXIS] == 1
                assert np_ts.shape[self.DIR_AXIS] == 1
                valids = npo.is_valid(np_ts[0, 0, :])
                values = np_ts[0, 0, valids]
                if len(values):
                    ts = bts.TimeSeries(
                        values=list(values),
                        times=list(times[valids]),
                        name=name,
                        topology=topo["name"],
                    )
                    tsl.append(ts)
        if len(tsl):
            bts.write_time_series_list(tsl, [write_interval])

        return tsl

    def get_consts(self) -> Dict[Any, Any]:
        consts = {}
        consts["num_topologies"] = len(self._tmap)
        consts["num_times"] = self._num_times
        for it in range(consts["num_topologies"]):
            consts[it] = {}
            consts[it]["num_nodes"] = self._tmap[it]["num_nodes"]
            consts[it]["num_links"] = self._tmap[it]["num_links"]
        return consts

    def approx_distance(self, l1: Dict[str, float], l2: Dict[str, float]) -> float:
        # copied from approxDistance() in
        # meta-terragraph/recipes-facebook/e2e/files/src/controller/topology/TopologyWrapper.cpp
        # https://en.wikipedia.org/wiki/Earth
        # Circumference 40,075.017 km (24,901.461 mi) (equatorial)
        earthCircumference = 40075017
        deg = 360
        rad = 2 * pi
        lengthPerDeg = earthCircumference / deg
        avgLatitudeRadian = ((l1["latitude"] + l2["latitude"]) / 2) * (rad / deg)
        # calculate distance across latitude change
        dLat = fabs(l1["latitude"] - l2["latitude"]) * lengthPerDeg
        # calculate distance across longitude change
        # take care of links across 180 meridian and effect of different latitudes
        dLong = fabs(l1["longitude"] - l2["longitude"])
        if dLong > (deg / 2):
            dLong = deg - dLong
        dLong *= lengthPerDeg * cos(avgLatitudeRadian)
        # calculate distance across altitude change
        dAlt = fabs(l1["altitude"] - l2["altitude"])
        # assume orthogonality over small distance
        return sqrt((dLat * dLat) + (dLong * dLong) + (dAlt * dAlt))

    def get_link_length(self) -> np.ndarray:
        np_time_series_list = []
        for t in self._topologies:
            lengths = []
            node_name_to_site = {n["name"]: n["site_name"] for n in t["nodes"]}
            site_name_to_coordinate = {s["name"]: s["location"] for s in t["sites"]}
            for l in t["links"]:
                if l["link_type"] == LinkType.WIRELESS:
                    al = site_name_to_coordinate[node_name_to_site[l["a_node_name"]]]
                    zl = site_name_to_coordinate[node_name_to_site[l["z_node_name"]]]
                    lengths.append(self.approx_distance(al, zl))
            lengths = np.array(lengths)
            lengths = np.stack([lengths] * self.NUM_DIR, axis=self.DIR_AXIS)
            # lengths = np.stack([lengths] * self._num_times, axis=self.TIME_AXIS)
            lengths = np.expand_dims(lengths, axis=self.TIME_AXIS)
            np_time_series_list.append(lengths)
        return np_time_series_list
