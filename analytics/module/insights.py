#!/usr/bin/env python3

import logging
import time
from typing import Dict, List

import module.numpy_operations as npo
import numpy as np
from module.numpy_time_series import NumpyLinkTimeSeries, NumpyTimeSeries, StatType
from module.topology_handler import fetch_network_info
from module.visibility import write_power_status


def generate_insights(save_to_low_freq_db=None):
    interval = 30
    end_time = int(time.time())
    start_time = end_time - 3600
    network_info = fetch_network_info()

    nts = NumpyTimeSeries(start_time, end_time, interval, network_info)
    k = nts.get_consts()
    logging.info(
        "Generate insights, start_time={}, end_time={}, num_topologies={}".format(
            start_time, end_time, k["num_topologies"]
        )
    )
    for ti in range(k["num_topologies"]):
        logging.info(
            "idx={}, num_nodes={}, num_link={}".format(
                ti, k[ti]["num_nodes"], k[ti]["num_links"]
            )
        )

    # link availability and flaps
    logging.info("Generate availability, flaps")
    mgmt_link_up = nts.read_stats("staPkt.mgmtLinkUp", StatType.LINK)
    link_available = nts.read_stats("staPkt.linkAvailable", StatType.LINK)
    availability = []
    flaps = []
    for ti in range(k["num_topologies"]):
        num_links = k[ti]["num_links"]
        num_dir = nts.NUM_DIR
        availability.append(npo.nan_arr((num_links, num_dir, 1)))
        flaps.append(npo.nan_arr((num_links, num_dir, 1)))
        for li in range(num_links):
            for di in range(num_dir):
                a, f = npo.get_link_availability_and_flaps_1d(
                    mgmt_link_up[ti][li, di, :], link_available[ti][li, di, :], interval
                )
                availability[ti][li, di, 0], flaps[ti][li, di, 0] = a, f
        # write max along direction to each direction
        max_a = np.nanmax(availability[ti], axis=nts.DIR_AXIS)
        max_f = np.nanmax(flaps[ti], axis=nts.DIR_AXIS)
        for di in range(num_dir):
            availability[ti][:, di, :] = max_a
            flaps[ti][:, di, :] = max_f
    nts.write_stats("availability", availability, StatType.LINK, 900)
    nts.write_stats("flaps", flaps, StatType.LINK, 900)

    # P90 mcs
    logging.info("Generate mcs.p90")
    mcs = nts.read_stats("staPkt.mcs", StatType.LINK)
    mcs_p90 = []
    for ti in range(k["num_topologies"]):
        mcs_p90.append(
            np.nanpercentile(
                mcs[ti], 10, axis=nts.TIME_AXIS, interpolation="lower", keepdims=True
            )
        )
    nts.write_stats("mcs.p90", mcs_p90, StatType.LINK, 900)

    # path-loss asymmetry
    logging.info("Generate pathloss, pathloss_asymmetry")
    tx_power_idx = nts.read_stats("staPkt.txPowerIndex", StatType.LINK)
    srssi = nts.read_stats("phystatus.srssi", StatType.LINK)
    pathloss = []
    pathloss_asymmetry = []
    for ti in range(k["num_topologies"]):
        pl, asm = npo.pathloss_asymmetry_nd(tx_power_idx[ti], srssi[ti], nts.DIR_AXIS)
        pl = np.nanmean(pl, axis=nts.TIME_AXIS, keepdims=True)
        asm = np.nanmean(asm, axis=nts.TIME_AXIS, keepdims=True)
        pathloss.append(pl)
        pathloss_asymmetry.append(asm)
    nts.write_stats("pathloss", pathloss, StatType.LINK, 900)
    nts.write_stats("pathloss_asymmetry", pathloss_asymmetry, StatType.LINK, 900)

    # uptimes for system, e2e_minion, stats_agent, openr
    logging.info("process uptimes")
    input_names = ["uptime", "e2e_minion.uptime", "stats_agent.uptime", "openr.uptime"]
    output_names = ["linux", "e2e_minion", "stats_agent", "openr"]
    raw_uptime_stats = []
    proc_uptime_stats = []
    for in_n, out_n in zip(input_names, output_names):
        counter = nts.read_stats(in_n, StatType.NODE)
        avail = []
        resets = []
        n_avail = []
        raw_uptime_stats.append(counter)
        for ti in range(k["num_topologies"]):
            num_nodes = k[ti]["num_nodes"]
            avail.append(npo.nan_arr((num_nodes, 1, 1)))
            resets.append(npo.nan_arr((num_nodes, 1, 1)))
            n_avail.append(npo.nan_arr((1, 1, 1)))
            for ni in range(num_nodes):
                ava, res = npo.get_uptime_and_resets_1d(counter[ti][ni, 0, :], 30, 1)
                avail[ti][ni, 0, 0] = ava
                resets[ti][ni, 0, 0] = res
            # assume no data means availability=0,
            n_avail[ti] = np.nan_to_num(avail[ti]).mean(axis=nts.NODE_AXIS, keepdims=True)
        nts.write_stats(out_n + "_availability", avail, StatType.NODE, 900)
        nts.write_stats(out_n + "_availability", n_avail, StatType.NETWORK, 900)
        nts.write_stats(out_n + "_resets", resets, StatType.NODE, 900)
        proc_uptime_stats.extend([avail, n_avail, resets])

    # generate indicators of self health
    total_inputs = []
    missing_inputs_percent = []
    total_outputs = []
    missing_outputs_percent = []
    inputs = [mgmt_link_up, link_available, mcs, tx_power_idx, srssi] + raw_uptime_stats
    outputs = [
        availability,
        flaps,
        mcs_p90,
        pathloss,
        pathloss_asymmetry,
    ] + proc_uptime_stats
    for ti in range(k["num_topologies"]):
        total_inputs.append(np.zeros((1, 1, 1)))
        missing_inputs_percent.append(np.zeros((1, 1, 1)))
        total_outputs.append(np.zeros((1, 1, 1)))
        missing_outputs_percent.append(np.zeros((1, 1, 1)))
        for input in inputs:
            total_inputs[ti][0] += len(input[ti].flatten())
            missing_inputs_percent[ti][0] += np.isnan(input[ti]).sum()
        for output in outputs:
            total_outputs[ti][0] += len(output[ti].flatten())
            missing_outputs_percent[ti][0] += np.isnan(output[ti]).sum()
        missing_inputs_percent[ti][0] = (
            missing_inputs_percent[ti][0] * 100 / total_inputs[ti][0]
        )
        missing_outputs_percent[ti][0] = (
            missing_outputs_percent[ti][0] * 100 / total_outputs[ti][0]
        )
        logging.info(
            "missing stats, {}% of {} inputs, {}% of {} outputs".format(
                float(np.round(missing_inputs_percent[ti], 2)),
                int(total_inputs[ti]),
                float(np.round(missing_outputs_percent[ti], 2)),
                int(total_outputs[ti]),
            )
        )
    nts.write_stats("insights.total_inputs", total_inputs, StatType.NETWORK, 900)
    nts.write_stats(
        "insights.missing_inputs_percent", missing_inputs_percent, StatType.NETWORK, 900
    )
    nts.write_stats("insights.total_outputs", total_outputs, StatType.NETWORK, 900)
    nts.write_stats(
        "insights.missing_outputs_percent",
        missing_outputs_percent,
        StatType.NETWORK,
        900,
    )

    # write power status of the nodes in each topology
    write_power_status(network_info)


def link_health(links: List, network_info: Dict) -> List:

    nlts = NumpyLinkTimeSeries(links, 1, network_info)
    link_length = nlts.get_link_length()
    mgmt_link_up = nlts.read_stats("staPkt.mgmtLinkUp", StatType.LINK)
    link_available = nlts.read_stats("staPkt.linkAvailable", StatType.LINK)
    mcs = nlts.read_stats("staPkt.mcs", StatType.LINK)
    # tx_ok = nlts.read_stats("staPkt.txOk", StatType.LINK)
    # tx_fail = nlts.read_stats("staPkt.txFail", StatType.LINK)
    num_links = nlts._num_links
    num_dir = nlts.NUM_DIR

    availability = npo.nan_arr((num_links, num_dir, 1))
    for li in range(num_links):
        for di in range(num_dir):
            availability[li, di, 0], _ = npo.get_link_availability_and_flaps_1d(
                mgmt_link_up[li, di, :], link_available[li, di, :], 1
            )
    max_a = np.nanmax(availability, axis=nlts.DIR_AXIS)
    availability = np.stack([max_a] * 2, axis=nlts.DIR_AXIS)

    mcs_p90 = np.nanpercentile(
        mcs, 10, axis=nlts.TIME_AXIS, interpolation="lower", keepdims=True
    )

    # TODO: Calculate Tx PER

    excellent = np.logical_and(
        availability > 0.99,
        np.logical_or(
            np.logical_and(link_length > 100, mcs_p90 >= 9),
            np.logical_and(link_length <= 100, mcs_p90 == 12),
        ),
    )
    healthy = np.logical_and(
        availability > 0.97,
        np.logical_or(
            np.logical_and(link_length > 100, mcs_p90 >= 9),
            np.logical_and(link_length <= 100, mcs_p90 >= 11),
        ),
    )
    marginal = np.logical_and(
        availability > 0.90,
        np.logical_or(
            np.logical_and(link_length > 100, mcs_p90 >= 7),
            np.logical_and(link_length <= 100, mcs_p90 >= 9),
        ),
    )
    valid = np.logical_and(npo.is_valid(availability), npo.is_valid(mcs_p90))
    warning = np.logical_and(
        valid, np.logical_not(npo.list_or([excellent, healthy, marginal]))
    )
    link_health = npo.nan_arr((num_links, num_dir, 1))
    link_health[np.logical_not(valid)] = 4
    link_health[warning] = 3
    link_health[marginal] = 2
    link_health[healthy] = 1
    link_health[excellent] = 0
    return nlts.write_stats("link_health", link_health, 900)
