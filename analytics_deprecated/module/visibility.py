#!/usr/bin/env python3

""" Provides a function which determines the power status of CNs using a
    combination of node/link stats.
"""

import numpy as np
from enum import IntEnum
from module.beringei_time_series import TimeSeries, write_time_series_list
from module.numpy_time_series import NumpyLinkTimeSeries, StatType

from facebook.gorilla.Topology.ttypes import NodeType


class NodePowerStatus(IntEnum):
    # Enum arrangement in order of increasing connectivity to the responder node
    INIT_UNREACHABLE = 1
    NO_ASSOC_REQS = 2
    RESP_UNREACHABLE = 3
    RESP_PWR_ON_BUT_NO_LINK = 4
    LINK_ALIVE = 5

    @classmethod
    def has_value(cls, value):
        return any(value == item.value for item in cls)


def write_power_status(
    current_time: int,
    window: int,
    read_interval: int,
    write_interval: int,
    network_info: dict,
) -> None:
    end_time = current_time
    start_time = current_time - window
    for id, info in network_info.items():
        topology = info["topology"]

        cns = {
            node["mac_addr"]
            for node in topology["nodes"]
            if node["node_type"] == NodeType.CN
        }

        bts_read_list = []
        for link in topology["links"]:
            if link["a_node_mac"] in cns:
                initiator = link["z_node_mac"]
                responder = link["a_node_mac"]
            elif link["z_node_mac"] in cns:
                initiator = link["a_node_mac"]
                responder = link["z_node_mac"]
            else:
                continue

            bts_read_list.append(
                TimeSeries(
                    values=[0, 0],
                    times=[start_time, end_time],
                    name="",
                    topology=topology["name"],
                    src_mac=initiator,
                    peer_mac=responder,
                )
            )

        # If the link between the initiator and responder is up, then the power
        # status is LINK_ALIVE
        nlts = NumpyLinkTimeSeries(bts_read_list, read_interval, {id: info})
        stats = nlts.read_stats("fw_uptime", StatType.LINK, entire_network=False)
        responder_link_alive = ~np.logical_or(
            np.isnan(stats).all(axis=nlts.TIME_AXIS)[:, 0],
            np.count_nonzero(stats, axis=nlts.TIME_AXIS)[:, 0] == 0,
        )
        bts_write_list = [
            TimeSeries(
                values=[NodePowerStatus.LINK_ALIVE],
                times=[end_time],
                name="power_status",
                topology=topology["name"],
                src_mac=bts.peer_mac,
            )
            for bts in np.array(bts_read_list)[responder_link_alive]
        ]
        bts_read_list = np.delete(bts_read_list, np.where(responder_link_alive))

        # If no timestamp stats are available on the initiator node, then the
        # power status is INIT_UNREACHABLE
        nlts = NumpyLinkTimeSeries(bts_read_list, read_interval, {id: info})
        stats = nlts.read_stats(
            "tgf.00:00:00:00:00:00.miscSys.tsf", StatType.NODE, entire_network=False
        )
        initiator_unreachable = np.isnan(stats).all(axis=nlts.TIME_AXIS)[:, 0]
        bts_write_list.extend(
            [
                TimeSeries(
                    values=[NodePowerStatus.INIT_UNREACHABLE],
                    times=[end_time],
                    name="power_status",
                    topology=topology["name"],
                    src_mac=bts.peer_mac,
                )
                for bts in np.array(bts_read_list)[initiator_unreachable]
            ]
        )
        bts_read_list = np.delete(bts_read_list, np.where(initiator_unreachable))

        # If the initiator is reachable, but there are no beamforming training
        # request stats available, then the power status is NO_ASSOC_REQS
        nlts = NumpyLinkTimeSeries(bts_read_list, read_interval, {id: info})
        stats = nlts.read_stats(
            "mgmttx_bftrainingreq", StatType.LINK, entire_network=False
        )
        e2e_error = np.logical_or(
            np.isnan(stats).all(axis=nlts.TIME_AXIS)[:, 0],
            np.count_nonzero(stats, axis=nlts.TIME_AXIS)[:, 0] == 0,
        )
        bts_write_list.extend(
            [
                TimeSeries(
                    values=[NodePowerStatus.NO_ASSOC_REQS],
                    times=[end_time],
                    name="power_status",
                    topology=[topology["name"]],
                    src_mac=bts.peer_mac,
                )
                for bts in np.array(bts_read_list)[e2e_error]
            ]
        )
        bts_read_list = np.delete(bts_read_list, np.where(e2e_error))

        # If the initiator has sent beamforming training requests, but has not
        # received any beamforming training responses, then the power status is
        # RESP_UNREACHABLE
        nlts = NumpyLinkTimeSeries(bts_read_list, read_interval, {id: info})
        stats = nlts.read_stats(
            "mgmtrx_bftrainingreq", StatType.LINK, entire_network=False
        )
        responder_unreachable = np.logical_or(
            np.isnan(stats).all(axis=nlts.TIME_AXIS)[:, 0],
            np.count_nonzero(stats, axis=nlts.TIME_AXIS)[:, 0] == 0,
        )
        bts_write_list.extend(
            [
                TimeSeries(
                    values=[NodePowerStatus.RESP_UNREACHABLE],
                    times=[end_time],
                    name="power_status",
                    topology=[topology["name"]],
                    src_mac=bts.peer_mac,
                )
                for bts in np.array(bts_read_list)[responder_unreachable]
            ]
        )
        bts_read_list = np.delete(bts_read_list, np.where(responder_unreachable))

        # If any of the conditions above don't hold, then the responder node is
        # powered on but the link isn't formed
        bts_write_list.extend(
            [
                TimeSeries(
                    values=[NodePowerStatus.RESP_PWR_ON_BUT_NO_LINK],
                    times=[end_time],
                    name="power_status",
                    topology=topology["name"],
                    src_mac=bts.peer_mac,
                )
                for bts in bts_read_list
            ]
        )

        # Write the power status stats to beringei
        write_time_series_list(
            time_series_list=bts_write_list, intervals=[write_interval]
        )
