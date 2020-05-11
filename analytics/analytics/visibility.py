#!/usr/bin/env python3

"""Provides a function which determines the power status of CNs using a
combination of node/link stats.
"""

import asyncio
import logging
import re
from dataclasses import dataclass, field
from enum import IntEnum
from types import SimpleNamespace
from typing import Any, Dict, List, Optional, Pattern, Set, Union

from terragraph_thrift.Topology.ttypes import LinkType, NodeType
from tglib.clients.prometheus_client import (
    PrometheusClient,
    PrometheusMetric,
    consts,
    ops,
)
from tglib.exceptions import ClientRuntimeError

from .utils.topology import NetworkInfo


# metric names used
FW_UPTIME = "fw_uptime"
MISCSYS_TSF = "tgf_00:00:00:00:00:00_miscsys_tsf"
LINK_ATTEMPTS = "link_attempts"


class NodePowerStatus(IntEnum):
    """List of possible states of functionality that checks CN power status
    1. DN initiator is not reachable and therefore can't determine CN status
    2. the E2E is not sending any assoc requrests
    3. the link is alive
    4. the CN is powered off (or is unreachable)
    5. unknown is an error state

    Ordering/values should not be changed for backward compatibility; add
    new entries to the end of the list.
    """

    INIT_UNREACHABLE = 1
    NO_ASSOC_REQS = 2
    LINK_ALIVE = 3
    CN_POWERED_OFF = 4
    UNKNOWN = 5


@dataclass
class NodeState:
    """Struct for representing state of the CN node."""

    topology_name: str
    node_name: str
    link_name: str
    node_mac: str
    state: NodePowerStatus


@dataclass
class NetworkCNs:
    """Struct for representing information about CNs."""

    link_name_set: Set[str] = field(default_factory=set)
    # link name as in Prometheus: raw link name
    link_name_prometheus: Dict[str, str] = field(default_factory=dict)
    link_name_to_cn_name: Dict[str, str] = field(default_factory=dict)
    link_name_to_cn_mac: Dict[str, str] = field(default_factory=dict)
    link_name_to_dn_mac: Dict[str, str] = field(default_factory=dict)
    cn_mac_to_link_name: Dict[str, str] = field(default_factory=dict)
    dn_mac_to_cn_mac_set: Dict[str, Set[str]] = field(default_factory=dict)


def _get_cn_info_for_network(network: NetworkInfo) -> NetworkCNs:
    """This function loops through the links in a topology and fills
    in some useful mappings from names to MAC addresses etc.
    """
    cns = {
        node["mac_addr"] for node in network.nodes if node["node_type"] == NodeType.CN
    }

    cn_info = NetworkCNs()

    for link in network.links:
        if link["link_type"] == LinkType.ETHERNET:
            # only consider wireless links
            continue
        if link["a_node_mac"] in cns:
            link_name = link["name"]
            cn_info.link_name_prometheus[
                PrometheusClient.normalize(link_name)
            ] = link_name
            dn_mac = link["z_node_mac"]
            cn_name = link["a_node_name"]
            cn_mac = link["a_node_mac"]
        elif link["z_node_mac"] in cns:
            link_name = link["name"]
            cn_info.link_name_prometheus[
                PrometheusClient.normalize(link_name)
            ] = link_name
            dn_mac = link["a_node_mac"]
            cn_name = link["z_node_name"]
            cn_mac = link["z_node_mac"]
        else:
            continue
        cn_info.link_name_set.add(link_name)
        if dn_mac not in cn_info.dn_mac_to_cn_mac_set:
            cn_info.dn_mac_to_cn_mac_set[dn_mac] = set()
        cn_info.dn_mac_to_cn_mac_set[dn_mac].add(cn_mac)
        cn_info.link_name_to_cn_name[link_name] = cn_name
        cn_info.link_name_to_cn_mac[link_name] = cn_mac
        cn_info.link_name_to_dn_mac[link_name] = dn_mac
        cn_info.cn_mac_to_link_name[cn_mac] = link_name
    return cn_info


async def _read_timeseries(
    client: PrometheusClient, query: str, query_time: int
) -> Any:
    """Read Prometheus timeseries database.

    Returns Prometheus response which is a list of dictionaries
    each dict has 'metric' (collection of label/values) and
    'values' - a list of timestamp, value pairs (as a list).
    Returns [] if there was an error.
    """
    try:
        response = await client.query_latest(query=query, time=query_time)
    except ClientRuntimeError:
        # if there is a ClientStoppedError; let it crash
        logging.exception(f"Error reading {query} from prometheus")
        return []

    # result is a List of Dict with keys "metric" and "value"
    # result will be empty if no results match the query
    # "value" is a list of length 1 with [ts, value]
    if response["status"] != "success":
        logging.error(f"Prometheus did not return success '{response['status']}''")
        logging.debug(f"\tquery: '{query}'")
        return []

    return response["data"]["result"]


def _generate_dn_macs_from_links(
    link_name_set: Set[str], link_name_to_dn_mac: Dict[str, str]
):
    """Function creates a set of DN MACs; all DNs in the set have CNs (they
    might also have other DNs too)
    """
    dn_mac_set = set()
    for link_name in link_name_set:
        if link_name in link_name_to_dn_mac:
            # set add prevents duplicates; no need to check for that
            dn_mac_set.add(link_name_to_dn_mac[link_name])
        else:
            raise Exception(f"{link_name} does not map to a DN MAC")
    return dn_mac_set


async def _check_fw_uptime(
    node_state_write_list: List[NodeState],
    network_name: str,
    cn_info: NetworkCNs,
    client: PrometheusClient,
    window_s: int,
    query_time: int,
):
    # read `fw_uptime` on all DNs that include a CN (that could include
    # some DN2DN links - small overhead to simplify the API of the function)
    # if link is up over any portion of the time window, then the
    # power status is LINK_ALIVE
    dn_mac_set = _generate_dn_macs_from_links(
        cn_info.link_name_set, cn_info.link_name_to_dn_mac
    )

    label_query: Dict[str, Union[str, Pattern[str]]] = {
        consts.network: network_name,
        consts.node_mac: re.compile("|".join(dn_mac_set)),
    }

    # fullquery is, e.g.
    #  max_over_time(metric{nodeMac=~"link1|link2|link3",network="network1"}[300s])
    query = client.format_query(metric_name=FW_UPTIME, labels=label_query)

    # max_over_time with [Xs] takes max over valid values from the time of the query
    # back until time - window; the max will not include filler values
    fullquery = ops.max_over_time(query, f"{window_s}s")

    prom_result = await _read_timeseries(
        client=client, query_time=query_time, query=fullquery
    )

    # one result for every link with DN in the dn_mac_set
    for result in prom_result:
        link_name_prom = result["metric"]["linkName"]
        link_name = cn_info.link_name_prometheus.get(link_name_prom)
        if not link_name:
            logging.debug(
                f"{link_name_prom} returned by Prometheus is a "
                "DN2DN link from a DN that also has a CN on network "
                f"{network_name}"
            )
            continue

        # prometheus won't return anything for nodes with no stats
        max_over_time = int(result["value"][1])

        # link_name will not be in link_name_set for DN2DN links
        # which is not an error; it is also possible only on test networks
        # that stats are written by two sources so the same link
        # will be returned twice
        if max_over_time > 0 and link_name in cn_info.link_name_set:
            cn_name = cn_info.link_name_to_cn_name[link_name]
            cn_mac = cn_info.link_name_to_cn_mac[link_name]
            node_state_write_list.append(
                NodeState(
                    topology_name=network_name,
                    node_name=cn_name,
                    state=NodePowerStatus.LINK_ALIVE,
                    node_mac=cn_mac,
                    link_name=link_name,
                )
            )
            cn_info.link_name_set.remove(link_name)

    logging.info(
        f"{len(node_state_write_list)} CN links are up, "
        f"{len(cn_info.link_name_set)} CN links remaining to analyze"
    )


async def _check_miscsys_tsf(
    node_state_write_list: List[NodeState],
    network_name: str,
    cn_info: NetworkCNs,
    client: PrometheusClient,
    window_s: int,
    query_time: int,
):
    # minimum number of 30s stats needed to consider the DN reachable
    # over the window
    _min_tsf_count = 5

    # read `tgf.00:00:00:00:00:00.miscSys.tsf` for all DNs for which
    # CN link is not alive
    # If no timestamp stats are available on the initiator node, then the
    # power status is INIT_UNREACHABLE
    dn_mac_set = _generate_dn_macs_from_links(
        cn_info.link_name_set, cn_info.link_name_to_dn_mac
    )

    label_query: Dict[str, Union[str, Pattern[str]]] = {
        consts.network: network_name,
        consts.node_mac: re.compile("|".join(dn_mac_set)),
    }

    # fullquery is, e.g.
    #  count_over_time(metric{nodeMac=~"link1|link2|link3",network="network1"}[300s])
    query = client.format_query(metric_name=MISCSYS_TSF, labels=label_query)

    # count_over_time with [Xs] counts number of valid values from the time of the query
    # back until time - window; the count will not include filler values
    fullquery = ops.count_over_time(query, f"{window_s}s")

    prom_result = (
        await _read_timeseries(client=client, query_time=query_time, query=fullquery)
        if dn_mac_set
        else []
    )
    # prometheus only returns results for nodes with stats; find those
    # nodes and then set remaining nodes to INIT_UNREACHABLE
    node_reachable_set = set()
    for result in prom_result:
        count_over_time = int(result["value"][1])
        if count_over_time > _min_tsf_count:
            node_reachable_set.add(result["metric"]["nodeMac"])

    node_unreachable_set = dn_mac_set.difference(node_reachable_set)
    logging.info(
        f"{len(node_unreachable_set)} DNs with at least 1 CN are unreachable; "
        f"{len(node_reachable_set)} DNs with at least 1 CN are reachable"
    )
    for node in node_unreachable_set:
        logging.debug(f"{node} is not reachable")

    for dn_mac in node_unreachable_set:
        # for P2MP, there can be multiple CNs
        for cn_mac in cn_info.dn_mac_to_cn_mac_set[dn_mac]:
            link_name = cn_info.cn_mac_to_link_name[cn_mac]
            if link_name in cn_info.link_name_set:
                cn_name = cn_info.link_name_to_cn_name[link_name]
                node_state_write_list.append(
                    NodeState(
                        topology_name=network_name,
                        link_name=link_name,
                        node_name=cn_name,
                        state=NodePowerStatus.INIT_UNREACHABLE,
                        node_mac=cn_mac,
                    )
                )
                cn_info.link_name_set.remove(link_name)
                logging.info(f"DN for CN:{cn_name} is not reachable")
            else:
                # this would mean that the link is up but the DN has no
                # tsf stats - should be impossible but it can happen that
                # an unreachable DN has links that stay up and when the DN
                # becomes reachable again, it takes time for tsf to reach
                # the db but the CN is up
                logging.info(
                    f"WARNING: {link_name} was removed from set but DN is "
                    f"not reachable"
                )


async def _check_link_attempts(
    node_state_write_list: List[NodeState],
    network_name: str,
    cn_info: NetworkCNs,
    client: PrometheusClient,
    window_s: int,
    query_time: int,
):
    # check whether the E2E is attempting ignitions, if not, the state
    # is NO_ASSOC_REQS, otherwise, CN_POWERED_OFF
    logging.info(
        f"{len(cn_info.link_name_set)} links remaining to check for E2E attempts"
    )

    label_query: Dict[str, Union[str, Pattern[str]]] = {
        consts.network: network_name,
        consts.link_name: re.compile("|".join(cn_info.link_name_set)),
    }

    # fullquery is, e.g.
    #  rate(metric{nodeMac=~"link1|link2|link3",network="network1"}[300s])
    query = client.format_query(metric_name=LINK_ATTEMPTS, labels=label_query)

    # rate with [Xs] looks at valid values from the time of the query
    # back until time - window; the rate will not include filler values
    # calculates the per-second average rate of increase
    fullquery = ops.rate(query, f"{window_s}s")

    prom_result = (
        await _read_timeseries(client=client, query_time=query_time, query=fullquery)
        if cn_info.link_name_set
        else []
    )
    for result in prom_result:
        link_name_prom = result["metric"]["linkName"]
        link_name = cn_info.link_name_prometheus.get(link_name_prom)
        if not link_name:
            raise Exception(
                f"Unexpected: {link_name_prom} does not map "
                f"to a link name for network {network_name}"
            )
        # prometheus won't return anything for nodes with no stats
        # Prometheus 'rate' finds the slope; link_attempts is a counter
        # If the slope == 0 that means no link up attempts
        rate = int(result["value"][1])

        # link_name will not be in link_name_to_cn_name for DN2DN links
        if link_name in cn_info.link_name_to_cn_name:
            # it is possible the get links that are no longer in the set
            # for P2MP
            if link_name in cn_info.link_name_set:
                cn_name = cn_info.link_name_to_cn_name[link_name]
                cn_mac = cn_info.link_name_to_cn_mac[link_name]
                state = (
                    NodePowerStatus.NO_ASSOC_REQS
                    if rate == 0
                    else NodePowerStatus.CN_POWERED_OFF
                )
                logging.info(f"CN:{cn_name} state: {state}")
                node_state_write_list.append(
                    NodeState(
                        topology_name=network_name,
                        link_name=link_name,
                        node_name=cn_name,
                        state=state,
                        node_mac=cn_mac,
                    )
                )
                cn_info.link_name_set.remove(link_name)


def _check_unknown(
    node_state_write_list: List[NodeState],
    network_name: str,
    cn_info: NetworkCNs,
    query_time: int,
):
    # after previous classification, there shouldn't be any CNs left in an
    # UNKNOWN state; if there are, we need to investigate
    for link_name in cn_info.link_name_set:
        cn_name = cn_info.link_name_to_cn_name[link_name]
        cn_mac = cn_info.link_name_to_cn_mac[link_name]
        logging.error(f"CN:{cn_name} state is UNKNOWN")
        node_state_write_list.append(
            NodeState(
                topology_name=network_name,
                node_name=cn_name,
                node_mac=cn_mac,
                link_name=link_name,
                state=NodePowerStatus.UNKNOWN,
            )
        )


async def _check_all_criteria(
    query_time_s: int,
    window_s: int,
    network_name: str,
    cn_info: NetworkCNs,
    client: PrometheusClient,
) -> List[NodeState]:

    node_state_write_list_per_nw: List[NodeState] = []
    await _check_fw_uptime(
        node_state_write_list=node_state_write_list_per_nw,
        network_name=network_name,
        cn_info=cn_info,
        client=client,
        window_s=window_s,
        query_time=query_time_s,
    )
    await _check_miscsys_tsf(
        node_state_write_list=node_state_write_list_per_nw,
        network_name=network_name,
        cn_info=cn_info,
        client=client,
        window_s=window_s,
        query_time=query_time_s,
    )
    await _check_link_attempts(
        node_state_write_list=node_state_write_list_per_nw,
        network_name=network_name,
        cn_info=cn_info,
        client=client,
        window_s=window_s,
        query_time=query_time_s,
    )
    _check_unknown(
        node_state_write_list=node_state_write_list_per_nw,
        network_name=network_name,
        cn_info=cn_info,
        query_time=query_time_s,
    )
    logging.info(f"Returned results for {len(node_state_write_list_per_nw)} CNs")

    return node_state_write_list_per_nw


async def get_power_status(
    query_time_ms: int, window_s: int, network_info: List[NetworkInfo]
) -> List[NodeState]:
    """Main function to determine the state of CNs.  This function runs
    every Xs according to the pipeline configuration in service_config.json
    (e.g. X = 1800 (30mn)).  It loops through all networks and all links
    with CNs within the network. It reads stats from the time series
    database and determines the state of the CN
    """

    client = PrometheusClient(timeout=2)
    query_time_s = int(query_time_ms / 1000)

    node_state_write_list: List[NodeState] = []

    coros = []
    for network in network_info:
        logging.info(f"Checking CN power status for {network.name}")
        # read topology for all networks and extract CN nodes
        cn_info = _get_cn_info_for_network(network)
        if len(cn_info.link_name_set) == 0:
            logging.info(f"There are no CNs in {network.name}")
            continue
        coros.append(
            _check_all_criteria(query_time_s, window_s, network.name, cn_info, client)
        )

    for node_state_write_list_per_nw in await asyncio.gather(*coros):
        node_state_write_list.extend(node_state_write_list_per_nw)

    return node_state_write_list


def create_results(node_state_write_list: List[NodeState], start_time_ms: int) -> List:
    """Put results in a format ready for Prometheus scraping. metric is called
    'analytics_cn_power_status'
    """
    metrics: List = []
    for result in node_state_write_list:
        labels = {
            consts.network: result.topology_name,
            consts.node_mac: result.node_mac,
            consts.node_name: result.node_name,
            consts.link_name: result.link_name,
        }
        metrics.append(
            PrometheusMetric(
                name="analytics_cn_power_status",
                time=start_time_ms,
                value=result.state.value,
                labels=labels,
            )
        )

    return metrics
