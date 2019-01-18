#!/usr/bin/env python3

""" Provides a function which determines the power status of CNs using a
    combination of node/link stats.
"""

import numpy as np
import os
import sys
import time
from enum import Enum
from module.beringei_time_series import TimeSeries
from module.numpy_time_series import NumpyLinkTimeSeries, StatType
from typing import Dict

sys.path.append(
    os.path.abspath(os.path.join(os.path.dirname(__file__), "..") + "/interface/gen-py")
)
from facebook.gorilla.Topology.ttypes import NodeType


INTERVAL = 30
END_TIME = int(time.time())
START_TIME = END_TIME - 900  # 15 minutes


class NodePowerStatus(Enum):
    INIT_UNREACHABLE = 1
    LINK_ALIVE = 2
    NO_ASSOC_REQS = 3
    RESP_PWR_ON_BUT_NO_LINK = 4
    RESP_UNREACHABLE = 5


def get_power_status(network_info: dict) -> Dict[str, NodePowerStatus]:
    topology = network_info[next(iter(network_info))]["topology"]

    cns = {
        node["mac_addr"]
        for node in topology["nodes"]
        if node["node_type"] == NodeType.CN
    }

    bts_list = []
    for link in topology["links"]:
        if link["a_node_mac"] in cns:
            initiator = link["z_node_mac"]
            responder = link["a_node_mac"]
        elif link["z_node_mac"] in cns:
            initiator = link["a_node_mac"]
            responder = link["z_node_mac"]
        else:
            continue

        bts_list.append(
            TimeSeries(
                values=[0, 0],
                times=[START_TIME, END_TIME],
                name="",
                topology=topology["name"],
                src_mac=initiator,
                peer_mac=responder,
            )
        )

    # If the link between the initiator and responder is up, then the power
    # status is LINK_ALIVE
    nlts = NumpyLinkTimeSeries(bts_list, INTERVAL, network_info)
    stats = nlts.read_stats("staPkt.mgmtLinkUp", StatType.LINK)
    responder_link_alive = ~np.logical_or(
        np.isnan(stats).all(axis=nlts.TIME_AXIS)[:, 0],
        np.count_nonzero(stats, axis=nlts.TIME_AXIS)[:, 0] == 0,
    )
    power_status = {
        bts.peer_mac: NodePowerStatus.LINK_ALIVE
        for bts in np.array(bts_list)[responder_link_alive]
    }
    bts_list = np.delete(bts_list, np.where(responder_link_alive))

    # If no timestamp stats are available on the initiator node, then the power
    # status is INIT_UNREACHABLE
    nlts = NumpyLinkTimeSeries(bts_list, INTERVAL, network_info)
    stats = nlts.read_stats("miscSys.tsf", StatType.NODE)
    initiator_unreachable = np.isnan(stats).all(axis=nlts.TIME_AXIS)[:, 0]
    power_status.update(
        {
            bts.peer_mac: NodePowerStatus.INIT_UNREACHABLE
            for bts in np.array(bts_list)[initiator_unreachable]
        }
    )
    bts_list = np.delete(bts_list, np.where(initiator_unreachable))

    # If the initiator is reachable, but there are no beamforming training
    # request stats available, then the power status is NO_ASSOC_REQS
    nlts = NumpyLinkTimeSeries(bts_list, INTERVAL, network_info)
    stats = nlts.read_stats("mgmtTx.bfTrainingReq", StatType.LINK)
    e2e_error = np.logical_or(
        np.isnan(stats).all(axis=nlts.TIME_AXIS)[:, 0],
        np.count_nonzero(stats, axis=nlts.TIME_AXIS)[:, 0] == 0,
    )
    power_status.update(
        {
            bts.peer_mac: NodePowerStatus.NO_ASSOC_REQS
            for bts in np.array(bts_list)[e2e_error]
        }
    )
    bts_list = np.delete(bts_list, np.where(e2e_error))

    # If the initiator has sent beamforming training requests, but has not
    # received any beamforming training responses, then the power status is
    # RESP_UNREACHABLE
    nlts = NumpyLinkTimeSeries(bts_list, INTERVAL, network_info)
    stats = nlts.read_stats("mgmtRx.bfTrainingRsp", StatType.LINK)
    responder_unreachable = np.logical_or(
        np.isnan(stats).all(axis=nlts.TIME_AXIS)[:, 0],
        np.count_nonzero(stats, axis=nlts.TIME_AXIS)[:, 0] == 0
    )
    power_status.update(
        {
            bts.peer_mac: NodePowerStatus.RESP_UNREACHABLE
            for bts in np.array(bts_list)[responder_unreachable]
        }
    )
    bts_list = np.delete(bts_list, np.where(responder_unreachable))

    # If any of the conditions above don't hold, then the responder node is
    # powered on but the link isn't formed
    power_status.update(
        {bts.peer_mac: NodePowerStatus.RESP_PWR_ON_BUT_NO_LINK for bts in bts_list}
    )

    return power_status
