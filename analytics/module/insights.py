#!/usr/bin/env python3

import json
import logging
import time
from typing import Dict, List

import module.numpy_operations as npo
import numpy as np
from facebook.gorilla.Topology.ttypes import LinkType
from module.numpy_time_series import NumpyLinkTimeSeries, NumpyTimeSeries, StatType
from module.path_store import PathStore
from module.topology_handler import fetch_network_info, restart_minion
from module.visibility import write_power_status

np.warnings.filterwarnings('ignore')


def get_link_counters_1d(
    mgmt_link_up,
    tx_ba,
    rx_ba,
    tx_ppdu,
    rx_ppdu,
    tx_ok,
    tx_fail,
    rx_ok,
    rx_fail,
    interval,
):
    out = {}
    dtb = npo.link_stat_diff_1d(mgmt_link_up, tx_ba, interval)
    drb = npo.link_stat_diff_1d(mgmt_link_up, rx_ba, interval)
    dtp = npo.link_stat_diff_1d(mgmt_link_up, tx_ppdu, interval)
    drp = npo.link_stat_diff_1d(mgmt_link_up, rx_ppdu, interval)
    dto = npo.link_stat_diff_1d(mgmt_link_up, tx_ok, interval)
    dtf = npo.link_stat_diff_1d(mgmt_link_up, tx_fail, interval)
    dro = npo.link_stat_diff_1d(mgmt_link_up, rx_ok, interval)
    drf = npo.link_stat_diff_1d(mgmt_link_up, rx_fail, interval)
    out["num_tx_packets"] = dto + dtf
    out["num_rx_packets"] = dro + drf
    out["tx_ba"] = dtb
    out["rx_ba"] = drb
    out["tx_ppdu"] = dtp
    out["rx_ppdu"] = drp
    return out


def link_health_insights(
    current_time: int,
    window: int,
    read_interval: int,
    write_interval: int,
    network_info: dict,
):
    end_time = current_time
    start_time = current_time - window
    nts = NumpyTimeSeries(start_time, end_time, read_interval, network_info)
    k = nts.get_consts()
    logging.info("process link health")
    link_length = nts.get_link_length()
    mgmt_link_up = nts.read_stats("staPkt.mgmtLinkUp", StatType.LINK)
    link_available = nts.read_stats("staPkt.linkAvailable", StatType.LINK)
    mcs = nts.read_stats("staPkt.mcs", StatType.LINK)
    tx_ok = nts.read_stats("staPkt.txOk", StatType.LINK)
    tx_fail = nts.read_stats("staPkt.txFail", StatType.LINK)
    no_traffic = nts.read_stats("latpcStats.noTrafficCountSF", StatType.LINK)
    num_dir = nts.NUM_DIR

    health = []
    traffic = []
    for ti in range(k["num_topologies"]):
        num_links = k[ti]["num_links"]
        health.append(npo.nan_arr((num_links, num_dir, 1)))
        traffic.append(npo.nan_arr((num_links, num_dir, 1)))
        for li in range(num_links):
            for di in range(num_dir):
                hlt, trf = npo.get_link_health_and_traffic_1d(
                    mgmt_link_up[ti][li, di, :],
                    tx_ok[ti][li, di, :],
                    tx_fail[ti][li, di, :],
                    no_traffic[ti][li, di, :],
                    link_available[ti][li, di, :],
                    mcs[ti][li, di, :],
                    link_length[ti][li, di, 0],
                    read_interval,
                )
                health[-1][li, di, 0] = hlt
                traffic[-1][li, di, 0] = trf
    nts.write_stats("health", health, StatType.LINK, write_interval)
    nts.write_stats("traffic", traffic, StatType.LINK, write_interval)


def uptime_insights(
    current_time: int,
    window: int,
    read_interval: int,
    write_interval: int,
    network_info: dict,
):
    end_time = current_time
    start_time = current_time - window
    nts = NumpyTimeSeries(start_time, end_time, read_interval, network_info)
    k = nts.get_consts()
    # uptimes for system, e2e_minion, stats_agent, openr
    logging.info("process uptimes")
    input_names = ["uptime", "e2e_minion.uptime", "stats_agent.uptime", "openr.uptime"]
    output_names = ["linux", "e2e_minion", "stats_agent", "openr"]
    for in_n, out_n in zip(input_names, output_names):
        counter = nts.read_stats(in_n, StatType.NODE)
        avail = []
        resets = []
        n_avail = []
        for ti in range(k["num_topologies"]):
            num_nodes = k[ti]["num_nodes"]
            avail.append(npo.nan_arr((num_nodes, 1, 1)))
            resets.append(npo.nan_arr((num_nodes, 1, 1)))
            n_avail.append(npo.nan_arr((1, 1, 1)))
            for ni in range(num_nodes):
                ava, res = npo.get_uptime_and_resets_1d(
                    counter[ti][ni, 0, :], read_interval, 1
                )
                avail[ti][ni, 0, 0] = ava
                resets[ti][ni, 0, 0] = res
            # assume no data means availability=0,
            n_avail[ti] = np.nan_to_num(avail[ti]).mean(
                axis=nts.NODE_AXIS, keepdims=True
            )
        nts.write_stats(out_n + "_availability", avail, StatType.NODE, write_interval)
        nts.write_stats(
            out_n + "_availability", n_avail, StatType.NETWORK, write_interval
        )
        nts.write_stats(out_n + "_resets", resets, StatType.NODE, write_interval)


# temporary function until TSDB stat is available
# reads linkup_attempts from the topology for each link
def get_linkup_attempts_from_topology(network_info: dict) -> dict:
    topologies = [n["topology"] for _, n in network_info.items()]
    lu_att = {}
    for ti, t in enumerate(topologies):
        for l in t["links"]:
            if l["link_type"] == LinkType.WIRELESS:
                lu_att[(ti, l["name"])] = l["linkup_attempts"]
    return lu_att


# global variable
_up_down = {}
_last_up_down = {}


# detects an event where the link goes down and fails to restart
# for unknown reasons
# characterized by link is trying to ignite but failing
# when event triggers, increment up_down counter and restart minion
# white list contains list of links to enable ("all" to use all)
# exclude links on the black list
def detect_ignition_failure(
    current_time: int,
    window: int,
    read_interval: int,
    write_interval: int,
    network_info: dict,
    lu_att: dict,
    restart_minion_white_list: dict,
    restart_minion_black_list: dict,
) -> dict:

    global _up_down
    global _last_up_down

    if not network_info:
        logging.error("network_info is empty - returning")
        return {}

    lu_att["0"] = get_linkup_attempts_from_topology(network_info)
    if not lu_att.get("-2", {}) or not lu_att.get("-1", {}):
        logging.debug("startup: lu_att is not yet filled")
        return lu_att

    end_time = current_time
    start_time = current_time - window
    nts = NumpyTimeSeries(start_time, end_time, read_interval, network_info)
    k = nts.get_consts()
    logging.info(
        "detect_ignition_failure, start_time={}, end_time={}, num_topologies={}".format(
            start_time, end_time, k["num_topologies"]
        )
    )

    mgmt_link_up = nts.read_stats("staPkt.mgmtLinkUp", StatType.LINK)
    nts_link_names = nts.get_link_names()
    nts_node_names = nts.get_node_names_per_link()
    num_dir = nts.NUM_DIR

    failure_detected = False
    up_down = []
    ti = -1
    for _, n in network_info.items():
        ti += 1
        t = n["topology"]
        topo_name = t["name"]
        num_links = k[ti]["num_links"]
        up_down.append(npo.nan_arr((num_links, num_dir, 1)))
        white_list = restart_minion_white_list.get(topo_name, [])
        black_list = restart_minion_black_list.get(topo_name, [])
        for li in range(num_links):
            link_name = nts_link_names[ti][li]
            up_down_link = [0, 0]
            for di in range(num_dir):
                cond1 = npo.detect_up_then_down_1d(
                    mgmt_link_up[ti][li, di, :], read_interval
                )
                cond2 = False
                cond3 = False
                # it is possible that (ti, link_name) is not in the list
                # if a new link is added between topology reads
                if (
                    (ti, link_name) in lu_att["0"]
                    and (ti, link_name) in lu_att["-1"]
                    and (ti, link_name) in lu_att["-2"]
                ):
                    cond2 = (
                        lu_att["0"][(ti, link_name)] - lu_att["-1"][(ti, link_name)] > 0
                    )
                    cond3 = (
                        lu_att["-1"][(ti, link_name)] - lu_att["-2"][(ti, link_name)]
                        > 0
                    )
                up_down_link[di] = cond1 and cond2 and cond3

                if cond1 or (cond2 and cond3):
                    logging.info(
                        "{}::{}, up_then_down {}, link_up_attemps {}:{}".format(
                            topo_name, link_name, cond1, cond2, cond3
                        )
                    )
                    logging.debug(mgmt_link_up[ti][li, di, :])

                # if either direction is flagged, flag both directions
                if di == num_dir - 1:
                    up_down_link[0] = up_down_link[0] or up_down_link[di]

            # write the stat for both directions, we don't have a stat
            # type that applies to a link - only to a link per direction
            if topo_name not in _up_down:
                _up_down[topo_name] = {}
            if link_name not in _up_down[topo_name]:
                _up_down[topo_name][link_name] = 0
            _up_down[topo_name][link_name] += up_down_link[0]
            up_down[ti][li, 0, 0] = _up_down[topo_name][link_name]
            up_down[ti][li, 1, 0] = _up_down[topo_name][link_name]
            if up_down_link[0] or (link_name in white_list and "test" in white_list):
                failure_detected = True
                if (link_name in white_list or "all" in white_list) and (
                    link_name not in black_list
                ):
                    if topo_name not in _last_up_down:
                        _last_up_down[topo_name] = {}
                    if link_name not in _last_up_down[topo_name]:
                        _last_up_down[topo_name][link_name] = 0
                    if current_time - _last_up_down[topo_name][link_name] > 15 * 60:
                        # if more than 15 minutes since last minion restart
                        # restart minion and reset timer

                        # the node watchdog will restart minion on the node if
                        # it loses contact with the firmware for >15mn or if no
                        # RF link forms within 15mn; the 15mn timer here is a
                        # back-off timer to prevent fast, back-to-back restarts
                        restart_minion(
                            n["api_ip"], n["api_port"], nts_node_names[ti][li], 1
                        )
                        _last_up_down[topo_name][link_name] = current_time
                        logging.error(
                            "Minion restart event {}::{} at time {}".format(
                                topo_name, link_name, current_time
                            )
                        )
                logging.info(
                    "Link ignition failure event detected {}::{}".format(
                        topo_name, link_name
                    )
                )

    nts.write_stats("ignition_failure", up_down, StatType.LINK, write_interval)

    if not failure_detected:
        logging.info("No ignition failure detected")

    return lu_att


def misc_insights(
    current_time: int,
    window: int,
    read_interval: int,
    write_interval: int,
    network_info: dict,
):
    end_time = current_time
    start_time = current_time - window
    nts = NumpyTimeSeries(start_time, end_time, read_interval, network_info)
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
                    mgmt_link_up[ti][li, di, :],
                    link_available[ti][li, di, :],
                    read_interval,
                )
                availability[ti][li, di, 0], flaps[ti][li, di, 0] = a, f
        # write max along direction to each direction
        max_a = np.nanmax(availability[ti], axis=nts.DIR_AXIS)
        max_f = np.nanmax(flaps[ti], axis=nts.DIR_AXIS)
        for di in range(num_dir):
            availability[ti][:, di, :] = max_a
            flaps[ti][:, di, :] = max_f
    nts.write_stats("availability", availability, StatType.LINK, write_interval)
    nts.write_stats("flaps", flaps, StatType.LINK, write_interval)

    # P90 and average mcs
    logging.info("Generate mcs_p90, mcs_avg")
    mcs = nts.read_stats("staPkt.mcs", StatType.LINK)
    mcs_p90 = []
    mcs_avg = []
    for ti in range(k["num_topologies"]):
        mcs_p90.append(
            np.nanpercentile(
                mcs[ti], 10, axis=nts.TIME_AXIS, interpolation="lower", keepdims=True
            )
        )
        mcs_avg.append(np.nanmean(mcs[ti], axis=nts.TIME_AXIS, keepdims=True))
    nts.write_stats("mcs_p90", mcs_p90, StatType.LINK, write_interval)
    nts.write_stats("mcs_avg", mcs_avg, StatType.LINK, write_interval)

    # PER
    logging.info("Generate tx_per, rx_per")
    tx_ok = nts.read_stats("staPkt.txOk", StatType.LINK)
    tx_fail = nts.read_stats("staPkt.txFail", StatType.LINK)
    rx_ok = nts.read_stats("staPkt.rxOk", StatType.LINK, swap_dir=True)
    rx_fail = nts.read_stats("staPkt.rxFail", StatType.LINK, swap_dir=True)
    tx_ba = nts.read_stats("staPkt.txBa", StatType.LINK)
    rx_ba = nts.read_stats("staPkt.rxBa", StatType.LINK, swap_dir=True)
    tx_ppdu = nts.read_stats("staPkt.txPpdu", StatType.LINK)
    rx_ppdu = nts.read_stats("staPkt.rxPpdu", StatType.LINK, swap_dir=True)
    tx_per = []
    rx_per = []
    counters = {}
    for ti in range(k["num_topologies"]):
        num_links = k[ti]["num_links"]
        num_dir = nts.NUM_DIR
        tx_per.append(npo.nan_arr((num_links, num_dir, 1)))
        rx_per.append(npo.nan_arr((num_links, num_dir, 1)))
        for key in counters:
            counters[key].append(npo.nan_arr((num_links, num_dir, 1)))
        for li in range(num_links):
            for di in range(num_dir):
                tx_per[ti][li, di, 0] = npo.get_per_1d(
                    mgmt_link_up[ti][li, di, :],
                    tx_ok[ti][li, di, :],
                    tx_fail[ti][li, di, :],
                    read_interval,
                )
                rx_per[ti][li, di, 0] = npo.get_per_1d(
                    mgmt_link_up[ti][li, di, :],
                    rx_ok[ti][li, di, :],
                    rx_fail[ti][li, di, :],
                    read_interval,
                )
                counters_1d = get_link_counters_1d(
                    mgmt_link_up[ti][li, di, :],
                    tx_ba[ti][li, di, :],
                    rx_ba[ti][li, di, :],
                    tx_ppdu[ti][li, di, :],
                    rx_ppdu[ti][li, di, :],
                    tx_ok[ti][li, di, :],
                    tx_fail[ti][li, di, :],
                    rx_ok[ti][li, di, :],
                    rx_fail[ti][li, di, :],
                    read_interval,
                )
                for key in counters_1d:
                    if key not in counters:
                        counters[key] = [npo.nan_arr((num_links, num_dir, 1))]
                    counters[key][ti][li, di, 0] = counters_1d[key]
    for key in counters:
        nts.write_stats(key, counters[key], StatType.LINK, write_interval)
    nts.write_stats("tx_per", tx_per, StatType.LINK, write_interval)
    nts.write_stats("rx_per", rx_per, StatType.LINK, write_interval)

    # path-loss asymmetry
    logging.info("Generate pathloss_avg, pathloss_asymmetry, mode of beam indices")
    tx_power_idx = nts.read_stats("staPkt.txPowerIndex", StatType.LINK)
    srssi = nts.read_stats("phystatus.srssi", StatType.LINK, swap_dir=True)
    tbi = nts.read_stats("phyPeriodic.txBeamIdx", StatType.LINK)
    rbi = nts.read_stats("phyPeriodic.rxBeamIdx", StatType.LINK, swap_dir=True)
    pathloss_avg = []
    pathloss_asymmetry = []
    tx_beam_idx = []
    rx_beam_idx = []
    for ti in range(k["num_topologies"]):
        pl, asm = npo.pathloss_asymmetry_nd(tx_power_idx[ti], srssi[ti], nts.DIR_AXIS)
        pl = np.nanmean(pl, axis=nts.TIME_AXIS, keepdims=True)
        asm = np.nanmean(asm, axis=nts.TIME_AXIS, keepdims=True)
        pathloss_avg.append(pl)
        pathloss_asymmetry.append(asm)
        tx_beam_idx.append(np.apply_along_axis(npo.mode_int_1d, nts.TIME_AXIS, tbi[ti]))
        rx_beam_idx.append(np.apply_along_axis(npo.mode_int_1d, nts.TIME_AXIS, rbi[ti]))
    nts.write_stats("pathloss_avg", pathloss_avg, StatType.LINK, write_interval)
    nts.write_stats(
        "pathloss_asymmetry", pathloss_asymmetry, StatType.LINK, write_interval
    )
    nts.write_stats("tx_beam_idx", tx_beam_idx, StatType.LINK, write_interval)
    nts.write_stats("rx_beam_idx", rx_beam_idx, StatType.LINK, write_interval)

    # Generate average and standard deviation on rssi, snr, tx power index
    snr = nts.read_stats("phystatus.ssnrEst", StatType.LINK, swap_dir=True)
    stat_names = ["rssi", "snr", "txpwr"]
    raw_stats = [srssi, snr, tx_power_idx]
    for name, raw in zip(stat_names, raw_stats):
        avg_stats = []
        std_stats = []
        for ti in range(k["num_topologies"]):
            avg_stats.append(np.nanmean(raw[ti], axis=nts.TIME_AXIS, keepdims=True))
            std_stats.append(np.nanstd(raw[ti], axis=nts.TIME_AXIS, keepdims=True))
        nts.write_stats(name + "_avg", avg_stats, StatType.LINK, write_interval)
        nts.write_stats(name + "_std", std_stats, StatType.LINK, write_interval)

    # generate indicators of self health
    total_inputs = []
    missing_inputs_percent = []
    total_outputs = []
    missing_outputs_percent = []
    inputs = [mgmt_link_up, link_available, mcs, tx_power_idx, srssi, tx_ok, tx_fail]
    outputs = [availability, flaps, mcs_p90, pathloss_avg, pathloss_asymmetry, tx_per]
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
    nts.write_stats(
        "insights.total_inputs", total_inputs, StatType.NETWORK, write_interval
    )
    nts.write_stats(
        "insights.missing_inputs_percent",
        missing_inputs_percent,
        StatType.NETWORK,
        write_interval,
    )
    nts.write_stats(
        "insights.total_outputs", total_outputs, StatType.NETWORK, write_interval
    )
    nts.write_stats(
        "insights.missing_outputs_percent",
        missing_outputs_percent,
        StatType.NETWORK,
        write_interval,
    )


lu_att = {}


def generate_insights():
    current_time = int(time.time())
    network_info = fetch_network_info()
    global lu_att
    lu_att["-2"] = lu_att.get("-1", {})
    lu_att["-1"] = lu_att.get("0", {})
    # max time to reach 30s_db is 60s
    # max time to reach 1s_db is 2s
    # add few seconds margin for latency from node to nms
    # adjust current time if sensitive
    OFFSET_30S_DB = 90
    OFFSET_1S_DB = 10

    try:
        with open(PathStore.PIPELINE_CONFIG_FILE) as local_file:
            pipeline_config = json.load(local_file)
    except Exception:
        logging.error("Cannot find or parse the configuration file")
        return None

    try:
        hf_period = pipeline_config["insights_pipelines_hf"]["period"]
        lf_period = pipeline_config["insights_pipelines_lf"]["period"]
        nw_period = pipeline_config["network_watchdog"]["period"]
    except Exception:
        logging.error("Problem reading period configuration -- returning")
        return

    if current_time % nw_period == 0:
        try:
            dif_enabled = pipeline_config["network_watchdog"][
                "detect_ignition_failure"
            ]["enabled"]
            links_white_list = pipeline_config["network_watchdog"][
                "minion_restart_links_white_list"
            ]
            links_black_list = pipeline_config["network_watchdog"][
                "minion_restart_links_black_list"
            ]
        except Exception:
            logging.error("Problem reading watchdog configuration -- returning")
            return

        if dif_enabled:
            logging.debug("detect_ignition_failure running")
            lu_att = detect_ignition_failure(
                current_time=current_time - OFFSET_30S_DB,
                window=240,
                read_interval=30,
                write_interval=30,
                network_info=network_info,
                lu_att=lu_att,
                restart_minion_white_list=links_white_list,
                restart_minion_black_list=links_black_list,
            )

    if current_time % hf_period == 0:
        try:
            wps_enabled = pipeline_config["insights_pipelines_hf"][
                "write_power_status"
            ]["enabled"]
            mi_enabled = pipeline_config["insights_pipelines_hf"]["misc_insights"][
                "enabled"
            ]
            ui_enabled = pipeline_config["insights_pipelines_hf"]["uptime_insights"][
                "enabled"
            ]
            lhi_enabled = pipeline_config["insights_pipelines_hf"][
                "link_health_insights"
            ]["enabled"]
        except Exception:
            logging.error("Problem reading HF configuration -- returning")
            return

        if wps_enabled:
            write_power_status(
                current_time=current_time - OFFSET_30S_DB,
                window=900,
                read_interval=30,
                write_interval=30,
                network_info=network_info,
            )
        if mi_enabled:
            misc_insights(
                current_time=current_time - OFFSET_1S_DB,
                window=30,
                read_interval=1,
                write_interval=30,
                network_info=network_info,
            )
        if ui_enabled:
            uptime_insights(
                current_time=current_time - OFFSET_30S_DB,
                window=30,
                read_interval=30,
                write_interval=30,
                network_info=network_info,
            )
        if lhi_enabled:
            link_health_insights(
                current_time=current_time - OFFSET_1S_DB,
                window=900,
                read_interval=1,
                write_interval=30,
                network_info=network_info,
            )

    if current_time % lf_period == 0:
        try:
            wps_enabled = pipeline_config["insights_pipelines_lf"][
                "write_power_status"
            ]["enabled"]
            mi_enabled = pipeline_config["insights_pipelines_lf"]["misc_insights"][
                "enabled"
            ]
            ui_enabled = pipeline_config["insights_pipelines_lf"]["uptime_insights"][
                "enabled"
            ]
            lhi_enabled = pipeline_config["insights_pipelines_lf"][
                "link_health_insights"
            ]["enabled"]
        except Exception:
            logging.error("Problem reading LF configuration -- returning")
            return

        if wps_enabled:
            write_power_status(
                current_time=current_time,
                window=900,
                read_interval=30,
                write_interval=900,
                network_info=network_info,
            )
        if mi_enabled:
            misc_insights(
                current_time=current_time - OFFSET_30S_DB,
                window=900,
                read_interval=30,
                write_interval=900,
                network_info=network_info,
            )
        if ui_enabled:
            uptime_insights(
                current_time=current_time - OFFSET_30S_DB,
                window=900,
                read_interval=30,
                write_interval=900,
                network_info=network_info,
            )
        if lhi_enabled:
            link_health_insights(
                current_time=current_time - OFFSET_1S_DB,
                window=900,
                read_interval=1,
                write_interval=900,
                network_info=network_info,
            )


def get_test_links_metrics(links: List, network_info: Dict, iperf_stats: List) -> List:

    CONST_INTERVAL = 1
    nlts = NumpyLinkTimeSeries(links, CONST_INTERVAL, network_info)
    link_length = nlts.get_link_length()
    mgmt_link_up = nlts.read_stats("staPkt.mgmtLinkUp", StatType.LINK)
    link_available = nlts.read_stats("staPkt.linkAvailable", StatType.LINK)
    mcs = nlts.read_stats("staPkt.mcs", StatType.LINK)
    tx_ok = nlts.read_stats("staPkt.txOk", StatType.LINK)
    tx_fail = nlts.read_stats("staPkt.txFail", StatType.LINK)
    no_traffic = np.zeros(tx_fail.shape)  # assume network test always has traffic
    tx_power_idx = nlts.read_stats("staPkt.txPowerIndex", StatType.LINK)
    srssi = nlts.read_stats("phystatus.srssi", StatType.LINK, swap_dir=True)
    snr = nlts.read_stats("phystatus.ssnrEst", StatType.LINK, swap_dir=True)
    rx_ok = nlts.read_stats("staPkt.rxOk", StatType.LINK, swap_dir=True)
    rx_fail = nlts.read_stats("staPkt.rxFail", StatType.LINK, swap_dir=True)
    tx_ba = nlts.read_stats("staPkt.txBa", StatType.LINK)
    rx_ba = nlts.read_stats("staPkt.rxBa", StatType.LINK, swap_dir=True)
    tx_ppdu = nlts.read_stats("staPkt.txPpdu", StatType.LINK)
    rx_ppdu = nlts.read_stats("staPkt.rxPpdu", StatType.LINK, swap_dir=True)
    tbi = nlts.read_stats("phyPeriodic.txBeamIdx", StatType.LINK)
    rbi = nlts.read_stats("phyPeriodic.rxBeamIdx", StatType.LINK, swap_dir=True)
    num_links = nlts._num_links
    num_dir = nlts.NUM_DIR
    output = []

    health = npo.nan_arr((num_links, num_dir, 1))
    tx_per = npo.nan_arr((num_links, num_dir, 1))
    rx_per = npo.nan_arr((num_links, num_dir, 1))
    counters = {}
    for li in range(num_links):
        for di in range(num_dir):
            health[li, di, 0], _ = npo.get_link_health_and_traffic_1d(
                mgmt_link_up[li, di, :],
                tx_ok[li, di, :],
                tx_fail[li, di, :],
                no_traffic[li, di, :],
                link_available[li, di, :],
                mcs[li, di, :],
                link_length[li, di, 0],
                CONST_INTERVAL,
            )
            tx_per[li, di, 0] = npo.get_per_1d(
                mgmt_link_up[li, di, :],
                tx_ok[li, di, :],
                tx_fail[li, di, :],
                CONST_INTERVAL,
            )
            rx_per[li, di, 0] = npo.get_per_1d(
                mgmt_link_up[li, di, :],
                rx_ok[li, di, :],
                rx_fail[li, di, :],
                CONST_INTERVAL,
            )
            counters_1d = get_link_counters_1d(
                mgmt_link_up[li, di, :],
                tx_ba[li, di, :],
                rx_ba[li, di, :],
                tx_ppdu[li, di, :],
                rx_ppdu[li, di, :],
                tx_ok[li, di, :],
                tx_fail[li, di, :],
                rx_ok[li, di, :],
                rx_fail[li, di, :],
                CONST_INTERVAL,
            )
            for key in counters_1d:
                if key not in counters:
                    counters[key] = npo.nan_arr((num_links, num_dir, 1))
                counters[key][li, di, 0] = counters_1d[key]
    output.extend(nlts.write_stats("health", health, CONST_INTERVAL))
    output.extend(nlts.write_stats("tx_per", tx_per, CONST_INTERVAL))
    output.extend(nlts.write_stats("rx_per", rx_per, CONST_INTERVAL))
    for key in counters:
        output.extend(nlts.write_stats(key, counters[key], CONST_INTERVAL))

    pathloss, _ = npo.pathloss_asymmetry_nd(tx_power_idx, srssi, nlts.DIR_AXIS)
    pathloss_avg = np.nanmean(pathloss, axis=nlts.TIME_AXIS, keepdims=True)
    tx_beam_idx = np.apply_along_axis(npo.mode_int_1d, nlts.TIME_AXIS, tbi)
    rx_beam_idx = np.apply_along_axis(npo.mode_int_1d, nlts.TIME_AXIS, rbi)
    output.extend(nlts.write_stats("pathloss_avg", pathloss_avg, CONST_INTERVAL))
    output.extend(nlts.write_stats("tx_beam_idx", tx_beam_idx, CONST_INTERVAL))
    output.extend(nlts.write_stats("rx_beam_idx", rx_beam_idx, CONST_INTERVAL))

    mcs_p90 = np.nanpercentile(
        mcs, 10, axis=nlts.TIME_AXIS, interpolation="lower", keepdims=True
    )
    mcs_avg = np.nanmean(mcs, axis=nlts.TIME_AXIS, keepdims=True)
    output.extend(nlts.write_stats("mcs_p90", mcs_p90, CONST_INTERVAL))
    output.extend(nlts.write_stats("mcs_avg", mcs_avg, CONST_INTERVAL))

    stat_names = ["rssi", "snr", "txpwr"]
    raw_stats = [srssi, snr, tx_power_idx]
    for name, raw in zip(stat_names, raw_stats):
        avg_stats = np.nanmean(raw, axis=nlts.TIME_AXIS, keepdims=True)
        std_stats = np.nanstd(raw, axis=nlts.TIME_AXIS, keepdims=True)
        output.extend(nlts.write_stats(name + "_avg", avg_stats, CONST_INTERVAL))
        output.extend(nlts.write_stats(name + "_std", std_stats, CONST_INTERVAL))

    return output
