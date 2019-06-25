#!/usr/bin/env python3

"""
Read from Prometheus timeseries database
"""

import aiohttp
import asyncio
import logging
import math
import time
from typing import Optional, List, Dict, Tuple
from json import loads, load
import module.numpy_operations as npo
import numpy as np
from module.path_store import PathStore
from asyncio import TimeoutError
from json.decoder import JSONDecodeError
from facebook.gorilla.Topology.ttypes import LinkType


def replace_invalid_chars(key_name):
    key_name = (
        key_name.replace(".", "_")
        .replace("-", "_")
        .replace("/", "_")
        .replace("[", "_")
        .replace("]", "_")
    )
    return key_name


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
                and self.link_name == other.link_name
                and self.link_direction == other.link_direction
            )
        return False

    def __repr__(self):
        return "name={}, src_mac={}, topology={}, peer_mac={}, link_name={}, link_direction={}".format(
            self.name,
            self.src_mac,
            self.topology,
            self.peer_mac,
            self.link_name,
            self.link_direction,
        )

    def __init__(
        self,
        values: List,
        times: List,
        name: str,
        topology: str,
        src_mac: Optional[str] = None,
        peer_mac: Optional[str] = None,
        link_name: Optional[str] = None,
        link_direction: Optional[str] = None,
    ) -> None:
        self.values = values
        self.times = times
        self.name = name
        self.src_mac = None
        if src_mac:
            self.src_mac = src_mac.lower()
        self.peer_mac = None
        if peer_mac:
            self.peer_mac = peer_mac.lower()
        self.link_name = None
        if link_name:
            self.link_name = link_name
        self.link_direction = None
        if link_direction:
            self.link_direction = link_direction

        self.topology = topology


class PrometheusReader:
    def __init__(self, topologies: List[Dict], timeout: Optional[int] = 30):
        try:
            with open(PathStore.ANALYTICS_CONFIG_FILE) as local_file:
                analytics_config = load(local_file)
        except Exception:
            logging.error("Cannot find the configuration file")
            return

        if "PROMETHEUS" not in analytics_config:
            logging.error("Cannot find PROMETHEUS config in the configurations")
            return
        else:
            self.prometheus_config = analytics_config["PROMETHEUS"]

        # prometheus does not support certain characters so key names change
        # this is a map from the link names in the topology to the link names
        # in prometheus
        self.pdb_name_to_topo_name = {}
        try:
            for topology in topologies:
                for link in topology["links"]:
                    if link["link_type"] == LinkType.WIRELESS:
                        self.pdb_name_to_topo_name[
                            replace_invalid_chars(link["name"])
                        ] = link["name"]
        except Exception as e:
            logging.error("Error with topology format {}".format(e))
        self.timeout = timeout

    async def _json_get(self, end_point: str, data: Optional[Dict]) -> Dict:
        try:
            url = "http://{}:{}/api/v1".format(
                self.prometheus_config["hostname"], self.prometheus_config["port"]
            )
            addr = "{}/{}".format(url, end_point)
            async with aiohttp.ClientSession() as session:
                async with session.get(addr, params=data, timeout=self.timeout) as resp:
                    return await resp.json()
        except aiohttp.ClientConnectionError as e:
            logging.error("Cannot connect to Prometheus {}".format(e))
        except (aiohttp.ClientError, JSONDecodeError, TimeoutError):
            logging.error(
                "Error with Prometheus GET addr: {}: data: {}".format(addr, data)
            )
        except Exception as e:
            logging.error(
                "Unknown error reading prometheus {} addr: {}".format(e, addr)
            )
        return {}

    def _get_prometheus_query_url(
        self,
        key_name: str,
        start_time: int,
        end_time: int,
        write_interval: int,
        read_interval: int,
        topology_name: str,
        entire_network: bool,
        src_macs: Optional[List[str]] = [],
    ) -> Tuple[Dict, Dict]:

        # just use src_macs - for P2MP, we might get some extra stuff - that's OK
        query_macs = ""
        if not entire_network:
            query_macs = ',nodeMac="'
            for index, sm in enumerate(src_macs):
                query_macs += sm.lower()
                if index < len(src_macs) - 1:
                    query_macs += "|"
            query_macs += '"'

        # prometheus does not like certain characters
        key_name = replace_invalid_chars(key_name)

        # a prometheus range query will return resuls at the specified step
        # if the value if missing, it will return the previous value repeated for
        # up to 5mn and then it will skip
        # that is why we also need to read the timestamp so we can flag duplicate
        # samples
        end_point = "query_range"
        step = "{}s".format(read_interval)
        query_data = '{}{{network="{}",intervalSec="{}"{}}}'.format(
            key_name, topology_name, write_interval, query_macs
        )
        query_timestamp = 'timestamp({}{{network="{}",intervalSec="{}"{}}})'.format(
            key_name, topology_name, write_interval, query_macs
        )
        start = start_time
        end = end_time
        payload_data = {"query": query_data, "start": start, "end": end, "step": step}

        payload_timestamp = {
            "query": query_timestamp,
            "start": start,
            "end": end,
            "step": step,
        }
        return payload_data, payload_timestamp

    # ts_hash contains the list index in the timestamp list
    # given the linkname/direction or nodename
    # or networkname (depending on the stat type); this function
    # returns True if successful, False otherwise
    def _set_hash_from_timestamp(self, ts_hash: Dict, timestamp: List[Dict]) -> bool:
        try:
            # first create a table of link names -> array indices so that this
            # loop isn't O(n^2)
            for index, timestamp_metric in enumerate(timestamp["data"]["result"]):
                timestamp_metric_metric = timestamp_metric["metric"]
                if "linkName" in timestamp_metric_metric:
                    # if linkName is present, linkDirection should also be present
                    ts_hash[
                        timestamp_metric_metric["linkName"],
                        timestamp_metric_metric["linkDirection"],
                    ] = index
                elif "nodeName" in timestamp_metric_metric:
                    ts_hash[timestamp_metric_metric["nodeName"]] = index
                elif "network" in timestamp_metric_metric:
                    ts_hash[timestamp_metric_metric["network"]] = index
                else:
                    logging.error(
                        "Unexpected label values {}".format(timestamp_metric_metric)
                    )
            return True
        except TypeError as e:
            logging.error("TypeError creating ts_hash: {}".format(e))
            return False
        except Exception as e:
            logging.error("Exception creating ts_hash: {}".format(e))
            return False

    # given an entry in the metric list returned from Prometheus, this function
    # returns the index number in the timestamp list
    def _get_index_from_hash(
        self, data_metric_metric: Dict, ts_hash: Dict
    ) -> Optional[int]:
        # find the corresponding timestamp
        try:
            if "linkName" in data_metric_metric:
                # if linkName is present, linkDirection should also be present
                index = ts_hash[
                    data_metric_metric["linkName"], data_metric_metric["linkDirection"]
                ]
            elif "nodeName" in data_metric_metric:
                index = ts_hash[data_metric_metric["nodeName"]]
            elif "network" in data_metric_metric:
                index = ts_hash[data_metric_metric["network"]]
            else:
                logging.error("Unexpected label values {}".format(data_metric_metric))
                return
            return index
        except KeyError as e:
            logging.error("KeyError {} is in data but not in timestamp {}".format(e))
            return
        except Exception as e:
            logging.error("Unexpected exception getting index: {}".format(e))
            return

    def get_array_len(self, start_time: int, end_time: int, read_interval: int) -> int:
        return math.floor((end_time - start_time) / read_interval) + 1

    # function returns indices into an expanded array
    def get_bucket_indices_numpy(
        self, times: List, start_time: int, read_interval: int
    ) -> np.ndarray:
        np_times = np.array(times, dtype=int)
        indices = np.ceil((np_times - start_time) / read_interval).astype(int)
        assert (indices >= 0).all()
        return indices

    # read prometheus
    # output is numpy - two different arrays: times and values
    # times contains unique timestamps and values are the corresonding values
    async def read_time_series_list(
        self,
        key_name: str,
        start_time: int,
        end_time: int,
        write_interval: int,
        read_interval: int,
        topology_name: str,
        entire_network: bool,
        src_macs: Optional[List[str]] = [],
    ) -> List[TimeSeries]:
        """
        key_name - name of the stat (e.g. "snr") - this is a short name
        src_macs - list of MAC addresses (optional if entire network)
        peer_macs - list of MAC addresses (optional if entire network)
        start_time/end_time -  unix timestamp
        write_interval - is the write interval - 1, 30, or 900
        read_interval - is the spacing of the prometheus reads
        topology_name - e.g. "sjc"
        entire_network - flag to query the entire network
        """

        payload_data, payload_timestamp = self._get_prometheus_query_url(
            key_name=key_name,
            start_time=start_time,
            end_time=end_time,
            write_interval=write_interval,
            read_interval=read_interval,
            topology_name=topology_name,
            entire_network=entire_network,
            src_macs=src_macs,
        )

        data, timestamp = await asyncio.gather(
            self._json_get("query_range", payload_data),
            self._json_get("query_range", payload_timestamp),
        )

        if not data or not timestamp:
            logging.error("Prometheus read {} returned nothing".format(key_name))
            return []

        try:
            if data["status"] != "success" or timestamp["status"] != "success":
                logging.error(
                    "Prometheus result did not return success data: {} timestamp: {}".format(
                        data["status"], timestamp["status"]
                    )
                )
                return []
        except Exception as e:
            logging.error("Prometheus format output error: {}".format(e))
            return []

        # first create a table of link names -> array indices so that this
        # loop isn't O(n^2)
        ts_hash = {}
        if not self._set_hash_from_timestamp(ts_hash, timestamp):
            return []

        try:
            time_series_list = []
            for data_metric in data["data"]["result"]:
                # data["data"]["result"] is a list of "metrics" (e.g. snr)
                # data_metric["metric"] is a dict with __name__, linkName ...
                # data_metric["values"] is a list of tuples (ts, value)
                data_metric_metric = data_metric["metric"]
                # find the corresponding timestamp
                index = self._get_index_from_hash(data_metric_metric, ts_hash)
                if index is None:
                    continue

                timestamp_metric = timestamp["data"]["result"][index]

                # put data in buckets; prometheus will repeat the same
                # timestamp/value if there is missing data for < 5mn, that's OK
                data_lst = []
                ts_lst = []
                ts_val_ = 0
                for value_index, ts in enumerate(timestamp_metric["values"]):
                    # prometheus output format is
                    # 'values':[[prom_ts0, '<value>'], [prom_ts1, '<value>'], ...]
                    ts_val = int(ts[1])
                    data_val = int(data_metric["values"][value_index][1])
                    if (
                        ts_val != ts_val_
                        and math.ceil((int(ts[1]) - start_time) / read_interval) >= 0
                    ):
                        data_lst.append(int(data_metric["values"][value_index][1]))
                        ts_lst.append(ts_val)
                        ts_val_ = ts_val
                link_name = None
                if "linkName" in data_metric_metric:
                    if data_metric_metric["linkName"] in self.pdb_name_to_topo_name:
                        link_name = self.pdb_name_to_topo_name[
                            data_metric_metric["linkName"]
                        ]
                    else:
                        logging.error(
                            "Unexpected error, {} is not in pdb_name_to_topo_name".format(
                                data_metric_metric["linkName"]
                            )
                        )
                        continue

                if not data_lst or not ts_lst:
                    logging.error(
                        "No Prometheus time series values for link {}".format(
                            data_metric_metric["linkName"]
                        )
                    )

                time_series = TimeSeries(
                    values=data_lst,
                    times=ts_lst,
                    name=data_metric_metric["__name__"],
                    src_mac=data_metric_metric.get("nodeMac"),
                    link_name=link_name,
                    link_direction=data_metric_metric.get("linkDirection"),
                    topology=data_metric_metric["network"],
                )
                time_series_list.append(time_series)

            return time_series_list

        except Exception as e:
            logging.error("Exception creating prometheus output: {}".format(e))
            return []
