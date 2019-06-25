#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

"""
Read/Writes Time Series for entire topology to beringei db as numpy array
Assumes these shapes/axis
StatType.LINK:    num_links x num_dirs x num_times
StatType.NODE:    num_nodes x        1 x num_times
StatType.NETWORK:         1 x        1 x num_times
"""
import asyncio
import logging
from enum import Enum
from math import ceil, cos, fabs, floor, pi, sqrt
from typing import Any, Dict, List, Optional, Tuple

# BTS used for writes, Prometheus used for reads (temporary)
import module.beringei_time_series as bts
import module.prometheus_time_series as pts
import module.numpy_operations as npo
import numpy as np
from facebook.gorilla.Topology.ttypes import LinkType
from module.topology_handler import fetch_network_info
from module.prometheus_time_series import PrometheusReader


def approx_distance(l1: Dict[str, float], l2: Dict[str, float]) -> float:
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


# link stats have src_mac and peer_mac
# node stats have src_mac
# link stats are neither
class StatType(Enum):
    LINK = 1
    NODE = 2
    NETWORK = 3


# NumpyTimeSeries reads and writes the Beringei TimeSeries (BTS) data base
# It provides interface to read/write data in numpy ndarray format
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

        # process topologies
        if not network_info:
            network_info = fetch_network_info()
        self._topologies = [n["topology"] for _, n in network_info.items()]
        self._pdb = PrometheusReader(self._topologies)
        self._num_times = self._pdb.get_array_len(
            start_time=self._start_time,
            end_time=self._end_time,
            read_interval=read_interval,
        )
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
            link_names_to_idx = {}
            link_idx_to_macs = {}
            link_idx_to_link_names = []
            link_idx_to_node_names = []
            src_to_peers = {}
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
                    link_idx_to_link_names.append(l["name"])
                    link_idx_to_node_names.append((l["a_node_name"], l["z_node_name"]))
                    if a_node_mac not in src_to_peers:
                        src_to_peers[a_node_mac] = []
                    if z_node_mac not in src_to_peers:
                        src_to_peers[z_node_mac] = []
                    src_to_peers[a_node_mac].append(z_node_mac)
                    src_to_peers[z_node_mac].append(a_node_mac)
                    src_macs.extend([a_node_mac, z_node_mac])
                    peer_macs.extend([z_node_mac, a_node_mac])
                    link_names_to_idx[(l["name"], a_node_mac)] = (num_links, 0)
                    link_names_to_idx[(l["name"], z_node_mac)] = (num_links, 1)
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
                    "link_idx_to_link_names": link_idx_to_link_names,
                    "link_idx_to_node_names": link_idx_to_node_names,
                    "src_to_peers": src_to_peers,
                    "src_macs": src_macs,
                    "peer_macs": peer_macs,
                    "link_names_to_idx": link_names_to_idx,
                }
            )

    def get_link_names(self) -> List[str]:
        link_names_list = []
        for _, t in enumerate(self._tmap):
            names_per_link = []
            for li in range(t["num_links"]):
                names_per_link.append(t["link_idx_to_link_names"][li])
            link_names_list.append(names_per_link)
        return link_names_list

    def get_node_names_per_link(self) -> List[str]:
        node_names_list = []
        for _, t in enumerate(self._tmap):
            names_per_link = []
            for li in range(t["num_links"]):
                names_per_link.append(t["link_idx_to_node_names"][li])
            node_names_list.append(names_per_link)
        return node_names_list

    def get_node_macs_per_link(self) -> List[str]:
        node_macs_list = []
        for _, t in enumerate(self._tmap):
            macs_per_link = []
            for li in range(t["num_links"]):
                macs_per_link.append(t["link_idx_to_macs"][li, 0])
            node_macs_list.append(macs_per_link)
        return node_macs_list

    def read_stats(
        self,
        name: str,
        stat_type: StatType,
        swap_dir: bool = False,
        entire_network: bool = False,
    ) -> List[np.ndarray]:
        np_time_series_list = []
        try:
            loop = asyncio.get_event_loop()
            for t in self._tmap:
                if stat_type == StatType.LINK:
                    tsl = loop.run_until_complete(
                        self._pdb.read_time_series_list(
                            key_name=name,
                            start_time=self._start_time,
                            end_time=self._end_time,
                            read_interval=self._read_interval,
                            write_interval=self._read_interval,
                            topology_name=t["name"],
                            entire_network=True,
                        )
                    )
                    data = npo.nan_arr((t["num_links"], self.NUM_DIR, self._num_times))
                    for ts in tsl:
                        t_idx = self._pdb.get_bucket_indices_numpy(
                            times=ts.times,
                            start_time=self._start_time,
                            read_interval=self._read_interval,
                        )
                        l_idx, d_idx = t["link_names_to_idx"][
                            (ts.link_name, ts.src_mac)
                        ]
                        data[l_idx, d_idx, t_idx] = np.array(ts.values)
                elif stat_type == StatType.NODE:
                    tsl = loop.run_until_complete(
                        self._pdb.read_time_series_list(
                            key_name=name,
                            start_time=self._start_time,
                            end_time=self._end_time,
                            read_interval=self._read_interval,
                            write_interval=self._read_interval,
                            topology_name=t["name"],
                            entire_network=True,
                        )
                    )
                    data = npo.nan_arr((t["num_nodes"], 1, self._num_times))
                    for ts in tsl:
                        t_idx = self._pdb.get_bucket_indices_numpy(
                            times=ts.times,
                            start_time=self._start_time,
                            read_interval=self._read_interval,
                        )
                        n_idx = t["node_mac_to_idx"][ts.src_mac]
                        data[n_idx, 0, t_idx] = np.array(ts.values)
                else:
                    # network stats read is not supported
                    data = npo.nan_arr((1, 1, self._num_times))
                if swap_dir:
                    data[...] = data[:, [1, 0], :]
                np_time_series_list.append(data)
        except Exception as e:
            logging.error("Error reading link stats {}".format(e))

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

    def get_link_length(self) -> List[np.ndarray]:
        np_time_series_list = []
        for t in self._topologies:
            lengths = []
            node_name_to_site = {n["name"]: n["site_name"] for n in t["nodes"]}
            site_name_to_coordinate = {s["name"]: s["location"] for s in t["sites"]}
            for l in t["links"]:
                if l["link_type"] == LinkType.WIRELESS:
                    al = site_name_to_coordinate[node_name_to_site[l["a_node_name"]]]
                    zl = site_name_to_coordinate[node_name_to_site[l["z_node_name"]]]
                    lengths.append(approx_distance(al, zl))
            lengths = np.array(lengths)
            lengths = np.stack([lengths] * self.NUM_DIR, axis=self.DIR_AXIS)
            lengths = np.expand_dims(lengths, axis=self.TIME_AXIS)
            np_time_series_list.append(lengths)
        return np_time_series_list

    def reshape_node_to_link(self, np_time_series_list):
        out_np_tsl = []
        for topo_idx, topo in enumerate(self._tmap):
            np_ts = np_time_series_list[topo_idx]
            out_np_ts = npo.nan_arr(
                (topo["num_links"], self.NUM_DIR, np_ts.shape[self.TIME_AXIS])
            )
            assert np_ts.shape[self.NODE_AXIS] == topo["num_nodes"]
            assert np_ts.shape[self.DIR_AXIS] == 1
            for n_idx in range(topo["num_nodes"]):
                src_mac = topo["node_idx_to_mac"][n_idx]
                if src_mac in topo["src_to_peers"]:
                    for peer_mac in topo["src_to_peers"][src_mac]:
                        l_idx = topo["link_macs_to_idx"][(src_mac, peer_mac)]
                        out_np_ts[l_idx[0], l_idx[1], :] = np_ts[n_idx, 0, :]
            out_np_tsl.append(out_np_ts)
        return out_np_tsl


# Same as NumpyTimeSeries except:
# this will deal with single topology and link stats
# node stats are converted to link stats dimensions
# use TimeSeries to specify link, with start_time, end_time
# assumes that input link appear once (even though there are two directions)
class NumpyLinkTimeSeries(object):
    NUM_DIR = 2
    LINK_AXIS = 0
    DIR_AXIS = 1
    TIME_AXIS = 2

    def __init__(
        self, links: List[pts.TimeSeries], interval: int, network_info: Dict
    ) -> None:
        self._topology = [n["topology"] for _, n in network_info.items()][0]
        link_macs_to_name = {}
        for l in self._topology["links"]:
            if l["link_type"] == LinkType.WIRELESS:
                link_macs_to_name[(l["a_node_mac"], l["z_node_mac"])] = l["name"]
                link_macs_to_name[(l["z_node_mac"], l["a_node_mac"])] = l["name"]

        self._interval = interval
        # map from start_time -> {src_macs, peer_macs}
        self._map_query: Dict[int, Dict] = {}
        # (src_mac, peer_mac) -> (link idx, direction idx, start_time)
        self._link_macs_to_idx: Dict[Tuple, Tuple] = {}
        # (link idx, direction idx) -> (src_mac, peer_mac, start_time)
        self._idx_to_link_info: Dict[Tuple, Tuple] = {}
        # src_mac -> [peer_mac, ...]
        self._src_to_peers: Dict[str, List[str]] = {}
        self._link_names_to_idx: Dict[Tuple, Tuple] = {}
        self._num_links = 0
        self._duration = 0
        self.idx_to_link_name_dir: Dict[Tuple] = {}

        self._pdb = PrometheusReader([self._topology])
        for ts in links:
            # set the duration
            start_time = ceil(ts.times[0] / self._interval) * self._interval
            end_time = floor(ts.times[1] / self._interval) * self._interval
            duration = end_time - start_time
            if self._duration == 0:
                self._duration = duration
            elif self._duration != duration:
                logging.error("detected links with different durations, using shorter")
                self._duration = min(self._duration, duration)
            # set the indices for link, direction, time
            if (ts.src_mac, ts.peer_mac) in self._link_macs_to_idx:
                # this can happen for parallel tests,
                # where both directions are specified by input links list
                continue
            self._link_macs_to_idx[(ts.src_mac, ts.peer_mac)] = (
                self._num_links,
                0,
                start_time,
            )
            self._link_macs_to_idx[(ts.peer_mac, ts.src_mac)] = (
                self._num_links,
                1,
                start_time,
            )
            self._idx_to_link_info[(self._num_links, 0)] = (
                ts.src_mac,
                ts.peer_mac,
                start_time,
            )
            self._idx_to_link_info[(self._num_links, 1)] = (
                ts.peer_mac,
                ts.src_mac,
                start_time,
            )
            self.idx_to_link_name_dir[self._num_links] = ts.link_name
            link_name = link_macs_to_name[(ts.src_mac, ts.peer_mac)]
            self._link_names_to_idx[(link_name, ts.src_mac)] = (
                self._num_links,
                0,
                start_time,
            )
            self._link_names_to_idx[(link_name, ts.peer_mac)] = (
                self._num_links,
                1,
                start_time,
            )
            # group queries
            assert (not ts.topology) or (
                ts.topology == self._topology["name"]
            ), "topology name mismatch, '{}', '{}'".format(
                ts.topology, self._topology["name"]
            )
            key = start_time
            if key not in self._map_query:
                self._map_query[key] = {"src_macs": [], "peer_macs": []}
            self._map_query[key]["src_macs"].extend([ts.src_mac, ts.peer_mac])
            self._map_query[key]["peer_macs"].extend([ts.peer_mac, ts.src_mac])
            # src_to_peers
            if ts.src_mac not in self._src_to_peers:
                self._src_to_peers[ts.src_mac] = []
            if ts.peer_mac not in self._src_to_peers:
                self._src_to_peers[ts.peer_mac] = []
            self._src_to_peers[ts.src_mac].append(ts.peer_mac)
            self._src_to_peers[ts.peer_mac].append(ts.src_mac)
            self._num_links += 1
        self._num_times = self._pdb.get_array_len(
            start_time=0, end_time=self._duration, read_interval=self._interval
        )

        # create write_mask,
        # depending upon input, write either specific or both directions
        self._write_mask = np.zeros((self._num_links, self.NUM_DIR, 1), dtype=bool)
        for ts in links:
            l_idx, d_idx, _ = self._link_macs_to_idx[(ts.src_mac, ts.peer_mac)]
            self._write_mask[l_idx, d_idx, 0] = True

    def tsl_to_arr(self, tsl: List[pts.TimeSeries], stats_name: str = "") -> np.ndarray:
        data = npo.nan_arr((self._num_links, self.NUM_DIR, self._num_times))
        done_links: List[Tuple] = []
        for ts in tsl:
            if stats_name and ts.name != stats_name:
                continue
            link_params = (ts.src_mac, ts.link_name)
            if link_params not in done_links:
                done_links.append(link_params)
            else:
                logging.error("Ignoring duplicate timeseries")
                continue
            if (ts.link_name, ts.src_mac) not in self._link_names_to_idx:
                logging.error(
                    "Unexpected {} is not in _link_names_to_idx".format(
                        (ts.link_name, ts.src_mac)
                    )
                )
            else:
                l_idx, d_idx, tm = self._link_names_to_idx[(ts.link_name, ts.src_mac)]
                t_idx = self._pdb.get_bucket_indices_numpy(
                    times=ts.times, start_time=tm, read_interval=self._interval
                )
                data[l_idx, d_idx, t_idx] = np.array(ts.values)
        return data

    def read_stats(
        self,
        name: str,
        stat_type: StatType,
        swap_dir: bool = False,
        entire_network: bool = True,
    ) -> np.ndarray:
        loop = asyncio.get_event_loop()
        tasks = []
        if stat_type == StatType.LINK:
            tsl = []
            if len(self._map_query.keys()) > 1:
                entire_network = False
            for k, v in self._map_query.items():
                tasks.append(
                    loop.create_task(
                        self._pdb.read_time_series_list(
                            key_name=name,
                            src_macs=v["src_macs"],
                            start_time=k,
                            end_time=k + self._duration,
                            write_interval=self._interval,
                            read_interval=self._interval,
                            topology_name=self._topology["name"],
                            entire_network=entire_network,
                        )
                    )
                )
            try:
                tsl = [
                    item
                    for sublist in loop.run_until_complete(asyncio.gather(*tasks))
                    for item in sublist
                ]
                data = self.tsl_to_arr(tsl)
            except Exception as e:
                logging.error("Unexpected error in async loop {}".format(e))

        elif stat_type == StatType.NODE:
            data = npo.nan_arr((self._num_links, self.NUM_DIR, self._num_times))
            for k, v in self._map_query.items():
                tasks.append(
                    loop.create_task(
                        self._pdb.read_time_series_list(
                            key_name=name,
                            src_macs=list(set(v["src_macs"] + v["peer_macs"])),
                            start_time=k,
                            end_time=k + self._duration,
                            read_interval=self._interval,
                            write_interval=self._interval,
                            topology_name=self._topology["name"],
                            entire_network=entire_network,
                        )
                    )
                )
            try:
                tsl = [
                    item
                    for sublist in loop.run_until_complete(asyncio.gather(*tasks))
                    for item in sublist
                ]
                done_nodes: List[str] = []
                for ts in tsl:
                    if ts.src_mac not in done_nodes:
                        done_nodes.append(ts.src_mac)
                    else:
                        logging.error("Ignoring duplicate timeseries")
                        continue
                    for peer_mac in self._src_to_peers[ts.src_mac]:
                        l_idx, d_idx, tm = self._link_macs_to_idx[
                            (ts.src_mac, peer_mac)
                        ]
                        t_idx = self._pdb.get_bucket_indices_numpy(
                            times=ts.times, start_time=tm, read_interval=self._interval
                        )
                        data[l_idx, d_idx, t_idx] = np.array(ts.values)
            except Exception as e:
                logging.error("Unexpected error in async loop {}".format(e))
        else:
            # network stats read is not relevant
            pass
        if swap_dir:
            data[...] = data[:, [1, 0], :]
        return data

    # converts numpy array to list of TimeSeries
    def write_stats(
        self, name: str, np_time_series: np.ndarray, write_interval: int
    ) -> List[bts.TimeSeries]:
        np_ts = np_time_series
        tsl = []

        assert np_ts.shape[self.LINK_AXIS] == self._num_links
        assert np_ts.shape[self.DIR_AXIS] == self.NUM_DIR
        for l_idx in range(self._num_links):
            for d_idx in range(self.NUM_DIR):
                if not self._write_mask[l_idx, d_idx, 0]:
                    continue
                valids = npo.is_valid(np_ts[l_idx, d_idx, :])
                values = np_ts[l_idx, d_idx, valids]
                if len(values):
                    src_mac, peer_mac, start_time = self._idx_to_link_info[
                        (l_idx, d_idx)
                    ]
                    end_time = start_time + self._duration
                    end_time = floor(end_time / write_interval) * write_interval
                    times = end_time - (
                        np.array(range(np_ts.shape[self.TIME_AXIS] - 1, -1, -1))
                        * write_interval
                    )
                    ts = bts.TimeSeries(
                        values=list(values),
                        times=list(times[valids]),
                        name=name,
                        topology=self._topology["name"],
                        src_mac=src_mac,
                        peer_mac=peer_mac,
                    )
                    tsl.append(ts)

        return tsl

    def get_link_length(self) -> np.ndarray:
        data = npo.nan_arr((self._num_links, self.NUM_DIR, 1))
        t = self._topology
        mac_to_site = {n["mac_addr"]: n["site_name"] for n in t["nodes"]}
        site_name_to_coordinate = {s["name"]: s["location"] for s in t["sites"]}
        for link_mac, idx in self._link_macs_to_idx.items():
            l_idx, d_idx, _ = idx
            src_coo = site_name_to_coordinate[mac_to_site[link_mac[0]]]
            peer_coo = site_name_to_coordinate[mac_to_site[link_mac[1]]]
            data[l_idx, d_idx, 0] = approx_distance(src_coo, peer_coo)
        return data

    def get_consts(self) -> Dict[Any, Any]:
        consts = {}
        consts["num_topologies"] = 1
        consts["num_times"] = self._num_times
        consts[0] = {}
        consts[0]["num_nodes"] = 0
        consts[0]["num_links"] = self._num_links
        return consts
