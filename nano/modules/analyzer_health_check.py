#!/usr/bin/env python3

import math

# built-ins
import time

# modules
import modules.keywords as KEY
import numpy as np
from modules.addon_misc import (
    align_timeseries_data,
    get_cluster_beam_idx,
    get_link_log_url,
    update_nested_dict,
)
from modules.addon_parser_health_check_print import printout_analysis
from modules.analyzer_topology_opt import analyze_connectivity_graph
from modules.util_interference import NOISE_FLOOR_db
from modules.util_math import (
    calc_pathloss,
    db2pwr,
    index2deg,
    isnan,
    mean,
    median,
    percentiles,
    pwr2db,
    std,
    translate_tx_power,
)


MCS_DIFF_THRESH = 2
MCS_TARGET = 9
MIN_MCS = 2
MAX_MCS = 12
RSSI_STD_FOLIAGE_THRESH_DB = 2
SNR_STD_FOLIAGE_THRESH = 2
TX_POWER_STD_THRESH = 3
PATH_LOSS_STD_FOLIAGE_LIKELY_THRESH = 1.5
RSSI_STD_FOLIAGE_LIKELY_THRESH_DB = 1.5
SNR_STD_FOLIAGE_LIKELY_THRESH = 1.5
TX_POWER_STD_FOLIAGE_LIKELY_THRESH = 1.5

SNR_STD_INTERF_THRESH = 2
IPERF_PER_EXCELLENT_THRESH = 0.5
IPERF_PER_OKAY_THRESH = 1
IPERF_PER_WARNING_THRESH = 2
IPERF_MCS_EXCEL_THRESH_SHORT_LINK = 12
IPERF_MCS_EXCEL_THRESH_LONG_LINK = 9
IPERF_MCS_OKAY_THRESH_SHORT_LINK = 11
IPERF_MCS_OKAY_THRESH_LONG_LINK = 9
IPERF_MCS_WARNING_THRESH_SHORT_LINK = 9
IPERF_MCS_WARNING_THRESH_LONG_LINK = 7
IPERF_WARM_UP = 30
US_IN_SECOND = 1000000
LARGER = 3
EQUAL = 2
SMALLER = 1
UNKNOWN = -1


def analyze_reciprocal_im(myData):
    """
    anlalyze reciprocal links via im scans

    struct: {
        linkName: {
            KEY.LB_RECIPROCAL_IM: status,
            KEY.A2Z: {KEY.A2Z_BEST: [txIdx, rxIdx, potentialSNR]},
            KEY.Z2A: {KEY.Z2A_BEST: [txIdx, rxIdx, potentialSNR]}
        }
    }
    """

    def _get_snr_from_im_scans(data, txNode, rxNode):
        """
        do not call this function directly
        this finds from im scans if specified txNode and rxNode has measurements
        and returns the highest signal paths
        """
        if txNode not in data:
            return None
        for token in data[txNode]:
            if rxNode in data[txNode][token]:
                routes = get_cluster_beam_idx(
                    data[txNode][token][rxNode], use_rssi=False, target=15
                )
                # if cannot find routes
                if not routes:
                    continue
                routes = sorted(routes, key=lambda x: x[2], reverse=True)
                return routes[0]
        return None

    linkReciprocalDict = {}
    im_scans = myData.get_im_data()
    # get all links from topology (only those wireless)
    for link in myData.topology.get_links(isWireless=True):
        if link not in linkReciprocalDict:
            linkReciprocalDict[link] = {}
        ANode = myData.topology.get_a_node(link)
        ZNode = myData.topology.get_z_node(link)
        A2ZBestPath = _get_snr_from_im_scans(im_scans, ANode, ZNode)
        Z2ABestPath = _get_snr_from_im_scans(im_scans, ZNode, ANode)
        linkReciprocalDict[link][KEY.A2Z] = {KEY.A2Z_BEST: A2ZBestPath}
        linkReciprocalDict[link][KEY.Z2A] = {KEY.Z2A_BEST: Z2ABestPath}
        linkReciprocalDict[link][KEY.LB_RECIPROCAL_IM] = KEY.STATUS_UNKNOWN
        if A2ZBestPath is not None and Z2ABestPath is not None:
            linkReciprocalDict[link][KEY.LB_RECIPROCAL_IM] = KEY.STATUS_MATCH
            snrDiff = abs(A2ZBestPath[2] - Z2ABestPath[2])
            txDegDiff = abs(index2deg(A2ZBestPath[0]) - index2deg(Z2ABestPath[1]))
            rxDegDiff = abs(index2deg(A2ZBestPath[1]) - index2deg(Z2ABestPath[0]))
            if (
                snrDiff > KEY.THRESH_RECIPROCAL_DIFF
                or txDegDiff > KEY.THRESH_RECIPROCAL_DIFF
                or rxDegDiff > KEY.THRESH_RECIPROCAL_DIFF
            ):
                linkReciprocalDict[link][KEY.LB_RECIPROCAL_IM] = KEY.STATUS_MISMATCH
    return linkReciprocalDict


def analyze_interference(
    sector_inrs, topology, check_polarity=True, ignore_same_pole=False
):
    """
    post analyze interference after we figure out rx's interferers

    @param sector_inrs: pairs of INRs format: [tx, rx, INR, txTowards, rxTowards]
    @param topology: topology object
    @param check_polarity: default True, whether considering polarity in analysis
    @param ignore_same_pole: default False, whether ignoring polarity on the same pole

    @return struct: {
        rxNodeName_rxTowardsNode: [overallINR, [txNodeName, INR, txTowardsNode]]
    }
    """
    rxINRList = {}
    for each in sector_inrs:
        tx, rx, inr = each[0:3]
        txTowardsNode, rxTowardsNode = "nan", "nan"
        if len(each) > 3:
            txTowardsNode = each[3]
            rxTowardsNode = each[4]
        # handling p2mp cases where we have time division between links
        # if so, we shall have no interference due to time difference
        if txTowardsNode == rx or rxTowardsNode == tx:
            continue
        # if polarity is the same for both, then we will not have interference
        if check_polarity:
            if topology.get_polarity(tx) == topology.get_polarity(rx):
                continue
        # if we choose to ignore the interference on the same pole whatever
        if ignore_same_pole:
            if topology.get_site_name(tx) == topology.get_site_name(rx):
                continue
        rxkey = "{0}__{1}".format(rx, rxTowardsNode)
        if rxkey not in rxINRList:
            rxINRList[rxkey] = [0, []]
        rxINRList[rxkey][0] += db2pwr(inr + NOISE_FLOOR_db)
        rxINRList[rxkey][1].append((tx, inr, txTowardsNode))
    keys = list(rxINRList.keys())
    for rx in keys:
        rxINRList[rx][0] = pwr2db(rxINRList[rx][0]) - NOISE_FLOOR_db
        if rxINRList[rx][0] <= -10:
            del rxINRList[rx]
    return rxINRList


def analyze_alignment(data):
    """
    analyze box misalignment

    TODO: add box swap label by checking sectors on the same site

    struct: {
        linkName: {
            KEY.LB_MISALIGNMENT: status,
            KEY.A2Z: {KEY.LB_MISALIGNMENT: status, key1:val1, ...},
            KEY.Z2A: ...
        }
    }
    """

    def format_node_status(myDict, keyName, nodeTxIdx, nodeRxIdx):
        """
        assign node status
        """
        if nodeTxIdx is None or nodeRxIdx is None:
            return
        nodeTxDegree = index2deg(nodeTxIdx)
        nodeRxDegree = index2deg(nodeRxIdx)
        myDict[keyName] = {
            KEY.LB_MISALIGNMENT: KEY.STATUS_TX_RX_HEALTHY,
            KEY.ODS_PERIOD_TX_BEAM: nodeTxIdx,
            KEY.ODS_PERIOD_RX_BEAM: nodeRxIdx,
            KEY.BEAM_TX_ANG: nodeTxDegree,
            KEY.BEAM_RX_ANG: nodeRxDegree,
        }
        if (
            abs(nodeTxDegree) > KEY.THRESH_MISALIGN_DEG
            or abs(nodeRxDegree) > KEY.THRESH_MISALIGN_DEG
        ):
            myDict[keyName][KEY.LB_MISALIGNMENT] += KEY.STATUS_LARGE_ANGLE
        if abs(nodeTxDegree - nodeRxDegree) > KEY.THRESH_TX_RX_DIFF_DEG:
            myDict[keyName][KEY.LB_MISALIGNMENT] += KEY.STATUS_TX_RX_DIFF

    def format_link_status(myDict):
        """
        assign link status
        """
        myKey = KEY.LB_MISALIGNMENT
        # default link status is unknown
        if (
            myDict[KEY.A2Z][myKey] is KEY.STATUS_UNKNOWN
            or myDict[KEY.Z2A][myKey] is KEY.STATUS_UNKNOWN
        ):
            return
        myDict[myKey] = KEY.STATUS_TX_RX_DIFF  # 1
        if (myDict[KEY.A2Z][myKey] == KEY.STATUS_TX_RX_HEALTHY) and (
            myDict[KEY.Z2A][myKey] == KEY.STATUS_TX_RX_HEALTHY
        ):
            myDict[myKey] = KEY.STATUS_TX_RX_HEALTHY

    result = {}
    links = data.topology.get_links(isWireless=True)
    for link in links:
        # setup default
        result[link] = {
            KEY.LB_MISALIGNMENT: KEY.STATUS_UNKNOWN,  # -1
            KEY.A2Z: {KEY.LB_MISALIGNMENT: KEY.STATUS_UNKNOWN},
            KEY.Z2A: {KEY.LB_MISALIGNMENT: KEY.STATUS_UNKNOWN},
        }
        # get a and z nodes
        aNode = data.topology.get_a_node(link)
        zNode = data.topology.get_z_node(link)
        # get aNode beam info
        aNodeTxIdx, aNodeRxIdx = data.topology.get_current_beam(aNode, zNode)
        # get zNode beam info
        zNodeTxIdx, zNodeRxIdx = data.topology.get_current_beam(zNode, aNode)
        # add to result (by default assuming it is healthy)
        format_node_status(result[link], KEY.A2Z, aNodeTxIdx, aNodeRxIdx)
        format_node_status(result[link], KEY.Z2A, zNodeTxIdx, zNodeRxIdx)
        format_link_status(result[link])
    return result


def analyze_alignment_old(data):
    """
    analyze box misalignment
    """
    nodes = data.topology.get_all_nodes()
    # params
    result = {}
    for tx in nodes:
        channel_info = data.topology.get_node_extra(tx)
        if channel_info is None:
            data.logger.debug("Nothing for {0}".format(tx))
            continue
        for rx in channel_info:
            key = "{0}__{1}".format(tx, rx)
            if not channel_info[rx]:
                result[key] = {KEY.LB_MISALIGNMENT: KEY.STATUS_UNKNOWN}
                continue
            try:
                tx_idx = channel_info[rx][KEY.ODS_PERIOD_TX_BEAM]
                rx_idx = channel_info[rx][KEY.ODS_PERIOD_RX_BEAM]
            except BaseException:
                result[key] = {KEY.LB_MISALIGNMENT: KEY.STATUS_UNKNOWN}
                continue
            tx_idx_deg = index2deg(tx_idx)
            rx_idx_deg = index2deg(rx_idx)
            result[key] = {
                KEY.LB_MISALIGNMENT: KEY.STATUS_TX_RX_HEALTHY,
                KEY.ODS_PERIOD_TX_BEAM: tx_idx,
                KEY.ODS_PERIOD_RX_BEAM: rx_idx,
                KEY.BEAM_TX_ANG: tx_idx_deg,
                KEY.BEAM_RX_ANG: rx_idx_deg,
            }
            if (abs(tx_idx_deg) > KEY.THRESH_MISALIGN_DEG) or (
                abs(rx_idx_deg) > KEY.THRESH_MISALIGN_DEG
            ):
                result[key][KEY.LB_MISALIGNMENT] += KEY.STATUS_LARGE_ANGLE
            if abs(tx_idx_deg - rx_idx_deg) > KEY.THRESH_TX_RX_DIFF_DEG:
                result[key][KEY.LB_MISALIGNMENT] += KEY.STATUS_TX_RX_DIFF
            data.logger.debug(
                "{0}: txIdx: {1} ({2:.2f}deg) rxIdx: {3} ({4:.2f}deg)".format(
                    key, tx_idx, tx_idx_deg, rx_idx, rx_idx_deg
                )
            )
    return result


def analyze_multihop(data, tcp=True, bitrate="500M", server_ip=None):
    """
    analyze multihop data for a set of measurements:
        iperf throughput, ping latency, hop counts
    @param data: Data() object from util_data_loader
    """

    def format_bilink_status_multihop(myDict, myKey):
        """
        assign bidirectional link status
        """
        # default link status is unknown, if both directions are unknown, skip
        if (
            myDict[KEY.A2Z][myKey] is KEY.STATUS_UNKNOWN
            and myDict[KEY.Z2A][myKey] is KEY.STATUS_UNKNOWN
        ):
            return
        # worst case summary of the A->Z and Z->Z direction
        myDict[myKey] = max(myDict[KEY.A2Z][myKey], myDict[KEY.Z2A][myKey])

    # TODO: save targetRate in analysis json file when variable rate for QoS
    targetRate = convert_rate(bitrate, data.logger)
    multihopData = data.get_multihop_data()
    method = "tcp"
    if not tcp:
        method = "udp"

    # multihop: load multihop measurement result
    multihopIperfPingRouteData, labelKey = get_multihop(
        multihopData, method=method, logger=data.logger
    )
    data.logger.info(
        "multihop, traffic session num={}".format(
            len(multihopIperfPingRouteData.keys())
        )
    )
    # derive multihop path information - hop_count and wireless_hop_count
    multihopPathInfo = derive_end_to_end_path(
        multihopIperfPingRouteData,
        topology=data.topology,
        logger=data.logger,
        server_ip=server_ip,
    )
    # multihop: data parsing for iperf
    multihopThrptStats = derive_stats(
        KEY.IPERF_DETAILS,
        multihopIperfPingRouteData,
        data.logger,
        delay=KEY.MUTLIHOP_WARM_UP_DELAY,
    )
    # multihop: data parsing for ping6
    multihopPingStats = derive_stats(
        KEY.PING_DETAILS,
        multihopIperfPingRouteData,
        data.logger,
        delay=KEY.MUTLIHOP_WARM_UP_DELAY,
    )

    # multihop: data parsing TCP retrans
    if method == "tcp":
        multihopThrptStats = extract_special_stats(
            KEY.IPERF_TCP_RETRANS,
            multihopIperfPingRouteData,
            multihopThrptStats,
            data.logger,
        )
    multihopPingStats = extract_special_stats(
        KEY.PING_LOSS, multihopIperfPingRouteData, multihopPingStats, data.logger
    )

    # nested dict update via update_nested_dict
    multihopIperfPingRoute = {}
    multihopIperfPingRoute = update_nested_dict(multihopThrptStats, multihopPingStats)
    multihopIperfPingRoute = update_nested_dict(
        multihopIperfPingRoute, multihopPathInfo
    )
    # derive average hop counts and update multihopIperfPingRoute
    derive_path_hop_count(multihopIperfPingRoute, logger=data.logger)
    # derive per-hop latency and update multihopIperfPingRoute
    update_per_hop_latency(multihopIperfPingRoute)

    iperf_avg = "{0}_avg".format(KEY.IPERF_DETAILS)
    ping_avg = "{0}_avg".format(KEY.PING_DETAILS)
    multihopResult = {}
    # special treatment for bidirection to avoid duplication
    for tx in multihopIperfPingRoute:
        for rx in multihopIperfPingRoute[tx]:
            data.logger.debug(
                "{}_{}, iperf_avg={}, ping_avg={}".format(
                    tx,
                    rx,
                    multihopIperfPingRoute[tx][rx][iperf_avg],
                    multihopIperfPingRoute[tx][rx][ping_avg],
                )
            )
            link = "link-{0}-{1}".format(tx, rx)
            reverseLink = "link-{0}-{1}".format(rx, tx)
            if reverseLink not in multihopResult:
                multihopResult[link] = {
                    labelKey: KEY.STATUS_UNKNOWN,
                    KEY.A2Z: {labelKey: KEY.STATUS_UNKNOWN},
                    KEY.Z2A: {labelKey: KEY.STATUS_UNKNOWN},
                }
                # assign stats for A->Z
                format_unilink_status_multihop(
                    multihopResult[link],
                    KEY.A2Z,
                    labelKey,
                    multihopIperfPingRoute.get(tx, {}).get(rx, {}),
                    targetRate,
                )
                # assign stats for Z->A
                format_unilink_status_multihop(
                    multihopResult[link],
                    KEY.Z2A,
                    labelKey,
                    multihopIperfPingRoute.get(rx, {}).get(tx, {}),
                    targetRate,
                )
                format_bilink_status_multihop(multihopResult[link], labelKey)
            else:
                continue

    # analyze_link_importance based on routeInfo for all nodes
    linkImportanceResult = analyze_link_importance(
        multihopIperfPingRoute, topology=data.topology, logger=data.logger
    )
    return multihopResult, linkImportanceResult


def analyze_ping(data, for_sa=False):
    """
    analyze ping data
    @param data: Data() object from util_data_loader
    """

    def format_node_status(myDict, keyName, stats):
        """
        assign node status
        """
        if not stats:
            return
        myDict[keyName].update(stats)
        p90PingVal = myDict[keyName].get(KEY.PING_DETAILS + "_p90b", 10e4)
        if p90PingVal < KEY.THRESH_NO_LATENCY:
            myDict[keyName][KEY.LB_PING_STATUS] = KEY.STATUS_EXCELLENT
        elif p90PingVal < KEY.THRESH_LOW_LATENCY:
            myDict[keyName][KEY.LB_PING_STATUS] = KEY.STATUS_HEALTHY
        elif p90PingVal < KEY.THRESH_MED_LATENCY:
            myDict[keyName][KEY.LB_PING_STATUS] = KEY.STATUS_WARNING
        elif p90PingVal < KEY.THRESH_HIGH_LATENCY:
            myDict[keyName][KEY.LB_PING_STATUS] = KEY.STATUS_BAD_OCCASION
        elif p90PingVal < KEY.THRESH_VERY_HIGH_LATENCY:
            myDict[keyName][KEY.LB_PING_STATUS] = KEY.STATUS_BAD_CONSTANT

    def format_link_status(myDict):
        """
        assign link status
        """
        myKey = KEY.LB_PING_STATUS
        # default link status is unknown
        if (
            myDict[KEY.A2Z][myKey] is KEY.STATUS_UNKNOWN
            or myDict[KEY.Z2A][myKey] is KEY.STATUS_UNKNOWN
        ):
            return
        # take the worst-case status from the two uni-directional links
        # as the bi-directional link status
        myDict[myKey] = max([myDict[KEY.A2Z][myKey], myDict[KEY.Z2A][myKey]])

    # load data
    pingData = data.get_ping_data(for_sa=for_sa)
    pingStats = derive_stats(
        KEY.PING_DETAILS, pingData, data.logger, delay=KEY.WARM_UP_DELAY
    )
    # start analysis for each link
    result = {}
    links = data.topology.get_links(isWireless=True)
    for link in links:
        # setup default
        result[link] = {
            KEY.LB_PING_STATUS: KEY.STATUS_UNKNOWN,
            KEY.A2Z: {KEY.LB_PING_STATUS: KEY.STATUS_UNKNOWN},
            KEY.Z2A: {KEY.LB_PING_STATUS: KEY.STATUS_UNKNOWN},
        }
        # get a and z nodes
        aNode = data.topology.get_a_node(link)
        zNode = data.topology.get_z_node(link)
        # assign stats
        format_node_status(
            result[link], KEY.A2Z, pingStats.get(aNode, {}).get(zNode, {})
        )
        format_node_status(
            result[link], KEY.Z2A, pingStats.get(zNode, {}).get(aNode, {})
        )
        format_link_status(result[link])
    return result


def _derive_PER(result, logger, delay=1):
    """
    Don't call this function directly.
    Calculate average PER
    """
    for key in result:
        # if not result[key]:
        #     continue
        if KEY.ODS_STA_PER in result[key]:
            per = [x[1] for x in result[key][KEY.ODS_STA_PER]]
            # IPERF_WARM_UP is introduced to account for iperf warm-up period
            avg_PER = mean(per[delay:-2])
            # unit: %
            result[key][KEY.IPERF_PER_AVG] = avg_PER / 10000.0
        else:
            logger.error("Did not find {0} for {1}.".format(KEY.ODS_STA_PER, key))
            result[key][KEY.IPERF_PER_AVG] = float("nan")


def _derive_link_distance(result, topology, logger):
    """
    Don't call this function directly.
    obtain distance for each link
    """
    for tx__rx in result:
        tx, rx = tx__rx.split("__")
        try:
            d = topology.get_distance(tx, rx)
            result[tx__rx][KEY.DISTANCE] = d
        except Exception:
            result[tx__rx][KEY.DISTANCE] = float("nan")


def _derive_link_dashboard_url(result, topology, logger):
    """
    Don't call this function directly.
    obtain distance for each link
    """
    for tx__rx in result:
        tx, rx = tx__rx.split("__")
        tx_mac = topology.get_mac(tx)
        rx_mac = topology.get_mac(rx)
        if (
            (KEY.IPERF_START in result[tx__rx])
            and (KEY.IPERF_END in result[tx__rx])
            and (tx_mac is not None)
            and (rx_mac is not None)
        ):
            logger.debug(
                "{}, iperf start={}, end={}".format(
                    tx__rx,
                    result[tx__rx][KEY.IPERF_START],
                    result[tx__rx][KEY.IPERF_END],
                )
            )
            # start and end for link dashboard
            start = result[tx__rx][KEY.IPERF_START] - 300
            end = result[tx__rx][KEY.IPERF_END] + 300
            link_log = get_link_log_url(tx_mac, rx_mac, start, end)
        else:
            link_log = ""
        result[tx__rx][KEY.DASHBOARD] = link_log


def _derive_MCS(result, logger, delay=1):
    """
    Don't call this function directly.
    Calculate average MCS and MCS P90
    """
    for key in result:
        # if not result[key]:
        #     continue
        result[key][KEY.MCS_AVG] = -1
        result[key][KEY.MCS_STD] = -1
        result[key][KEY.MCS_MAX] = -1
        result[key][KEY.MCS_MIN] = -1
        result[key][KEY.MCS_P90] = -1
        if KEY.ODS_STA_MCS in result[key]:
            mcs = [float(x[1]) for x in result[key][KEY.ODS_STA_MCS]]
            mcs = mcs[delay:-2]
            if mcs == []:
                continue
            mcs_avg = mean(mcs)
            mcs_p90 = math.floor(percentiles(mcs, 10))
            mcs_std = std(mcs)
            mcs_min = min(mcs)
            mcs_max = max(mcs)
            logger.debug(
                "link={0}, mcs_p90={1}, avg={2}, std={3}".format(
                    key, mcs_p90, mcs_avg, mcs_std
                )
            )
            result[key][KEY.MCS_AVG] = mcs_avg
            result[key][KEY.MCS_STD] = mcs_std
            result[key][KEY.MCS_MAX] = mcs_max
            result[key][KEY.MCS_MIN] = mcs_min
            result[key][KEY.MCS_P90] = mcs_p90
        else:
            logger.error("Did not find {0} for {1}.".format(KEY.ODS_STA_MCS, key))


def derive_mcs_histogram_all_links(result, logger, monitor=False):
    """
    Don't call this function directly.
    derive mcs histogram for all terragraph links
    """
    if monitor:
        mcs_p90_key = "mcs_p90_full"
    else:
        mcs_p90_key = KEY.MCS_P90
    # list for mcs P90 values for all links
    mcs_p90_list = [
        result[tx__rx][mcs_p90_key]
        for tx__rx in result
        if not (
            (mcs_p90_key not in result[tx__rx])
            or (result[tx__rx][mcs_p90_key] == "nan")
            or (result[tx__rx][mcs_p90_key] == float("nan"))
        )
    ]
    mcs_p90_list = [x for x in mcs_p90_list if x != "nan"]
    logger.debug(
        "To derive mcs histogram, mcs p90 list length = {}, mcs p90 list = {}".format(
            len(mcs_p90_list), mcs_p90_list
        )
    )
    mcs_histogram = derive_mcs_histogram(mcs_p90_list, logger)
    return mcs_histogram


def mcs_histogram_prep(mcs):
    mcs_list = [x for x in mcs if x != "nan"]
    return mcs_list


def derive_mcs_histogram(mcs_list, logger):
    mcs_array = np.asarray(mcs_list)
    logger.debug("mcs_array={}, mcs_array_size={}".format(mcs_array, len(mcs_array)))
    # mcs 1 and 5 have been excluded in link adaptation so far
    bins = [x for x in range(MIN_MCS, MAX_MCS + 2) if x != 5]
    hist, bin_edges = np.histogram(mcs_array, bins=bins)
    logger.debug(
        "hist={}, bin_edges={}, hist_size={}, hist_sum={}".format(
            hist, bin_edges, len(hist), sum(hist)
        )
    )
    # convert mcs histogram to a dictionary
    mcs_histogram = {}
    idx = 0
    for mcs_idx in range(MIN_MCS, MAX_MCS + 1):
        if mcs_idx != 5:
            mcs_histogram[mcs_idx] = hist[idx]
            idx = idx + 1
    logger.debug("mcs_histogram={}".format(mcs_histogram))
    return mcs_histogram


def _iperf_classification(
    result,
    logger,
    key_of_status,
    iperf_target_okay,
    iperf_target_warning,
    iperf_target_excel,
):
    """
    Analyze and label the iperf status
    """
    # count how many links are healthy
    health_count = 0
    idx = 0
    link_status = {
        "overview": {
            "excellent": {"total": 0},
            "healthy": {"total": 0, "mcs": 0, "tp": 0, "per": 0},
            "marginal": {"total": 0, "mcs": 0, "tp": 0, "per": 0},
            "warning": {"total": 0, "mcs": 0, "tp": 0, "per": 0},
        },
        "200+": {
            "total": 0,
            "excellent": {"total": 0},
            "mcs_p90": [],
            "mcs_hist": {},
            "healthy": {"total": 0, "mcs": 0, "tp": 0, "per": 0},
            "marginal": {"total": 0, "mcs": 0, "tp": 0, "per": 0},
            "warning": {"total": 0, "mcs": 0, "tp": 0, "per": 0},
        },
        "100_200": {
            "total": 0,
            "excellent": {"total": 0},
            "mcs_p90": [],
            "mcs_hist": {},
            "healthy": {"total": 0, "mcs": 0, "tp": 0, "per": 0},
            "marginal": {"total": 0, "mcs": 0, "tp": 0, "per": 0},
            "warning": {"total": 0, "mcs": 0, "tp": 0, "per": 0},
        },
        "50_100": {
            "total": 0,
            "excellent": {"total": 0},
            "mcs_p90": [],
            "mcs_hist": {},
            "healthy": {"total": 0, "mcs": 0, "tp": 0, "per": 0},
            "marginal": {"total": 0, "mcs": 0, "tp": 0, "per": 0},
            "warning": {"total": 0, "mcs": 0, "tp": 0, "per": 0},
        },
        "0_50": {
            "total": 0,
            "excellent": {"total": 0},
            "mcs_p90": [],
            "mcs_hist": {},
            "healthy": {"total": 0, "mcs": 0, "tp": 0, "per": 0},
            "marginal": {"total": 0, "mcs": 0, "tp": 0, "per": 0},
            "warning": {"total": 0, "mcs": 0, "tp": 0, "per": 0},
        },
    }
    for tx__rx in result:
        idx += 1
        if not result[tx__rx] or KEY.IPERF_AVG not in result[tx__rx]:
            result[tx__rx][key_of_status] = KEY.STATUS_UNKNOWN
            continue
        tx, rx = tx__rx.split("__")
        mcs_okay_thresh = IPERF_MCS_OKAY_THRESH_SHORT_LINK
        mcs_warning_thresh = IPERF_MCS_WARNING_THRESH_SHORT_LINK
        # short link < 100m
        if result[tx__rx][KEY.DISTANCE] < 100:
            mcs_excel_thresh = IPERF_MCS_EXCEL_THRESH_SHORT_LINK
            mcs_okay_thresh = IPERF_MCS_OKAY_THRESH_SHORT_LINK
            mcs_warning_thresh = IPERF_MCS_WARNING_THRESH_SHORT_LINK
            if result[tx__rx][KEY.DISTANCE] < 50:
                status_len = link_status["0_50"]
            elif result[tx__rx][KEY.DISTANCE] < 100:
                status_len = link_status["50_100"]
        # long link >= 100m
        elif result[tx__rx][KEY.DISTANCE] >= 100:
            mcs_excel_thresh = IPERF_MCS_EXCEL_THRESH_LONG_LINK
            mcs_okay_thresh = IPERF_MCS_OKAY_THRESH_LONG_LINK
            mcs_warning_thresh = IPERF_MCS_WARNING_THRESH_LONG_LINK
            if result[tx__rx][KEY.DISTANCE] < 200:
                status_len = link_status["100_200"]
            elif result[tx__rx][KEY.DISTANCE] >= 200:
                status_len = link_status["200+"]
        status_len["total"] += 1
        status_len["mcs_p90"].append(result[tx__rx][KEY.MCS_P90])
        status_overview = link_status["overview"]

        if (
            (result[tx__rx][KEY.IPERF_AVG] >= iperf_target_excel)
            and (result[tx__rx][KEY.IPERF_PER_AVG] < IPERF_PER_EXCELLENT_THRESH)
            and (result[tx__rx][KEY.MCS_P90] >= mcs_excel_thresh)
        ):
            result[tx__rx][key_of_status] = KEY.STATUS_EXCELLENT
            status_len["excellent"]["total"] += 1
            status_overview["excellent"]["total"] += 1
            health_count += 1
        elif (
            (result[tx__rx][KEY.IPERF_AVG] >= iperf_target_okay)
            and (result[tx__rx][KEY.IPERF_PER_AVG] < IPERF_PER_OKAY_THRESH)
            and (result[tx__rx][KEY.MCS_P90] >= mcs_okay_thresh)
        ):
            result[tx__rx][key_of_status] = KEY.STATUS_HEALTHY
            status_len["healthy"]["total"] += 1
            status_overview["healthy"]["total"] += 1
            # compare to excellent category
            if result[tx__rx][KEY.IPERF_AVG] < iperf_target_excel:
                # throughput issue
                status_overview["healthy"]["tp"] += 1
                status_len["healthy"]["tp"] += 1
            if result[tx__rx][KEY.IPERF_PER_AVG] >= IPERF_PER_EXCELLENT_THRESH:
                # PER issue
                status_overview["healthy"]["per"] += 1
                status_len["healthy"]["per"] += 1
            if result[tx__rx][KEY.MCS_P90] < mcs_excel_thresh:
                # mcs issue
                status_overview["healthy"]["mcs"] += 1
                status_len["healthy"]["mcs"] += 1
            health_count += 1
        elif (
            (result[tx__rx][KEY.IPERF_AVG] >= iperf_target_warning)
            and (result[tx__rx][KEY.IPERF_PER_AVG] < IPERF_PER_WARNING_THRESH)
            and (result[tx__rx][KEY.MCS_P90] >= mcs_warning_thresh)
        ):
            result[tx__rx][key_of_status] = KEY.STATUS_WARNING
            status_len["marginal"]["total"] += 1
            status_overview["marginal"]["total"] += 1
            # compare to healthy category
            if result[tx__rx][KEY.IPERF_AVG] < iperf_target_okay:
                status_overview["marginal"]["tp"] += 1
                status_len["marginal"]["tp"] += 1
            if result[tx__rx][KEY.IPERF_PER_AVG] >= IPERF_PER_OKAY_THRESH:
                status_overview["marginal"]["per"] += 1
                status_len["marginal"]["per"] += 1
            if result[tx__rx][KEY.MCS_P90] < mcs_okay_thresh:
                status_overview["marginal"]["mcs"] += 1
                status_len["marginal"]["mcs"] += 1
        # problemetic if iperf std is larger than overall std
        else:
            result[tx__rx][key_of_status] = KEY.STATUS_BAD_OCCASION
            status_len["warning"]["total"] += 1
            status_overview["warning"]["total"] += 1
            # compare to marginal category
            if result[tx__rx][KEY.IPERF_AVG] < iperf_target_warning:
                status_overview["warning"]["tp"] += 1
                status_len["warning"]["tp"] += 1
            if result[tx__rx][KEY.IPERF_PER_AVG] >= IPERF_PER_WARNING_THRESH:
                status_overview["warning"]["per"] += 1
                status_len["warning"]["per"] += 1
            if result[tx__rx][KEY.MCS_P90] < mcs_warning_thresh:
                status_overview["warning"]["mcs"] += 1
                status_len["warning"]["mcs"] += 1
    logger.debug(link_status)
    # calculate mcs histogram
    link_status["200+"]["mcs_hist"] = derive_mcs_histogram(
        mcs_histogram_prep(link_status["200+"]["mcs_p90"]), logger
    )
    link_status["100_200"]["mcs_hist"] = derive_mcs_histogram(
        mcs_histogram_prep(link_status["100_200"]["mcs_p90"]), logger
    )
    link_status["50_100"]["mcs_hist"] = derive_mcs_histogram(
        mcs_histogram_prep(link_status["50_100"]["mcs_p90"]), logger
    )
    link_status["0_50"]["mcs_hist"] = derive_mcs_histogram(
        mcs_histogram_prep(link_status["0_50"]["mcs_p90"]), logger
    )
    return link_status


def get_iperf_time(data, udp=False):
    """
    get iperf start and end time
    @param data: Data() object from util_data_loader
    """
    iperf_data = data.get_iperf_data()
    key_to_use = "tcp"
    if udp:
        key_to_use = "udp"
    for tx in iperf_data:
        for rx in iperf_data[tx]:
            tmp = iperf_data[tx][rx]
            if key_to_use in tmp:
                # KEY.IPERF_START and KEY.IPERF_END not empty
                if (
                    KEY.IPERF_START in tmp[key_to_use]
                    and KEY.IPERF_END in tmp[key_to_use]
                ):
                    start_time = tmp[key_to_use][KEY.IPERF_START] - 20
                    end_time = tmp[key_to_use][KEY.IPERF_END] + 20
                    data.logger.debug(
                        key_to_use
                        + " iperf started on {0}, ".format(start_time)
                        + "finished on {0}".format(end_time)
                    )
                    return (start_time, end_time)

    # if KEY.IPERF_START and KEY.IPERF_END are empty
    end_time = int(time.time())
    return (end_time - 1800, end_time)


def convert_rate(bitrate, logger):
    """
    convert bit rate string to actual rate in Mbps
    """
    # by default we assume it is 1.8Gbps
    rate = 1800.0
    try:
        rate = float(bitrate[0:-1])
        unit = bitrate[-1].lower()
        logger.debug(
            "Before conversion, bitrate = {0}, target rate {1}, unit {2}".format(
                bitrate, rate, unit
            )
        )
        if unit == "g":
            rate = rate * 1000.0
        elif unit == "k":
            rate = rate / 1000.0
        elif not unit == "m":
            logger.error("Unit not expected: {0} in {1}".format(unit, bitrate))
    except BaseException as ex:
        logger.error("Failed to convert bitrate {0}".format(bitrate))
        logger.error("Error: {0}".format(ex))
        logger.error("Use default rate: {0}Mbps".format(rate))
    logger.debug("Target rate: {0}Mbps".format(rate))
    return rate


def derive_stats(statsKey, result, logger, delay=0, coeff=1, renameKey=None):
    """
    derive stats for a particular key

    @param statsKey: key name used as shown in the supported formats
    @param result: a dictionary holds all data
    @param logger: EmptyLogger object
    @param delay: determine number beginning data discarded
    @param coeff: custom ratio of the stat that shall be multiplied
                  for example, if stats is PER, we need to put coeff to be
                  KEY.COEFF_PER (0.0001) to scale it to % value
    @param renameKey: we can choose to replace a long statsKey to something else
                      set to None to use statsKey

    support format 1: {tx: {rx: {statsKey: [(x, x), ...], ...}, ...}, ...}
    support format 2: {tx__rx: {statsKey: [(x, x), ...], ...}, ...}
    """
    if renameKey is None:
        renameKey = statsKey
    stats = {}
    for key in result:
        try:
            tx, rx = key.split("__")
            rxs = [rx]
            data = {rx: result[key]}
        except ValueError:
            tx = key
            rxs = list(result[tx].keys())
            data = result[tx]
        if tx not in stats:
            stats[tx] = {}
        for rx in rxs:
            if rx not in stats[tx]:
                # derive min, max, mean, median, std,
                # and 90-percentile (ABOVE & BELOW a val)
                stats[tx][rx] = {
                    "{0}_min".format(renameKey): float("nan"),
                    "{0}_max".format(renameKey): float("nan"),
                    "{0}_avg".format(renameKey): float("nan"),
                    "{0}_med".format(renameKey): float("nan"),
                    "{0}_std".format(renameKey): float("nan"),
                    "{0}_p90".format(renameKey): float("nan"),
                    "{0}_p90b".format(renameKey): float("nan"),
                }
            if statsKey in data[rx]:
                allStats = [x[-1] for x in data[rx][statsKey]]
                if not allStats[delay:-2]:
                    logger.debug(
                        "allStats empty for stat {0} at rx {1}".format(statsKey, rx)
                    )
                    continue
                stats[tx][rx]["{0}_min".format(renameKey)] = (
                    min(allStats[delay:-2]) * coeff
                )
                stats[tx][rx]["{0}_max".format(renameKey)] = (
                    max(allStats[delay:-2]) * coeff
                )
                stats[tx][rx]["{0}_avg".format(renameKey)] = (
                    mean(allStats[delay:-2]) * coeff
                )
                stats[tx][rx]["{0}_med".format(renameKey)] = (
                    median(allStats[delay:-2]) * coeff
                )
                stats[tx][rx]["{0}_std".format(renameKey)] = (
                    std(allStats[delay:-2]) * coeff
                )
                # at least a 90% probability (P90)
                # the quantities will equal or exceed this value
                stats[tx][rx]["{0}_p90".format(renameKey)] = (
                    percentiles(allStats[delay:-2], 10) * coeff
                )
                # at least a 10% probability (P10)
                # the quantities will equal or exceed this value
                stats[tx][rx]["{0}_p90b".format(renameKey)] = (
                    percentiles(allStats[delay:-2], 90) * coeff
                )
            else:
                logger.error(
                    "Did not find {0} for tx {1} & rx {2}.".format(statsKey, tx, rx)
                )
    return stats


def extract_special_stats(statsKey, result, stats, logger, coeff=1, renameKey=None):
    """
    add a particular key/value from collected result to stats

    @param statsKey: key name used as shown in the supported formats
    @param result: a dictionary holds all data
    @param logger: EmptyLogger object
    @param coeff: custom ratio of the stat that shall be multiplied
    @param renameKey: we can choose to replace a long statsKey to something else
                      set to None to use statsKey

    support format 1: {tx: {rx: {statsKey: [(x, x), ...], ...}, ...}, ...}
    support format 2: {tx__rx: {statsKey: [(x, x), ...], ...}, ...}
    """
    if renameKey is None:
        renameKey = statsKey
    for key in result:
        tx = key
        rxs = list(result[tx].keys())
        data = result[tx]
        for rx in rxs:
            if rx not in stats[tx]:
                # add only one field statsKey to stats[tx][rx]
                stats[tx][rx].update({renameKey: float("nan")})
            # in-case the data[rx][statsKey] is empty
            if statsKey in data[rx] and data[rx][statsKey] is not None:
                logger.debug(
                    "link {0}->{1}, extract key {2} with value {3}".format(
                        tx, rx, statsKey, data[rx][statsKey]
                    )
                )
                # data[rx][statsKey] is float/int
                if isinstance(data[rx][statsKey], int) or isinstance(
                    data[rx][statsKey], float
                ):
                    stats[tx][rx][renameKey] = data[rx][statsKey] * coeff
                # data[rx][statsKey] is not float/int,
                # but string consists of digits only.
                elif data[rx][statsKey].replace(".", "").isdigit():
                    stats[tx][rx][renameKey] = float(data[rx][statsKey]) * coeff
                # data[rx][statsKey] is purely char string
                elif isinstance(data[rx][statsKey], str):
                    stats[tx][rx][renameKey] = data[rx][statsKey]
                else:
                    logger.error(
                        "{0} value for tx {1} & rx {2}: {3} is not valid.".format(
                            statsKey, tx, rx, data[rx][statsKey]
                        )
                    )
                    continue

                logger.debug(
                    "Extracted {0} is {1}".format(renameKey, stats[tx][rx][renameKey])
                )
            else:
                logger.error(
                    "Did not find {0} for tx {1} & rx {2}.".format(statsKey, tx, rx)
                )
    return stats


def derive_path_hop_count(result, logger=None):
    """
    derive aggregated wireless path and hop count from multiple traceroute measurements
    """
    for key in result:
        tx = key
        rxs = list(result[tx].keys())
        data = result[tx]
        for rx in rxs:
            # average value init.
            data[rx][KEY.WIRELESS_HOP_COUNT] = float("nan")
            data[rx][KEY.HOP_COUNT] = float("nan")
            data[rx][KEY.WIRELESS_PATH_NUM] = float("nan")
            data[rx][KEY.HOP_COUNT] = float("nan")
            data[rx][KEY.WIRELESS_PATH] = []
            data[rx][KEY.DOMINANT_WIRELESS_PATH] = []
            data[rx][KEY.DOMINANT_WIRELESS_PATH_OCCURRENCE] = float("nan")

            wireless_hop_count = [
                x[KEY.WIRELESS_HOP_COUNT]
                for x in data[rx][KEY.TRACEROUTE_DETAILS]
                if x[KEY.WIRELESS_HOP_COUNT] != float("nan")
            ]
            hop_count = [
                x[KEY.HOP_COUNT]
                for x in data[rx][KEY.TRACEROUTE_DETAILS]
                if x[KEY.HOP_COUNT] != float("nan")
            ]
            # wireless_path shall be obtained from valid measurements
            wireless_path = [
                x[KEY.WIRELESS_PATH]
                for x in data[rx][KEY.TRACEROUTE_DETAILS]
                if x[KEY.WIRELESS_PATH] is not None
            ]
            # the size of wireless_hop_count, hop_count, and wireless_path
            # shall match from the design in extract_path_from_traceroute_measurements
            logger.debug(
                "{0}->{1}, wireless_hop_count = {2}\n".format(
                    tx, rx, wireless_hop_count
                )
                + " hop_count = {0}\n".format(hop_count)
                + " wireless_path = {0}".format(wireless_path)
            )
            unique_wireless_path = []
            dominant_path = None
            dominant_path_occurrence = None
            dominant_wireless_hop_count = None
            dominant_hop_count = None
            path_index = 0
            # TODO: to further optimize the efficiency
            # count the num of unique paths and the num of occurrence for each path
            for path in wireless_path:
                if path != float("nan"):
                    if path not in unique_wireless_path:
                        # unique_wireless_path to store distinct paths
                        unique_wireless_path.append(path)
                        # wireless_path to store distinct path entries and
                        # the num of occurrence for each path
                        path_occurrence = wireless_path.count(path)
                        if (not dominant_path_occurrence) or (
                            dominant_path_occurrence < path_occurrence
                        ):
                            dominant_path_occurrence = path_occurrence
                            dominant_path = path
                            dominant_hop_count = hop_count[path_index]
                            dominant_wireless_hop_count = wireless_hop_count[path_index]
                        data[rx][KEY.WIRELESS_PATH].append([path, path_occurrence])
                path_index += 1
            # count the number of unique wireless paths
            data[rx][KEY.WIRELESS_PATH_NUM] = len(unique_wireless_path)
            if dominant_path and dominant_path_occurrence:
                data[rx][KEY.DOMINANT_WIRELESS_PATH] = dominant_path
                data[rx][
                    KEY.DOMINANT_WIRELESS_PATH_OCCURRENCE
                ] = dominant_path_occurrence

            # derive wireless hop number and total hop number
            if dominant_wireless_hop_count and dominant_hop_count:
                data[rx][KEY.WIRELESS_HOP_COUNT] = dominant_wireless_hop_count
                data[rx][KEY.HOP_COUNT] = dominant_hop_count
            elif wireless_hop_count and hop_count:
                # no wireless hops, take the result from the first measurement
                data[rx][KEY.WIRELESS_HOP_COUNT] = wireless_hop_count[0]
                data[rx][KEY.HOP_COUNT] = hop_count[0]
            logger.info(
                "Multihop from {0} to {1}, path_num = {2}, ".format(
                    tx, rx, data[rx][KEY.WIRELESS_PATH_NUM]
                )
                + "unique_path = {0}, ".format(unique_wireless_path)
                + "wireless_hop_count = {0}".format(dominant_wireless_hop_count)
            )


def update_per_hop_latency(result):
    """
    derive per-hop latency info from ping and traceroute measurements
    """
    ping_avg = "{0}_avg".format(KEY.PING_DETAILS)
    for key in result:
        tx = key
        rxs = list(result[tx].keys())
        data = result[tx]
        for rx in rxs:
            data[rx][KEY.PER_HOP_LATENCY] = float("nan")
            if KEY.WIRELESS_HOP_COUNT in data[rx] and ping_avg in data[rx]:
                if (
                    (data[rx][KEY.WIRELESS_HOP_COUNT])
                    and (data[rx][KEY.WIRELESS_HOP_COUNT] != 0)
                    and (not isnan(data[rx][KEY.WIRELESS_HOP_COUNT]))
                ):
                    data[rx][KEY.PER_HOP_LATENCY] = (
                        data[rx][ping_avg] / data[rx][KEY.WIRELESS_HOP_COUNT]
                    )


def derive_end_to_end_path(result, topology, logger, server_ip=None):
    """
    derive the TG wireless path info from the multihop measurement
        including hop_count and wireless_hop_count
    @param result: a dictionary holds all measurements
    @param topology: topology object
    @param logger: logger object
    """
    """
    In the input result dict, measurements are stored in the following format:
        traceroute_details is a list includes multiple traceroute_output results
        traceroute_output = {
            KEY.START_TIME: startTime,
            KEY.TRACEROUTE_INFO: traceroute_info,
            KEY.TRACEROUTE_IPS: ipv6_array,
            KEY.TRACEROUTE_HOP: hop_num
        }
    """
    multihopPath = {}
    for key in result:
        tx = key
        rxs = list(result[tx].keys())
        if tx not in multihopPath:
            multihopPath[tx] = {}
        for rx in rxs:
            if rx not in multihopPath[tx]:
                multihopPath[tx][rx] = {}
                # accumulate multihop instances of traceroute measurements
                multihopPath[tx][rx][KEY.TRACEROUTE_DETAILS] = []
                multihopPath[tx][rx][KEY.NUM_VALID_ROUTE_PATHS] = 0
                logger.debug(
                    "{0}->{1}, multihop_result keys = {2}".format(
                        tx, rx, result[tx][rx].keys()
                    )
                )
                if KEY.TRACEROUTE_DETAILS in result[tx][rx]:
                    num_valid_route_path = extract_path_from_traceroute_measurements(
                        tx=tx,
                        rx=rx,
                        server_ip=server_ip,
                        topology=topology,
                        logger=logger,
                        routeDetails=result[tx][rx][KEY.TRACEROUTE_DETAILS],
                        multihopPath=multihopPath[tx][rx][KEY.TRACEROUTE_DETAILS],
                    )
                    multihopPath[tx][rx][
                        KEY.NUM_VALID_ROUTE_PATHS
                    ] = num_valid_route_path
                    logger.debug(
                        "{0}->{1}, out {2} traceroute measurements, {3} valid.".format(
                            tx,
                            rx,
                            len(result[tx][rx][KEY.TRACEROUTE_DETAILS]),
                            num_valid_route_path,
                        )
                    )
    return multihopPath


def extract_path_from_traceroute_measurements(
    tx, rx, server_ip, topology, logger, routeDetails, multihopPath
):
    # valid num of routing measurements for a given tx and rx pair
    num_valid_route_path = 0
    for item in routeDetails:
        multihopPathTemp = {
            KEY.HOP_COUNT: float("nan"),
            KEY.WIRELESS_HOP_COUNT: float("nan"),
            # list of wireless links
            KEY.WIRELESS_PATH: [],
            KEY.NODES_PATH: [],
        }
        logger.debug(
            "Extract path from traceroute, "
            + "tx = {0}, rx = {1}, hop = {2}, ips = {3}".format(
                tx, rx, item[KEY.TRACEROUTE_HOP], item[KEY.TRACEROUTE_IPS]
            )
        )
        try:
            if (
                item[KEY.TRACEROUTE_IPS] is not None
                and item[KEY.TRACEROUTE_HOP] is not None
            ):
                ips_in_path = item[KEY.TRACEROUTE_IPS]
                if tx == "vm" or tx == "pop":
                    # TODO: we may not want a fixed pop for all traffic
                    ips_in_path = [server_ip] + item[KEY.TRACEROUTE_IPS]
                else:
                    # add ip for the tx node - to ensure the 1st hop
                    ips_in_path = [topology.get_ip(tx)] + item[KEY.TRACEROUTE_IPS]
                nodes_in_path = topology.get_nodes_from_ips(ips_in_path)
                logger.debug(
                    "The path from {0} to {1} has {2}".format(tx, rx, nodes_in_path)
                )
                if (len(nodes_in_path) == 0) or (item[KEY.TRACEROUTE_HOP] == 0):
                    logger.error(
                        "The path from {0} to {1} has".format(tx, rx)
                        + "{0} nodes and {1} hops!".format(
                            nodes_in_path, item[KEY.TRACEROUTE_HOP]
                        )
                    )
                multihopPathTemp[KEY.NODES_PATH] = nodes_in_path
                multihopPathTemp[KEY.HOP_COUNT] = item[KEY.TRACEROUTE_HOP]
                multihopPathTemp[
                    KEY.WIRELESS_PATH
                ] = topology.get_wireless_hops_from_nodes(
                    multihopPathTemp[KEY.NODES_PATH]
                )
                logger.debug(
                    "{0}->{1} has ".format(tx, rx)
                    + "{0} hops and ".format(multihopPathTemp[KEY.HOP_COUNT])
                    + "wireless links {0} before validation.".format(
                        multihopPathTemp[KEY.WIRELESS_PATH]
                    )
                )
                # path has wireless links, check if the path is valid
                if len(multihopPathTemp[KEY.WIRELESS_PATH]) > 0:
                    # TODO: incase there is a *, use offline graph analysis to
                    # further validate and reconstruct
                    logger.debug(
                        "{0}->{1} has ".format(tx, rx)
                        + "wireless links {0}".format(
                            multihopPathTemp[KEY.WIRELESS_PATH]
                        )
                    )
                    isPathValid = topology.validate_wireless_path(
                        tx, rx, multihopPathTemp[KEY.WIRELESS_PATH], logger
                    )
                    logger.debug(
                        "After checking {0}->{1}, the wireless path is {2}".format(
                            tx, rx, "valid" if isPathValid else "invalid"
                        )
                    )
                    multihopPathTemp[KEY.WIRELESS_HOP_COUNT] = len(
                        multihopPathTemp[KEY.WIRELESS_PATH]
                    )
                    logger.debug(
                        "One path goes via {0}".format(
                            multihopPathTemp[KEY.WIRELESS_PATH]
                        )
                        + ", total hop = {0}, and {1} wireless hops".format(
                            multihopPathTemp[KEY.HOP_COUNT],
                            multihopPathTemp[KEY.WIRELESS_HOP_COUNT],
                        )
                    )
                    # if this path is not a valid path, skip storage
                    if not isPathValid:
                        continue
                    else:
                        # append valid multihop measurements
                        multihopPath.append(multihopPathTemp)
                        # count num of valid route path
                        num_valid_route_path += 1
                else:
                    # both sides are pop nodes
                    logger.debug(
                        "{0} is pop: {1}, and {2} is pop: {3}".format(
                            tx, topology.is_pop(tx), rx, topology.is_pop(rx)
                        )
                    )
                    if (tx in ["vm", "pop"] and topology.is_node_in_pop_site(rx)) or (
                        rx in ["vm", "pop"] and topology.is_node_in_pop_site(tx)
                    ):
                        logger.debug(
                            "{0}->{1}, both sides are connected to pop, ".format(tx, rx)
                            + "hop_count = {}".format(multihopPathTemp[KEY.HOP_COUNT])
                        )
                        if not isnan(multihopPathTemp[KEY.HOP_COUNT]):
                            # 0 wireless hop
                            multihopPathTemp[KEY.WIRELESS_HOP_COUNT] = 0
                            multihopPath.append(multihopPathTemp)
                            num_valid_route_path += 1
        except BaseException as ex:
            logger.error(
                "The path from {0} to {1} missing routing info, due to {2}".format(
                    tx, rx, ex
                )
            )
    return num_valid_route_path


def derive_link_route_num(multihopPath, topology, logger):
    """
    prepare link route number dictionary for link importance analysis
    """
    linkRoute = {}
    links = topology.get_links(isWireless=True)
    for link in links:
        aNode = topology.get_a_node(link)
        zNode = topology.get_z_node(link)
        linka2z = "link-{0}-{1}".format(aNode, zNode)
        linkz2a = "link-{0}-{1}".format(zNode, aNode)
        # init list
        linkRoute[linka2z] = {KEY.LINK_ROUTE_NUM: 0, KEY.MULTIHOP_ROUTE: []}
        linkRoute[linkz2a] = {KEY.LINK_ROUTE_NUM: 0, KEY.MULTIHOP_ROUTE: []}
    # loop over all multihop bidirectional combinations in multihopPath
    for key in multihopPath:
        tx = key
        logger.debug("tx={}, rxs={}".format(tx, multihopPath[tx]))
        data = multihopPath[tx]
        for rx in multihopPath[tx]:
            try:
                if data[rx][KEY.DOMINANT_WIRELESS_PATH] is not None:
                    # loop over the data[rx][KEY.DOMINANT_WIRELESS_PATH] list
                    # choose one with maximum occurence for link importance
                    for link in data[rx][KEY.DOMINANT_WIRELESS_PATH]:
                        # link should be in the linkRoute dictionary (topology)
                        if link in linkRoute:
                            linkRoute[link][KEY.LINK_ROUTE_NUM] += 1
                            path = "link-{0}-{1}".format(tx, rx)
                            # append the e2e multihop traffic session to linkRoute
                            linkRoute[link][KEY.MULTIHOP_ROUTE].append(path)
                            logger.debug(
                                "Successfully append {0} to {1} of {2}".format(
                                    path, KEY.LINK_ROUTE_NUM, link
                                )
                            )
                        else:
                            logger.error(
                                "In the path {0}->{1}, {2} is not in topology.".format(
                                    tx, rx, link
                                )
                            )
            except BaseException:
                logger.error(
                    "The path {0}->{1}, {2} seems to not go through TG links".format(
                        tx, rx, data[rx][KEY.DOMINANT_WIRELESS_PATH]
                    )
                )
    # check result in linkRoute
    for link in linkRoute:
        if linkRoute[link][KEY.LINK_ROUTE_NUM] > 0:
            logger.debug(
                "{0} in linkRoute, route num = {1}, multihop route = {2}".format(
                    link,
                    linkRoute[link][KEY.LINK_ROUTE_NUM],
                    linkRoute[link][KEY.MULTIHOP_ROUTE],
                )
            )
    return linkRoute


def analyze_link_importance(multihopPath, topology, logger):
    """
    derive link importance dictionary for the entire network

    @param multihopPath: routeInfo for all nodes
    @param topology: topology object
    @param logger: logger object
    """

    def format_bilink_status(myDict, myKey):
        """
        assign bidirectional link importance
        """
        # default link status is unknown
        if (
            myDict[KEY.A2Z][myKey] is KEY.STATUS_UNKNOWN
            and myDict[KEY.Z2A][myKey] is KEY.STATUS_UNKNOWN
        ):
            return
        myDict[myKey] = max(myDict[KEY.A2Z][myKey], myDict[KEY.Z2A][myKey])

    def format_unilink_status(myDict, myKey, label, stats):
        """
        assign unidirectional link importance
        """
        NAN = float("nan")
        if not stats:
            return
        myDict[myKey].update(stats)
        linkRouteNumber = KEY.LINK_ROUTE_NUM
        if isnan(myDict[myKey].get(linkRouteNumber, NAN)):
            return
        if myDict[myKey].get(linkRouteNumber, NAN) >= KEY.THRESH_NUM_ROUTE_TIER_1:
            # most important
            myDict[myKey][label] = KEY.STATUS_IMPORTANCE_TIER_1
        elif myDict[myKey].get(linkRouteNumber, NAN) >= KEY.THRESH_NUM_ROUTE_TIER_2:
            # important
            myDict[myKey][label] = KEY.STATUS_IMPORTANCE_TIER_2
        elif myDict[myKey].get(linkRouteNumber, NAN) >= KEY.THRESH_NUM_ROUTE_TIER_3:
            # less important
            myDict[myKey][label] = KEY.STATUS_IMPORTANCE_TIER_3
        else:
            # least important
            myDict[myKey][label] = KEY.STATUS_IMPORTANCE_TIER_4

    linkRoute = derive_link_route_num(multihopPath, topology, logger)
    # logger.debug("LinkRoute = {}".format(linkRoute))
    linkImportance = {}
    labelKey = KEY.LB_LINK_IMPORTANCE
    links = topology.get_links(isWireless=True)
    for link in links:
        aNode = topology.get_a_node(link)
        zNode = topology.get_z_node(link)
        linka2z = "link-{0}-{1}".format(aNode, zNode)
        linkz2a = "link-{0}-{1}".format(zNode, aNode)
        # setup default
        linkImportance[link] = {
            labelKey: KEY.STATUS_UNKNOWN,
            KEY.A2Z: {labelKey: KEY.STATUS_UNKNOWN},
            KEY.Z2A: {labelKey: KEY.STATUS_UNKNOWN},
        }
        # assign link importance for A->Z
        format_unilink_status(
            linkImportance[link], KEY.A2Z, labelKey, linkRoute.get(linka2z, {})
        )
        if linkImportance[link][KEY.A2Z].get(KEY.LINK_ROUTE_NUM, "") > 0:
            logger.info(
                "For {0}, linkRouteNumber = {1} and linkImportance = {2}".format(
                    linka2z,
                    linkRoute.get(linka2z, {}).get(KEY.LINK_ROUTE_NUM, ""),
                    linkImportance[link][KEY.A2Z].get(labelKey, ""),
                )
            )
        # assign link importance for Z->A
        format_unilink_status(
            linkImportance[link], KEY.Z2A, labelKey, linkRoute.get(linkz2a, {})
        )
        if linkImportance[link][KEY.Z2A].get(KEY.LINK_ROUTE_NUM, "") > 0:
            logger.info(
                "For {0}, linkRouteNumber = {1} and linkImportance = {2}".format(
                    linkz2a,
                    linkRoute.get(linkz2a, {}).get(KEY.LINK_ROUTE_NUM, ""),
                    linkImportance[link][KEY.Z2A].get(labelKey, ""),
                )
            )
        format_bilink_status(linkImportance[link], labelKey)
    # logger.debug("linkImportance = {}".format(linkImportance))
    return linkImportance


def get_multihop(multihopData, method="tcp", logger=None):
    """
    get reformated data from multihop_data
    """
    outputData = {}
    dataKey = KEY.TCP
    trafficKey = KEY.LB_TCP_STATUS
    if method == "udp":
        dataKey = KEY.UDP
        trafficKey = KEY.LB_UDP_STATUS
    # reformat data
    counterValid = 0
    for tx in multihopData:
        outputData[tx] = {}
        for rx in multihopData[tx]:
            outputData[tx][rx] = {}
            if dataKey in multihopData[tx][rx]:
                outputData[tx][rx] = multihopData[tx][rx][dataKey]
                counterValid += 1
    # if failed to validate, return empty
    if not counterValid:
        outputData = {}
    return outputData, trafficKey


def get_iperf_monitor(linkData, method="udp", logger=None):
    """
    get reformated data and label key
    """
    outputData = {}
    dataKey = KEY.UDP
    trafficKey = KEY.LB_UDP_STATUS
    if method == "tcp":
        dataKey = KEY.TCP
        trafficKey = KEY.LB_TCP_STATUS
    elif method == "monitor":
        dataKey = KEY.MONITOR
        trafficKey = ""
    # reformat data
    counterValid = 0
    for tx in linkData:
        outputData[tx] = {}
        for rx in linkData[tx]:
            outputData[tx][rx] = {}
            if dataKey in linkData[tx][rx]:
                outputData[tx][rx] = linkData[tx][rx][dataKey]
                counterValid += 1
    # if failed to validate, return empty
    if not counterValid:
        outputData = {}
    return outputData, trafficKey


def calc_pathloss_all(thisData):
    """
    derive path loass for all links
    """
    rssiOdsKey = "{0}.{1}".format(KEY.ODS_PHY_PRE, KEY.ODS_RSSI)
    txPwrOdsKey = KEY.ODS_STA_TX_PWR
    pathlossAll = {}
    for tx in thisData:
        pathlossAll[tx] = {}
        for rx in thisData[tx]:
            pathlossAll[tx][rx] = {KEY.PATHLOSS: []}
            # get A -> Z txPwr timeseries
            txPwrTimeSeries = thisData[tx][rx].get(txPwrOdsKey, [])
            # get Z -> A rssi timeseries
            rssiTimeSeries = thisData.get(rx, {}).get(tx, {}).get(rssiOdsKey, [])
            # align data
            allignedTxPwr, alignedRssi = align_timeseries_data(
                txPwrTimeSeries, rssiTimeSeries
            )
            # derive pathloss
            pathlossAll[tx][rx][KEY.PATHLOSS] = calc_pathloss(
                allignedTxPwr, alignedRssi
            )
            # try average if empty
            if not pathlossAll[tx][rx][KEY.PATHLOSS]:
                txPwrIdxAvg = mean([each[-1] for each in txPwrTimeSeries])
                rssiAvg = mean([each[-1] for each in rssiTimeSeries])
                pathlossAll[tx][rx][KEY.PATHLOSS] = calc_pathloss(
                    [(0, txPwrIdxAvg)], [(0, rssiAvg)]
                )
    return pathlossAll


def update_w_stats(result, thisData, topology, logger):
    """
    update stats of ODS keys in (ODS_STA + ODS_PHY + ODS_PHY + ODS_BWHAN)
    """
    allStats = []
    # stats summary - we may not need ODS_PHY moving forward
    for myKey in KEY.FW_STATS_ALL:
        coeff = 1
        renameKey = None
        if myKey == KEY.ODS_STA_PER:
            # convert PER to %
            coeff = KEY.COEFF_PER
        elif myKey == KEY.ODS_STA_TX_EFF:
            # convert tx slot efficiency to %
            coeff = 0.01
        if KEY.ODS_STA_PRE in myKey:
            renameKey = myKey.replace("{0}.".format(KEY.ODS_STA_PRE), "")
        if KEY.ODS_PHY_PRE in myKey:
            renameKey = myKey.replace("{0}.".format(KEY.ODS_PHY_PRE), "")
        if KEY.ODS_BWHAN_PRE in myKey:
            renameKey = myKey.replace("{0}.".format(KEY.ODS_BWHAN_PRE), "")
        allStats.append(
            derive_stats(
                myKey,
                thisData,
                logger,
                delay=KEY.WARM_UP_DELAY,
                coeff=coeff,
                renameKey=renameKey,
            )
        )
    # derive path loss by first aligning time and then (txPwr - rssi)
    allStats.append(
        derive_stats(KEY.PATHLOSS, calc_pathloss_all(thisData), logger, delay=0)
    )
    # update result dict
    for link in result:
        aNode = topology.get_a_node(link)
        zNode = topology.get_z_node(link)
        # get all the stats
        for myStats in allStats:
            # A -> Z
            result[link][KEY.A2Z].update(myStats.get(aNode, {}).get(zNode, {}))
            # Z -> A
            result[link][KEY.Z2A].update(myStats.get(zNode, {}).get(aNode, {}))


def update_w_mcs_label(result):
    """
    add mcs label to result
    """

    def format_node_label(labelDict, myKey, statsDict):
        """
        assign node label for mcs high/low
        """
        if not statsDict:
            return
        p90Key = KEY.ODS_STA_MCS.replace("{}.".format(KEY.ODS_STA_PRE), "") + "_p90"
        avgKey = KEY.ODS_STA_MCS.replace("{}.".format(KEY.ODS_STA_PRE), "") + "_avg"
        if statsDict[myKey].get(p90Key, -1) > KEY.THRESH_MCS_GOAL:
            labelDict[myKey][KEY.LB_MCS] = KEY.STATUS_MCS_OK
        elif statsDict[myKey].get(avgKey, -1) > KEY.THRESH_MCS_GOAL:
            labelDict[myKey][KEY.LB_MCS] = KEY.STATUS_MCS_LOW_OCCASION
        elif statsDict[myKey].get(avgKey, -1) > 0:
            labelDict[myKey][KEY.LB_MCS] = KEY.STATUS_MCS_LOW

    def format_link_label(labelDict, statsDict):
        """
        assign link label for mcs high/low/mismatch
        """
        if (
            not statsDict
            or labelDict[KEY.A2Z][KEY.LB_MCS] is KEY.STATUS_UNKNOWN
            or labelDict[KEY.Z2A][KEY.LB_MCS] is KEY.STATUS_UNKNOWN
        ):
            return
        # assign the worst mcs status from both sector
        labelDict[KEY.LB_MCS] = max(
            labelDict[KEY.A2Z][KEY.LB_MCS], labelDict[KEY.Z2A][KEY.LB_MCS]
        )
        # append new status with mcs matching or not
        avgKey = KEY.ODS_STA_MCS.replace("{}.".format(KEY.ODS_STA_PRE), "") + "_avg"
        a2zMCSAvg = statsDict[KEY.A2Z].get(avgKey, -1)
        z2aMCSAvg = statsDict[KEY.Z2A].get(avgKey, -1)
        if (
            a2zMCSAvg > -1
            and z2aMCSAvg > -1
            and abs(a2zMCSAvg - z2aMCSAvg) > KEY.THRESH_MCS_DIFF
        ):
            labelDict[KEY.LB_MCS] += KEY.STATUS_MCS_MISMATCH

    result2 = {}
    for link in result:
        # setup default
        result2[link] = {
            KEY.LB_MCS: KEY.STATUS_UNKNOWN,
            KEY.A2Z: {KEY.LB_MCS: KEY.STATUS_UNKNOWN},
            KEY.Z2A: {KEY.LB_MCS: KEY.STATUS_UNKNOWN},
        }
        # assign label
        format_node_label(result2[link], KEY.A2Z, result[link])
        format_node_label(result2[link], KEY.Z2A, result[link])
        format_link_label(result2[link], result[link])
    # put results back in dict result
    update_nested_dict(result, result2)


def update_w_txpower_label(result):
    """
    add txpower label to result
    """

    def format_link_label(labelDict, statsDict):
        """
        assign link label for txpower mismatch
        """
        if not statsDict:
            return
        avgKey = KEY.ODS_STA_TX_PWR.replace("{}.".format(KEY.ODS_STA_PRE), "") + "_avg"
        a2zTxPwrAvg = statsDict[KEY.A2Z].get(avgKey, float("nan"))
        z2aTxPwrAvg = statsDict[KEY.Z2A].get(avgKey, float("nan"))
        if isnan(a2zTxPwrAvg) or isnan(z2aTxPwrAvg):
            return
        if abs(a2zTxPwrAvg - z2aTxPwrAvg) > KEY.THRESH_POWER_INTERF:
            labelDict[KEY.LB_POWER] = KEY.STATUS_POWER_MISMATCH
        elif abs(a2zTxPwrAvg - z2aTxPwrAvg) < KEY.THRESH_POWER_INTERF:
            labelDict[KEY.LB_POWER] = KEY.STATUS_POWER_MATCH

    result2 = {}
    for link in result:
        # setup default
        result2[link] = {KEY.LB_POWER: KEY.STATUS_UNKNOWN}
        # assign label
        format_link_label(result2[link], result[link])
    # put results back in dict result
    update_nested_dict(result, result2)


def update_w_foliage_label(result):
    """
    perform foliage analysis and update it to result
    """

    def get_potential_label(a2zStd, z2aStd, threshold_sev, threshold_med, labelList):
        """
        based on std and threshold, give potential label
        """
        if a2zStd > threshold_sev and z2aStd > threshold_sev:
            labelList.append(KEY.STATUS_FOLIAGE)
        elif a2zStd > threshold_med and z2aStd > threshold_med:
            labelList.append(KEY.STATUS_FOLIAGE_LIKELY)
        elif a2zStd > -1 and z2aStd > -1:
            labelList.append(KEY.STATUS_NON_FOLIAGE)

    def format_link_label(labelDict, statsDict):
        """
        assign link label for foliage

        use majority vote for results over rssi, snr, txpower
        """
        if not statsDict:
            return
        potentialLabels = []
        get_potential_label(
            statsDict[KEY.A2Z].get(KEY.ODS_RSSI + "_std", -1),
            statsDict[KEY.Z2A].get(KEY.ODS_RSSI + "_std", -1),
            KEY.THRESH_FOLIAGE_STD_RSSI,
            KEY.THRESH_FOLIAGE_LIKELY_STD_RSSI,
            potentialLabels,
        )
        get_potential_label(
            statsDict[KEY.A2Z].get(KEY.ODS_SNR + "_std", -1),
            statsDict[KEY.Z2A].get(KEY.ODS_SNR + "_std", -1),
            KEY.THRESH_FOLIAGE_STD_SNR,
            KEY.THRESH_FOLIAGE_LIKELY_STD_SNR,
            potentialLabels,
        )
        txPwrIdxKey = (
            KEY.ODS_STA_TX_PWR.replace("{}.".format(KEY.ODS_STA_PRE), "") + "_std"
        )
        get_potential_label(
            statsDict[KEY.A2Z].get(txPwrIdxKey, -1),
            statsDict[KEY.Z2A].get(txPwrIdxKey, -1),
            KEY.THRESH_FOLIAGE_STD_TXPWRIDX,
            KEY.THRESH_FOLIAGE_LIKELY_STD_TXPWRIDX,
            potentialLabels,
        )
        get_potential_label(
            statsDict[KEY.A2Z].get(KEY.PATHLOSS + "_std", -1),
            statsDict[KEY.Z2A].get(KEY.PATHLOSS + "_std", -1),
            KEY.THRESH_FOLIAGE_STD_PLOSS,
            KEY.THRESH_FOLIAGE_LIKELY_STD_PLOSS,
            potentialLabels,
        )
        if potentialLabels:
            labelDict[KEY.LB_FOLIAGE] = int(max(potentialLabels))

    result2 = {}
    for link in result:
        # setup default
        result2[link] = {KEY.LB_FOLIAGE: KEY.STATUS_UNKNOWN}
        # assign label
        format_link_label(result2[link], result[link])
    update_nested_dict(result, result2)


def tx_to_rx_compare(txStats, txStatKey, rxStats, rxStatKey):
    """
    compare from tx to rx stats
    """
    LARGER = 3
    EQUAL = 2
    SMALLER = 1
    UNKNOWN = -1
    if txStatKey is None or rxStatKey is None:
        txStat = txStats
        rxStat = rxStats
    else:
        txStatKey = txStatKey.replace("{}.".format(KEY.ODS_STA_PRE), "") + "_avg"
        txStat = txStats.get(txStatKey, float("nan"))
        rxStatKey = rxStatKey.replace("{}.".format(KEY.ODS_STA_PRE), "") + "_avg"
        rxStat = rxStats.get(rxStatKey, float("nan"))
    if not isnan(txStat) and not isnan(rxStat):
        # this threshold shall be stat type dependent.
        # TODO: decide different threshold levels for different stats
        # 2% margin
        threshold = txStat * KEY.THRESH_TXSTAT_MARGIN
        if abs(txStat - rxStat) < threshold:
            return EQUAL, txStat, rxStat
        elif txStat > rxStat + threshold:
            return LARGER, txStat, rxStat
        elif txStat < rxStat - threshold:
            return SMALLER, txStat, rxStat
    return UNKNOWN, txStat, rxStat


def update_w_link_directional_label(result):
    """
    perform link directional analysis and update it to result
    """
    LARGER = 3
    EQUAL = 2
    SMALLER = 1

    def get_directional_label(
        txRxOk, txRxFail, txRxTotal, txRxPpdu, txRxBa, txFailAvg, rxFailAvg
    ):
        """
        conditional check to assign label

        TODO: double validate the label here
        """
        label = KEY.STATUS_UNKNOWN
        if (
            txRxOk is EQUAL
            and txRxBa is EQUAL
            and (
                txRxPpdu is LARGER
                or (txRxFail is EQUAL and rxFailAvg > KEY.THRESH_STAT_TXRX_FAIL)
                or (txRxFail is LARGER and txFailAvg > KEY.THRESH_STAT_TXRX_FAIL)
            )
        ):
            label = KEY.STATUS_DATA_LOSS
        elif (
            txRxOk is SMALLER
            and txRxTotal is EQUAL
            and txRxPpdu is EQUAL
            and (txRxBa is LARGER or txRxBa is EQUAL)
            and txRxFail is LARGER
            and rxFailAvg > KEY.THRESH_STAT_TXRX_FAIL
        ):
            label = KEY.STATUS_BA_LOSS
        elif (
            txRxOk is SMALLER
            and txRxFail is LARGER
            and (txRxTotal is EQUAL or txRxTotal is LARGER)
            and (txRxBa is LARGER or txRxBa is EQUAL)
            and (txRxPpdu is LARGER or txRxPpdu is EQUAL)
        ):
            label = KEY.STATUS_DATA_BA_LOSS
        elif (
            txRxOk is EQUAL
            and txRxTotal is EQUAL
            and txRxPpdu is EQUAL
            and txRxBa is EQUAL
            and (
                txRxFail is EQUAL
                or (txRxFail is LARGER and txFailAvg < KEY.THRESH_STAT_TXRX_FAIL)
            )
        ):
            label = KEY.STATUS_NO_LOSS
        return label

    def format_unilink_label(labelDict, aKey, zKey, statsDict):
        """
        assign directional link label
        """
        if not statsDict:
            return
        txRxOkFlag, txOkNum, rxOkNum = tx_to_rx_compare(
            statsDict[aKey], KEY.ODS_STA_TX_OK, statsDict[zKey], KEY.ODS_STA_RX_OK
        )
        txRxFailFlag, txFailNum, rxFailNum = tx_to_rx_compare(
            statsDict[aKey], KEY.ODS_STA_TX_FAIL, statsDict[zKey], KEY.ODS_STA_RX_FAIL
        )
        txRxTotalFlag, _, _ = tx_to_rx_compare(
            txOkNum + txFailNum, None, rxOkNum + rxFailNum, None
        )
        txRxPpduFlag, _, _ = tx_to_rx_compare(
            statsDict[aKey], KEY.ODS_STA_TX_PPDU, statsDict[zKey], KEY.ODS_STA_RX_PPDU
        )
        txRxBaFlag, _, _ = tx_to_rx_compare(
            statsDict[aKey], KEY.ODS_STA_TX_BA, statsDict[zKey], KEY.ODS_STA_RX_BA
        )
        labelDict[aKey][KEY.LB_LINK] = get_directional_label(
            txRxOkFlag,
            txRxFailFlag,
            txRxTotalFlag,
            txRxPpduFlag,
            txRxBaFlag,
            txFailNum,
            rxFailNum,
        )

    def format_bilink_label(labelDict):
        """
        assign link label
        """
        if (
            labelDict[KEY.A2Z][KEY.LB_LINK] is KEY.STATUS_UNKNOWN
            or labelDict[KEY.Z2A][KEY.LB_LINK] is KEY.STATUS_UNKNOWN
        ):
            return
        # assign the worst link status from both directional analysis
        labelDict[KEY.LB_LINK] = max(
            labelDict[KEY.A2Z][KEY.LB_LINK], labelDict[KEY.Z2A][KEY.LB_LINK]
        )

    result2 = {}
    for link in result:
        # setup default
        result2[link] = {
            KEY.LB_LINK: KEY.STATUS_UNKNOWN,
            KEY.A2Z: {KEY.LB_LINK: KEY.STATUS_UNKNOWN},
            KEY.Z2A: {KEY.LB_LINK: KEY.STATUS_UNKNOWN},
        }
        # assign label
        format_unilink_label(result2[link], KEY.A2Z, KEY.Z2A, result[link])
        format_unilink_label(result2[link], KEY.Z2A, KEY.A2Z, result[link])
        format_bilink_label(result2[link])
    # put results back in dict result
    update_nested_dict(result, result2)


def update_w_interference_net_label(result):
    """
    perform interference analysis on network level and update it to result
    """

    def format_link_and_node_label(labelDict, statsDict):
        """
        assign link label for interference
        """
        if not statsDict:
            return
        a2zSnrStd = statsDict[KEY.A2Z].get(KEY.ODS_SNR + "_std", -1)
        z2aSnrStd = statsDict[KEY.Z2A].get(KEY.ODS_SNR + "_std", -1)
        if a2zSnrStd is -1 or z2aSnrStd is -1:
            return
        if a2zSnrStd > z2aSnrStd + KEY.THRESH_INTERF_SNR_STD_DIFF:
            labelDict[KEY.A2Z][KEY.LB_INTERF_NET] = KEY.STATUS_INTERF
            labelDict[KEY.Z2A][KEY.LB_INTERF_NET] = KEY.STATUS_NO_INTERF
            labelDict[KEY.LB_INTERF_NET] = KEY.STATUS_INTERF
        elif z2aSnrStd > a2zSnrStd + KEY.THRESH_INTERF_SNR_STD_DIFF:
            labelDict[KEY.Z2A][KEY.LB_INTERF_NET] = KEY.STATUS_INTERF
            labelDict[KEY.A2Z][KEY.LB_INTERF_NET] = KEY.STATUS_NO_INTERF
            labelDict[KEY.LB_INTERF_NET] = KEY.STATUS_INTERF

    result2 = {}
    for link in result:
        # setup default
        result2[link] = {
            KEY.LB_INTERF_NET: KEY.STATUS_UNKNOWN,
            KEY.A2Z: {KEY.LB_INTERF_NET: KEY.STATUS_UNKNOWN},
            KEY.Z2A: {KEY.LB_INTERF_NET: KEY.STATUS_UNKNOWN},
        }
        # assign label
        format_link_and_node_label(result2[link], result[link])
    update_nested_dict(result, result2)


def format_unilink_status_link_test(
    myDict, keyName, label, stats, rate, distance, args
):
    """
    assign unidirectional link status
    """
    NAN = float("nan")
    if not stats:
        return
    myDict[keyName].update(stats)
    thrptAvg = KEY.IPERF_DETAILS + "_avg"
    mcsP90 = KEY.ODS_STA_MCS.replace(KEY.ODS_STA_PRE + ".", "") + "_p90"
    perAvg = KEY.ODS_STA_PER.replace(KEY.ODS_STA_PRE + ".", "") + "_avg"
    # custom network-specific threshold
    custom_thresholds = args.get("custom", {}).get(
        "format_unilink_status_link_test", False
    )
    if custom_thresholds:
        MCSThreshExcellentShortLink = custom_thresholds.get("THRESH_IPERF_MCS_EXCEL_S")
        MCSThreshOkayShortLink = custom_thresholds.get("THRESH_IPERF_MCS_OKAY_S")
        MCSThreshWarningShortLink = custom_thresholds.get("THRESH_IPERF_MCS_WARN_S")
    else:
        MCSThreshExcellentShortLink = KEY.THRESH_IPERF_MCS_EXCEL_S
        MCSThreshOkayShortLink = KEY.THRESH_IPERF_MCS_OKAY_S
        MCSThreshWarningShortLink = KEY.THRESH_IPERF_MCS_WARN_S
    if (
        isnan(myDict[keyName].get(thrptAvg, NAN))
        or isnan(myDict[keyName].get(mcsP90, NAN))
        or isnan(myDict[keyName].get(perAvg, NAN))
    ):
        return
    if (
        myDict[keyName].get(thrptAvg, NAN) >= KEY.THRESH_IPERF_EXCELLENT * rate
        and myDict[keyName].get(perAvg, NAN) < KEY.THRESH_IPERF_PER_EXCEL
        and (
            (
                myDict[keyName].get(mcsP90, NAN) >= KEY.THRESH_IPERF_MCS_EXCEL_L
                and distance > KEY.THRESH_DIST_LONG
            )
            or (
                distance <= KEY.THRESH_DIST_LONG
                and myDict[keyName].get(mcsP90, NAN) >= MCSThreshExcellentShortLink
            )
        )
    ):
        myDict[keyName][label] = KEY.STATUS_EXCELLENT
    elif (
        myDict[keyName].get(thrptAvg, NAN) >= KEY.THRESH_IPERF_OKAY * rate
        and myDict[keyName].get(perAvg, NAN) < KEY.THRESH_IPERF_PER_OKAY
        and (
            (
                myDict[keyName].get(mcsP90, NAN) >= KEY.THRESH_IPERF_MCS_OKAY_L
                and distance > KEY.THRESH_DIST_LONG
            )
            or (
                distance <= KEY.THRESH_DIST_LONG
                and myDict[keyName].get(mcsP90, NAN) >= MCSThreshOkayShortLink
            )
        )
    ):
        myDict[keyName][label] = KEY.STATUS_HEALTHY
    elif (
        myDict[keyName].get(thrptAvg, NAN) >= KEY.THRESH_IPERF_WARNING * rate
        and myDict[keyName].get(perAvg, NAN) < KEY.THRESH_IPERF_PER_WARN
        and (
            (
                myDict[keyName].get(mcsP90, NAN) >= KEY.THRESH_IPERF_MCS_WARN_L
                and distance > KEY.THRESH_DIST_LONG
            )
            or (
                distance <= KEY.THRESH_DIST_LONG
                and myDict[keyName].get(mcsP90, NAN) >= MCSThreshWarningShortLink
            )
        )
    ):
        myDict[keyName][label] = KEY.STATUS_WARNING
    elif myDict[keyName].get(thrptAvg, NAN) > KEY.THRESH_IPERF_WORST * rate:
        myDict[keyName][label] = KEY.STATUS_BAD_OCCASION


def format_unilink_status_multihop(myDict, keyName, label, stats, rate):
    """
    assign unidirectional status for multihop performance
    """
    NAN = float("nan")
    if not stats:
        return
    myDict[keyName].update(stats)
    thrptAvg = KEY.IPERF_DETAILS + "_avg"
    latencyAvg = KEY.PER_HOP_LATENCY
    if isnan(myDict[keyName].get(thrptAvg, NAN)):
        return
    if (
        myDict[keyName].get(thrptAvg, NAN) >= KEY.THRESH_IPERF_EXCELLENT * rate
        and myDict[keyName].get(latencyAvg, NAN) <= KEY.THRESH_PER_HOP_LATENCY_EXCELLENT
    ):
        # excellent
        myDict[keyName][label] = KEY.STATUS_EXCELLENT
    elif (
        myDict[keyName].get(thrptAvg, NAN) >= KEY.THRESH_IPERF_OKAY * rate
        and myDict[keyName].get(latencyAvg, NAN) <= KEY.THRESH_PER_HOP_LATENCY_HEALTHY
    ):
        # healthy
        myDict[keyName][label] = KEY.STATUS_HEALTHY
    elif (
        myDict[keyName].get(thrptAvg, NAN) >= KEY.THRESH_IPERF_WARNING * rate
        and myDict[keyName].get(latencyAvg, NAN) <= KEY.THRESH_PER_HOP_LATENCY_WARNING
    ):
        # marginal
        myDict[keyName][label] = KEY.STATUS_WARNING
    else:
        # warning
        myDict[keyName][label] = KEY.STATUS_BAD_OCCASION


def analyze_iperf(data, udp=False, args=None, p2mp_time_slot_links=None):
    """
    analyze iperf data for a set of stats:
        throughput, foliage, interference,
    @param data: Data() object from util_data_loader
    """

    def format_bilink_status(myDict, myKey):
        """
        assign bidirectional link status
        """
        # default link status is unknown
        if (
            myDict[KEY.A2Z][myKey] is KEY.STATUS_UNKNOWN
            or myDict[KEY.Z2A][myKey] is KEY.STATUS_UNKNOWN
        ):
            return
        myDict[myKey] = max(myDict[KEY.A2Z][myKey], myDict[KEY.Z2A][myKey])

    # load data
    linkData = data.get_iperf_data()
    method = "udp" if udp else "tcp"
    iperfPingData, labelKey = get_iperf_monitor(
        linkData=linkData, method=method, logger=data.logger
    )
    thrptStats = derive_stats(
        KEY.IPERF_DETAILS, iperfPingData, data.logger, delay=KEY.WARM_UP_DELAY
    )
    # multihop: data parsing for ping6
    pingStats = derive_stats(
        KEY.PING_DETAILS, iperfPingData, data.logger, delay=KEY.WARM_UP_DELAY
    )
    # derive target rate
    thrptStats = extract_special_stats(
        KEY.TARGET_BITRATE, iperfPingData, thrptStats, data.logger
    )
    if method == "tcp":
        thrptStats = extract_special_stats(
            KEY.IPERF_TCP_RETRANS, iperfPingData, thrptStats, data.logger
        )
    pingStats = extract_special_stats(
        KEY.PING_LOSS, iperfPingData, pingStats, data.logger
    )
    data.logger.debug("In analyze_iperf, pingStats = {0}".format(pingStats))
    linkIperfPing = {}
    linkIperfPing = update_nested_dict(thrptStats, pingStats)
    # start analysis for each link
    result = {}
    links = (
        data.topology.get_links(isWireless=True)
        if not p2mp_time_slot_links
        else p2mp_time_slot_links
    )

    for link in links:
        # get a and z nodes
        aNode = data.topology.get_a_node(link)
        zNode = data.topology.get_z_node(link)
        # get dashboard
        linkDashboard = ""
        if args.get("custom", {}).get("create_dashboard_link", False):
            linkDashboard = get_link_log_url(
                data.topology.get_mac(aNode),
                data.topology.get_mac(zNode),
                iperfPingData.get(aNode, {})
                .get(zNode, {})
                .get(KEY.IPERF_START, int(time.time()) - 450)
                - 300,
                iperfPingData.get(aNode, {})
                .get(zNode, {})
                .get(KEY.IPERF_END, int(time.time()) - 50)
                + 300,
            )
        # setup default
        # when KEY.IPERF_START and KEY.IPERF_END do not exist
        # we assume the iperf is done from 450 sec ago to 50 sec ago
        result[link] = {
            labelKey: KEY.STATUS_UNKNOWN,
            KEY.A2Z: {labelKey: KEY.STATUS_UNKNOWN},
            KEY.Z2A: {labelKey: KEY.STATUS_UNKNOWN},
            KEY.DISTANCE: data.topology.get_distance(aNode, zNode),
            KEY.DASHBOARD: linkDashboard,
            KEY.DOF: max(
                len(data.topology.get_linked_sector(aNode)),
                len(data.topology.get_linked_sector(zNode)),
            ),
        }
    # update stats
    update_w_stats(result, iperfPingData, data.topology, data.logger)
    # add more labels
    update_w_mcs_label(result)
    update_w_txpower_label(result)
    update_w_foliage_label(result)
    update_w_link_directional_label(result)
    update_w_interference_net_label(result)
    # determine iperf status in the end
    for link in links:
        # get a and z nodes
        aNode = data.topology.get_a_node(link)
        zNode = data.topology.get_z_node(link)
        # get target rates
        target_rate_a2z = (
            linkIperfPing.get(aNode, {}).get(zNode, {}).get(KEY.TARGET_BITRATE)
        )
        target_rate_z2a = (
            linkIperfPing.get(zNode, {}).get(aNode, {}).get(KEY.TARGET_BITRATE)
        )
        data.logger.debug(
            "For link {0}, target_rate_z2a = {1}, target_rate_a2z = {2}".format(
                link, target_rate_a2z, target_rate_z2a
            )
        )
        # assign stats
        format_unilink_status_link_test(
            result[link],
            KEY.A2Z,
            labelKey,
            linkIperfPing.get(aNode, {}).get(zNode, {}),
            float(convert_rate(target_rate_a2z, data.logger)),
            result[link][KEY.DISTANCE],
            args,
        )
        format_unilink_status_link_test(
            result[link],
            KEY.Z2A,
            labelKey,
            linkIperfPing.get(zNode, {}).get(aNode, {}),
            float(convert_rate(target_rate_z2a, data.logger)),
            result[link][KEY.DISTANCE],
            args,
        )
        format_bilink_status(result[link], labelKey)
    return result


def analyze_monitoring(data):
    """
    analyze data from monitoring mode
    @param data: Data() object from util_data_loader
    """

    def format_unilink_label(result):
        """
        assign uni-directional link label for monitoring status
        """
        if not result:
            return
        p90Key = KEY.ODS_STA_MCS.replace("{}.".format(KEY.ODS_STA_PRE), "") + "_p90"
        if result.get(p90Key, -1) >= KEY.THRESH_MON_MCS_EXCEL:
            result[KEY.LB_MON_STATUS] = KEY.STATUS_EXCELLENT
        elif result.get(p90Key, -1) >= KEY.THRESH_MON_MCS_OKAY:
            result[KEY.LB_MON_STATUS] = KEY.STATUS_HEALTHY
        elif result.get(p90Key, -1) >= KEY.THRESH_MON_MCS_WARN:
            result[KEY.LB_MON_STATUS] = KEY.STATUS_WARNING
        elif result.get(p90Key, -1) >= KEY.THRESH_MON_MCS_BADO:
            result[KEY.LB_MON_STATUS] = KEY.STATUS_BAD_OCCASION
        elif result.get(p90Key, -1) >= KEY.THRESH_MON_MCS_BADC:
            result[KEY.LB_MON_STATUS] = KEY.STATUS_BAD_CONSTANT

    def format_bilink_label(result):
        """
        assign bidirectional link label for monitoring status
        """
        if (
            not result
            or result[KEY.A2Z][KEY.LB_MON_STATUS] is KEY.STATUS_UNKNOWN
            or result[KEY.Z2A][KEY.LB_MON_STATUS] is KEY.STATUS_UNKNOWN
        ):
            return
        # assign the worst monitoring status from both sector
        result[KEY.LB_MON_STATUS] = max(
            [result[KEY.A2Z][KEY.LB_MON_STATUS], result[KEY.Z2A][KEY.LB_MON_STATUS]]
        )

    # load data
    monitorData = data.get_monitor_data()
    monitorData, _ = get_iperf_monitor(
        linkData=monitorData, method="monitor", logger=data.logger
    )
    # start analysis for each link
    result = {}
    links = data.topology.get_links(isWireless=True)
    for link in links:
        # get a and z nodes
        aNode = data.topology.get_a_node(link)
        zNode = data.topology.get_z_node(link)
        # setup default
        result[link] = {
            KEY.LB_MON_STATUS: KEY.STATUS_UNKNOWN,
            KEY.A2Z: {KEY.LB_MON_STATUS: KEY.STATUS_UNKNOWN},
            KEY.Z2A: {KEY.LB_MON_STATUS: KEY.STATUS_UNKNOWN},
            KEY.DISTANCE: data.topology.get_distance(aNode, zNode),
        }
    # update stats
    update_w_stats(result, monitorData, data.topology, data.logger)
    # add more labels
    update_w_mcs_label(result)
    update_w_txpower_label(result)
    update_w_foliage_label(result)
    update_w_link_directional_label(result)
    update_w_interference_net_label(result)
    # post update monitoring status
    for link in links:
        # assign stats
        format_unilink_label(result[link][KEY.A2Z])
        format_unilink_label(result[link][KEY.Z2A])
        format_bilink_label(result[link])
    return result


def _monitoring_classification(result, logger):
    """
    determine link healthiness based on MCS criteria
    """
    key_of_status = "monitor"
    for tx__rx in result:
        if result[tx__rx][KEY.MCS_P90] < 0:
            result[tx__rx][key_of_status] = KEY.STATUS_UNKNOWN
        elif (result[tx__rx][KEY.MCS_P90] >= 2) and (
            (result[tx__rx][KEY.MCS_P90] <= 5)
        ):
            result[tx__rx][key_of_status] = KEY.STATUS_BAD_OCCASION
        elif (result[tx__rx][KEY.MCS_P90] >= 6) and (
            (result[tx__rx][KEY.MCS_P90] <= 7)
        ):
            result[tx__rx][key_of_status] = KEY.STATUS_WARNING
        elif result[tx__rx][KEY.MCS_P90] == 8:
            result[tx__rx][key_of_status] = KEY.STATUS_HEALTHY
        elif result[tx__rx][KEY.MCS_P90] >= 9:
            result[tx__rx][key_of_status] = KEY.STATUS_EXCELLENT


def link_directional_analysis(data, result, udp=False, monitor=False):
    """
    analyze forward data transmission and backward BA transmission
    """
    # get stats from tx side - node a and rx side - node z
    txRxStats = analyze_tx_rx_stats(data, udp, monitor)
    # analyze outliers
    for tx__rx in txRxStats:
        tx, rx = tx__rx.split("__")
        link_tmp = txRxStats[tx__rx]
        # prepare txTotal and rxTotal
        if (link_tmp["txOkAvgA"] == "nan") or (link_tmp["txFailAvgA"] == "nan"):
            continue
        else:
            link_tmp["txTotalAvgA"] = link_tmp["txOkAvgA"] + link_tmp["txFailAvgA"]
        if (link_tmp["rxOkAvgZ"] == "nan") or (link_tmp["rxFailAvgZ"] == "nan"):
            continue
        else:
            link_tmp["rxTotalAvgZ"] = link_tmp["rxOkAvgZ"] + link_tmp["rxFailAvgZ"]

        # txOk - rxOk analysis
        txRxOkayFlag = tx_rx_compare(link_tmp["txOkAvgA"], link_tmp["rxOkAvgZ"])
        # txFail - rxFail analysis
        txRxFailFlag = tx_rx_compare(link_tmp["txFailAvgA"], link_tmp["rxFailAvgZ"])
        # txTotal - rxTotal analysis
        txRxTotalFlag = tx_rx_compare(link_tmp["txTotalAvgA"], link_tmp["rxTotalAvgZ"])
        rxPlcpFailFlag = link_tmp["rxPlcpFailAvgZ"] > 0
        # txPpdu - rxPpdu analysis
        txRxPpduFlag = tx_rx_compare(link_tmp["txPpduAvgA"], link_tmp["rxPpduAvgZ"])
        # txBa - rxBa analysis
        txRxBaFlag = tx_rx_compare(link_tmp["txBaAvgZ"], link_tmp["rxBaAvgA"])
        link_tmp[KEY.LB_LINK] = link_status_decision(
            tx__rx,
            txRxOkayFlag,
            txRxFailFlag,
            txRxTotalFlag,
            txRxPpduFlag,
            txRxBaFlag,
            rxPlcpFailFlag,
            link_tmp["txFailAvgA"],
            link_tmp["rxFailAvgZ"],
        )
    for tx__rx in txRxStats:
        txRxStats_update = {
            key: txRxStats[tx__rx][key]
            for key in txRxStats[tx__rx]
            if not (key == KEY.IPERF_PER_AVG)
        }
        if result and (tx__rx in result):
            result[tx__rx].update(txRxStats_update)
        # when result is empty
        else:
            result[tx__rx] = txRxStats_update
    return txRxStats


def link_status_decision(
    link,
    txRxOkay,
    txRxFail,
    txRxTotal,
    txRxPpdu,
    txRxBa,
    rxPlcpFail,
    txFailAvgA,
    rxFailAvgZ,
):
    # we compare rxFail with 5 mpdu per second
    rxFailThreshold = 5
    if (
        (txRxOkay == UNKNOWN)
        or (txRxTotal == UNKNOWN)
        or (txRxPpdu == UNKNOWN)
        or (txRxBa == UNKNOWN)
        or (txRxFail == UNKNOWN)
    ):
        link_status = KEY.STATUS_UNKNOWN
    else:
        if (
            (txRxOkay == EQUAL)
            and (txRxBa == EQUAL)
            and (
                (txRxPpdu == LARGER)
                or (
                    (txRxFail == EQUAL and rxFailAvgZ > rxFailThreshold)
                    or (txRxFail == LARGER and txFailAvgA > rxFailThreshold)
                )
            )
        ):
            link_status = KEY.STATUS_DATA_LOSS
        elif (
            (txRxOkay == SMALLER)
            and (txRxTotal == EQUAL)
            and (txRxPpdu == EQUAL)
            and (txRxBa == LARGER or txRxBa == EQUAL)
            and ((txRxFail == LARGER) and (rxFailAvgZ < rxFailThreshold))
        ):
            link_status = KEY.STATUS_BA_LOSS
        elif (
            (txRxOkay == SMALLER)
            and (txRxFail == LARGER)
            and (txRxTotal == LARGER or txRxTotal == EQUAL)
            and (txRxBa == LARGER or txRxBa == EQUAL)
            and (txRxPpdu == LARGER or txRxPpdu == EQUAL)
        ):
            link_status = KEY.STATUS_DATA_BA_LOSS
        elif (
            (txRxOkay == EQUAL)
            and (txRxTotal == EQUAL)
            and (txRxPpdu == EQUAL)
            and (txRxBa == EQUAL)
            and (
                (txRxFail == EQUAL)
                or (txRxFail == LARGER and txFailAvgA < rxFailThreshold)
            )
        ):
            link_status = KEY.STATUS_NO_LOSS
        else:
            link_status = KEY.STATUS_UNKNOWN
    return link_status


def tx_rx_compare(txStats, rxStats):
    txRxFlag = UNKNOWN
    if (txStats != "nan") and (rxStats != "nan"):
        # this threshold shall be stat type dependent.
        # TODO: decide different threshold levels for different stats
        # 2% margin
        threshold = txStats * 0.02
        if (txStats == rxStats) or (
            (txStats < (rxStats + threshold)) and (txStats > (rxStats - threshold))
        ):
            txRxFlag = EQUAL
        elif txStats > (rxStats + threshold):
            txRxFlag = LARGER
        elif txStats < (rxStats - threshold):
            txRxFlag = SMALLER
    return txRxFlag


def tx_stats_update(link, link_stats, key, value, logger):
    if key == KEY.ODS_STA_TX_OK:
        link_stats[link]["txOkAvgA"] = round(mean(value))
        link_stats[link]["txOkStdA"] = std(value)
    elif key == KEY.ODS_STA_TX_FAIL:
        link_stats[link]["txFailAvgA"] = round(mean(value))
        if link_stats[link]["txFailAvgA"] > 5:
            tx_fail_msg = "link={}, txFail={}".format(link, value)
            logger.debug(tx_fail_msg)
        link_stats[link]["txFailStdA"] = std(value)
    elif key == KEY.ODS_STA_TX_PPDU:
        link_stats[link]["txPpduAvgA"] = round(mean(value))
        link_stats[link]["txPpduStdA"] = std(value)
    elif key == KEY.ODS_STA_TX_EFF:
        # covert to 0.01% -> x%
        link_stats[link]["txEffAvgA"] = mean(np.array(value) * 0.01)
        link_stats[link]["txEffStdA"] = std(np.array(value) * 0.01)
        logger.debug(
            "link {0}, txEffAvgA = {1}, length = {2}".format(
                link, link_stats[link]["txEffAvgA"], len(value)
            )
        )
    elif key == KEY.ODS_STA_RX_BA:
        link_stats[link]["rxBaAvgA"] = round(mean(value))
        link_stats[link]["rxBaStdA"] = std(value)


def rx_stats_update(link, link_stats, key, value, logger):
    if key == KEY.ODS_STA_RX_OK:
        link_stats[link]["rxOkAvgZ"] = round(mean(value))
        link_stats[link]["rxOkStdZ"] = std(value)
    if key == KEY.ODS_STA_RX_FAIL:
        link_stats[link]["rxFailAvgZ"] = round(mean(value))
        link_stats[link]["rxFailStdZ"] = std(value)
        if link_stats[link]["rxFailAvgZ"] > 5:
            rx_fail_msg = "link={}, rxFail={}".format(link, value)
            logger.debug(rx_fail_msg)
    if key == KEY.ODS_STA_RX_PLCP:
        link_stats[link]["rxPlcpFailAvgZ"] = round(mean(value))
        link_stats[link]["rxPlcpFailStdZ"] = std(value)
    if key == KEY.ODS_STA_RX_PPDU:
        link_stats[link]["rxPpduAvgZ"] = round(mean(value))
        link_stats[link]["rxPpduStdZ"] = std(value)
    if key == KEY.ODS_STA_TX_BA:
        link_stats[link]["txBaAvgZ"] = round(mean(value))
        link_stats[link]["txBaStdZ"] = std(value)


def analyze_tx_rx_stats(resultData, udp=False, monitor=False):
    key_to_use = derive_key(monitor, udp)
    if monitor:
        data = resultData.get_monitor_data()
    else:
        data = resultData.get_iperf_data()
    link_stats = {}
    # reformat data
    for node_a in data:
        for node_z in data[node_a]:
            resultData.logger.debug(data[node_a][node_z])
            if key_to_use in data[node_a][node_z]:
                node_a_z = "{0}__{1}".format(node_a, node_z)
                link_stats[node_a_z] = link_stats_init()
                _derive_PER(data[node_a][node_z], resultData.logger)
                tx_data = data[node_a][node_z][key_to_use]
                link_stats[node_a_z][KEY.IPERF_PER_AVG] = tx_data[KEY.IPERF_PER_AVG]
                # stats from tx side of the link
                for tx_key in KEY.KEYS_TX_TRAN_INFO:
                    if tx_key in tx_data:
                        tx_value = tx_data[tx_key]
                        tx_value = [float(x[1]) for x in tx_data[tx_key]]
                        if len(tx_value) == 0:
                            continue
                        tx_key_process_msg = "node_a={}, node_z={}, tx_key={}, ".format(
                            node_a, node_z, tx_key
                        ) + "numSamples={}, mean={:5.3f}".format(
                            len(tx_value), mean(tx_value)
                        )
                        resultData.logger.debug(tx_key_process_msg)
                        tx_stats_update(
                            node_a_z, link_stats, tx_key, tx_value, resultData.logger
                        )
                # stats from rx side of the link
                if (node_z not in data) or (node_a not in data[node_z]):
                    error_msg = "For link {0} - {1}, ".format(node_a, node_z)
                    error_msg += "Packet stats for {0} are available, ".format(node_a)
                    error_msg += "Packet stats for {0} are un-available.".format(node_z)
                    resultData.logger.debug(error_msg)
                else:
                    if key_to_use in data[node_z][node_a]:
                        rx_data = data[node_z][node_a][key_to_use]
                        for rx_key in KEY.KEYS_RX_DIFF:
                            if rx_key in rx_data:
                                rx_value = rx_data[rx_key]
                                rx_value = [float(x[1]) for x in rx_data[rx_key]]
                                rx_key_process_msg = (
                                    "node_a={0}, node_z={1}, ".format(node_a, node_z)
                                    + "rx_key={0}, numSamples={1}, ".format(
                                        rx_key, len(rx_value)
                                    )
                                    + "mean={0:5.3f}".format(mean(rx_value))
                                )
                                resultData.logger.debug(rx_key_process_msg)
                                if len(rx_data) == 0:
                                    continue
                                rx_stats_update(
                                    node_a_z,
                                    link_stats,
                                    rx_key,
                                    rx_value,
                                    resultData.logger,
                                )
    resultData.logger.debug(link_stats)
    return link_stats


def derive_key(monitor, udp):
    if monitor:
        key_to_use = "monitor"
    else:
        key_to_use = "tcp"
        if udp:
            key_to_use = "udp"
    return key_to_use


def link_stats_init():
    link_stats = {
        KEY.LB_LINK: KEY.STATUS_UNKNOWN,
        KEY.IPERF_PER_AVG: "nan",
        "txOkAvgA": "nan",
        "txokStdA": "nan",
        "txFailAvgA": "nan",
        "txFailStdA": "nan",
        "rxBaAvgA": "nan",
        "rxBaStdA": "nan",
        "txPpduAvgA": "nan",
        "txPpduStdA": "nan",
        "rxOkAvgZ": "nan",
        "rxokStdZ": "nan",
        "rxFailAvgZ": "nan",
        "rxFailStdZ": "nan",
        "rxPlcpFailAvgZ": "nan",
        "rxPlcpFailStdZ": "nan",
        "txBaAvgZ": "nan",
        "txBaStdZ": "nan",
        "rxPpduAvgZ": "nan",
        "rxPpduStdZ": "nan",
        "txTotalAvgA": "nan",
        "rxTotalAvgZ": "nan",
        "txEffAvgA": "nan",
        "txEffStdA": "nan",
    }
    return link_stats


def compute_relative_pathloss(txPower, rssi, link, direction, pathloss, logger):
    """
    This function computes relative pathloss for one direction of one link
        based on: RSSI(dB) - txPower(dB)
    @param txPower: tx power index from fw_stats
    @param rssi: rssi value from fw_stats
    @param link: link information, node_a_z
    @param direction: direction of the link, A->Z or Z->A
    @param pathloss: list to store calculated pathloss avg and std values
    """
    if direction == "A->Z":
        txPowerIndex = "txPowerA"
        rxRssiIndex = "rssiZ"
        rxRssiAvg = "rssiAvgZ"
        txPowerIndexAvg = "txPowerAvgA"
    else:
        txPowerIndex = "txPowerZ"
        rxRssiIndex = "rssiA"
        rxRssiAvg = "rssiAvgA"
        txPowerIndexAvg = "txPowerAvgZ"

    txPowerTimeSeries = txPower[link][txPowerIndex]
    rssiTimeSeries = rssi[link][rxRssiIndex]
    txPower_time = list(txPowerTimeSeries.keys())
    rssi_time = list(rssiTimeSeries.keys())
    # find the start/end of the aligned rssi/txPower measurements
    t_start = min([min(txPower_time), min(rssi_time)])
    t_end = max([max(txPower_time), max(rssi_time)])
    pathloss_time = []
    pathloss_value = []
    size = t_end - t_start
    logger.debug(
        "Computing path-loss for link={}, {}, ".format(link, direction)
        + "size={}, ".format(size)
        + "t_start={}, t_end={}".format(t_start, t_end)
    )
    tx_power_size = max(txPower_time) - min(txPower_time)
    logger.debug(
        "txPower for link={}, direction {}, ".format(link, direction)
        + "size={}".format(tx_power_size)
    )
    rssi_size = max(rssi_time) - min(rssi_time)
    logger.debug(
        "rssi for link={}, direction {}, ".format(link, direction)
        + "size={}".format(rssi_size)
    )
    # duration shall not be more than 1 hour
    if (size > 3600) or (rssi_size > 3600) or (tx_power_size > 3600):
        if link not in pathloss:
            pathloss[link] = {}
        pathloss[link][direction] = {}
        pathloss[link][direction + " Avg"] = "nan"
        pathloss[link][direction + " Std"] = "nan"
        return False
    for t in range(t_start, t_end):
        logger.debug("t={}, t_start={}, t_end={}".format(t, t_start, t_end))
        logger.debug(
            "txPower={}, rssi={}".format(
                (t in txPowerTimeSeries), (t in rssiTimeSeries)
            )
        )
        if t not in txPowerTimeSeries or t not in rssiTimeSeries:
            continue
        pathloss_time.append(t)
        txPower_temp = translate_tx_power(txPowerTimeSeries[t])
        pathloss_temp = txPower_temp - rssiTimeSeries[t]
        pathloss_value.append(pathloss_temp)
        logger.debug(
            "t={}, txPower={}, txPower={}, rssi={}".format(
                t, txPowerTimeSeries[t], txPower_temp, rssiTimeSeries[t]
            )
            + ", pathloss={}".format(pathloss_temp)
        )
    if link not in pathloss:
        pathloss[link] = {}
    pathloss[link][direction] = dict(zip(pathloss_time, pathloss_value))
    # if time series of rssi and time series of txPower have no overlap
    # we directly use avg rssi and avg txPower to compute path-loss
    logger.debug("pathloss_value={}, ".format(pathloss_value))
    pathloss[link][direction + " Avg"] = mean(pathloss_value)
    pathloss[link][direction + " STD"] = std(pathloss_value)
    if len(pathloss_value) is 0:
        txPowerAvg = txPower[link][txPowerIndexAvg]
        rssiAvg = rssi[link][rxRssiAvg]
        txPowerAvg = translate_tx_power(txPowerAvg)
        pathlossAvg = txPowerAvg - rssiAvg
        pathloss[link][direction + " Avg"] = pathlossAvg
    logger.debug(
        "Link {}, {}, ".format(link, direction)
        + "pathloss avg={}".format(mean(pathloss_value))
        + ", pathloss std={}".format(pathloss[link][direction + " STD"])
    )


def relative_pathloss_calc(rssi, txPower, logger):
    """
    This function obtains relative pathloss for all links,
        relies on compute_relative_pathloss function
    @param txPower: tx power index from fw_stats
    @param rssi: rssi value from fw_stats
    """
    pathloss = {}
    for link in rssi:
        if link not in txPower:
            logger.info(
                "In relative_pathloss_calc, txpower[{}] does not exist".format(link)
            )
            continue
        # calculate pathloss for A->Z link:
        if "rssiZ" in rssi[link] and "txPowerA" in txPower[link]:
            compute_relative_pathloss(txPower, rssi, link, "A->Z", pathloss, logger)
        # calculate pathloss for Z->A link:
        if "rssiA" in rssi[link] and "txPowerZ" in txPower[link]:
            compute_relative_pathloss(txPower, rssi, link, "Z->A", pathloss, logger)
    return pathloss


def analyze_relative_pathloss(relative_pathloss, result, link, direction, logger):
    """
    This function analyzes relative pathloss for one direction of one link
        by comparing the pathloss value with PATH_LOSS_STD_THRESH
    @param relative_pathloss: tx power index from fw_stats
    @param result: data structure to store all stats,
        i.e. snr, rssi, txPower, pathloss
    @param link: link information, node_a_z
    @param direction: direction of the link, A->Z or Z->A
    """
    pathloss_direction = False
    if link in relative_pathloss:
        pathloss = relative_pathloss[link]
        direction_avg = direction + " Avg"
        direction_std = direction + " STD"
        if direction_avg in pathloss:
            # check if this changes are restored in result or not
            if direction_avg in pathloss:
                result[link][direction_avg] = pathloss[direction_avg]
            else:
                result[link][direction_avg] = "nan"
            if direction_std in pathloss:
                result[link][direction_std] = pathloss[direction_std]
            else:
                result[link][direction_std] = "nan"
        else:
            logger.debug(
                "link {}, direction {} pathloss missing".format(link, direction)
            )
        if result[link][direction_std] != "nan":
            pathloss_direction = (
                pathloss[direction_std] >= PATH_LOSS_STD_FOLIAGE_LIKELY_THRESH
            )
            if pathloss_direction is True:
                logger.debug(
                    "link {}, direction {}".format(link, direction)
                    + ", pathloss variation larger than threshold"
                )
        return pathloss_direction


# Foliage link based on SNR/RSSI/txPower at both sides
def foliage_pathloss_analysis(resultData, result, udp=False, monitor=False):
    rssiResult = analyze_stats(resultData, "rssi", udp, monitor)
    snrResult = analyze_stats(resultData, "snr", udp, monitor)
    txPower = analyze_stats(resultData, "txPower", udp, monitor)
    mcsResult = analyze_stats(resultData, "mcs", udp, monitor)
    relative_pathloss = relative_pathloss_calc(rssiResult, txPower, resultData.logger)
    for node_a_z in relative_pathloss:
        if ("Z->A" in relative_pathloss[node_a_z]) and (
            "A->Z" in relative_pathloss[node_a_z]
        ):
            msg = "node_a_z={} pathloss, A->Z size={}, Z->A size={}".format(
                node_a_z,
                len(relative_pathloss[node_a_z]["A->Z"]),
                len(relative_pathloss[node_a_z]["Z->A"]),
            )
            resultData.logger.debug(msg)
        else:
            msg = (
                "node_a_z={} pathloss, ".format(node_a_z)
                + "no full results from both A->Z and Z->A."
            )
            resultData.logger.debug(msg)
    raw_result = {}
    for node_a_z in rssiResult:
        raw_result[node_a_z] = {
            KEY.LB_FOLIAGE: KEY.STATUS_UNKNOWN,
            KEY.LB_MCS: KEY.STATUS_UNKNOWN,
            "rssiStdA": rssiResult[node_a_z]["rssiStdA"],
            "rssiStdZ": rssiResult[node_a_z]["rssiStdZ"],
            "rssiAvgA": rssiResult[node_a_z]["rssiAvgA"],
            "rssiAvgZ": rssiResult[node_a_z]["rssiAvgZ"],
            "snrStdA": "nan",
            "snrStdZ": "nan",
            "snrAvgA": "nan",
            "snrAvgZ": "nan",
            "txPowerStdA": "nan",
            "txPowerStdZ": "nan",
            "txPowerAvgA": "nan",
            "txPowerAvgZ": "nan",
            "mcsAvgA": -1,
            "mcsAvgZ": -1,
            "mcsP90A": -1,
            "mcsP90Z": -1,
            "Z->A Avg": "nan",
            "Z->A STD": "nan",
            "A->Z Avg": "nan",
            "A->Z STD": "nan",
        }
        if (
            (node_a_z in mcsResult)
            and (mcsResult[node_a_z]["mcsAvgA"] != "nan")
            and (mcsResult[node_a_z]["mcsAvgZ"] != "nan")
        ):
            mcsAvgA = mcsResult[node_a_z]["mcsAvgA"]
            mcsAvgZ = mcsResult[node_a_z]["mcsAvgZ"]
            mcsP90A = mcsResult[node_a_z]["mcsP90A"]
            mcsP90Z = mcsResult[node_a_z]["mcsP90Z"]

            raw_result[node_a_z]["mcsAvgA"] = mcsAvgA
            raw_result[node_a_z]["mcsAvgZ"] = mcsAvgZ
            raw_result[node_a_z]["mcsP90A"] = math.floor(mcsP90A)
            raw_result[node_a_z]["mcsP90Z"] = math.floor(mcsP90Z)
            if (mcsAvgA > mcsAvgZ + MCS_DIFF_THRESH) or (
                mcsAvgZ > mcsAvgA + MCS_DIFF_THRESH
            ):
                raw_result[node_a_z][KEY.LB_MCS] = KEY.STATUS_MCS_MISMATCH
            elif (mcsAvgA < MCS_TARGET) or (mcsAvgZ < MCS_TARGET):
                resultData.logger.debug(
                    "link {}, mcs_a={}, mcs_z={}, mcs_p90_a={}, mcs_p90_z={}".format(
                        node_a_z, mcsAvgA, mcsAvgZ, mcsP90A, mcsP90Z
                    )
                )
                raw_result[node_a_z][KEY.LB_MCS] = KEY.STATUS_MCS_LOW
            else:
                raw_result[node_a_z][KEY.LB_MCS] = KEY.STATUS_MCS_MATCH

        if (node_a_z not in snrResult) or (node_a_z not in txPower):
            msg = "For link {}, ".format(node_a_z)
            msg += "rssi is available, but snr or txPower is missing."
            resultData.logger.debug(msg)
            if (rssiResult[node_a_z]["rssiStdA"] == "nan") and (
                rssiResult[node_a_z]["rssiStdZ"] == "nan"
            ):
                continue
            rssiStdNodeA = float(rssiResult[node_a_z]["rssiStdA"])
            rssiStdNodeZ = float(rssiResult[node_a_z]["rssiStdZ"])
            rssiA = rssiStdNodeA > RSSI_STD_FOLIAGE_LIKELY_THRESH_DB
            rssiZ = rssiStdNodeZ > RSSI_STD_FOLIAGE_LIKELY_THRESH_DB
            if rssiA and rssiZ:
                raw_result[node_a_z][KEY.LB_FOLIAGE] = KEY.STATUS_FOLIAGE_LIKELY
            else:
                raw_result[node_a_z][KEY.LB_FOLIAGE] = KEY.STATUS_NON_FOLIAGE
        else:
            if (
                rssiResult[node_a_z]["rssiStdA"] == "nan"
                or rssiResult[node_a_z]["rssiStdZ"] == "nan"
                or snrResult[node_a_z]["snrStdA"] == "nan"
                or snrResult[node_a_z]["snrStdZ"] == "nan"
                or txPower[node_a_z]["txPowerStdA"] == "nan"
                or txPower[node_a_z]["txPowerStdZ"] == "nan"
            ):
                continue
            rssiStdNodeA = float(rssiResult[node_a_z]["rssiStdA"])
            rssiStdNodeZ = float(rssiResult[node_a_z]["rssiStdZ"])
            rssiA_foliage_likely = rssiStdNodeA >= RSSI_STD_FOLIAGE_LIKELY_THRESH_DB
            rssiZ_foliage_likely = rssiStdNodeZ >= RSSI_STD_FOLIAGE_LIKELY_THRESH_DB
            raw_result[node_a_z]["snrStdA"] = snrResult[node_a_z]["snrStdA"]
            raw_result[node_a_z]["snrStdZ"] = snrResult[node_a_z]["snrStdZ"]
            raw_result[node_a_z]["snrAvgA"] = snrResult[node_a_z]["snrAvgA"]
            raw_result[node_a_z]["snrAvgZ"] = snrResult[node_a_z]["snrAvgZ"]
            snrStdNodeA = float(snrResult[node_a_z]["snrStdA"])
            snrStdNodeZ = float(snrResult[node_a_z]["snrStdZ"])
            snrA_foliage_likely = snrStdNodeA >= SNR_STD_FOLIAGE_LIKELY_THRESH
            snrZ_foliage_likely = snrStdNodeZ >= SNR_STD_FOLIAGE_LIKELY_THRESH
            # txPower
            raw_result[node_a_z]["txPowerStdA"] = txPower[node_a_z]["txPowerStdA"]
            raw_result[node_a_z]["txPowerStdZ"] = txPower[node_a_z]["txPowerStdZ"]
            raw_result[node_a_z]["txPowerAvgA"] = txPower[node_a_z]["txPowerAvgA"]
            raw_result[node_a_z]["txPowerAvgZ"] = txPower[node_a_z]["txPowerAvgZ"]
            txPowerStdA = float(txPower[node_a_z]["txPowerStdA"])
            txPowerStdZ = float(txPower[node_a_z]["txPowerStdZ"])
            txPowerA_foliage_likely = txPowerStdA > TX_POWER_STD_FOLIAGE_LIKELY_THRESH
            txPowerZ_foliage_likely = txPowerStdZ > TX_POWER_STD_FOLIAGE_LIKELY_THRESH

            pathloss_foliage_likely_A_Z = analyze_relative_pathloss(
                relative_pathloss, raw_result, node_a_z, "A->Z", resultData.logger
            )
            pathloss_foliage_likely_Z_A = analyze_relative_pathloss(
                relative_pathloss, raw_result, node_a_z, "Z->A", resultData.logger
            )
            if (
                (pathloss_foliage_likely_A_Z and pathloss_foliage_likely_Z_A)
                or (rssiA_foliage_likely and rssiZ_foliage_likely)
                or (snrA_foliage_likely and snrZ_foliage_likely)
                or (txPowerA_foliage_likely and txPowerZ_foliage_likely)
            ):
                raw_result[node_a_z][KEY.LB_FOLIAGE] = KEY.STATUS_FOLIAGE_LIKELY
                rssiA_foliage = rssiStdNodeA >= RSSI_STD_FOLIAGE_THRESH_DB
                rssiZ_foliage = rssiStdNodeZ >= RSSI_STD_FOLIAGE_THRESH_DB
                snrA_foliage = snrStdNodeA >= SNR_STD_FOLIAGE_THRESH
                snrZ_foliage = snrStdNodeZ >= SNR_STD_FOLIAGE_THRESH
                if (rssiA_foliage and rssiZ_foliage) or (snrA_foliage and snrZ_foliage):
                    raw_result[node_a_z][KEY.LB_FOLIAGE] = KEY.STATUS_FOLIAGE
            else:
                raw_result[node_a_z][KEY.LB_FOLIAGE] = KEY.STATUS_NON_FOLIAGE
    foliage_pathloss_result_update(raw_result, result)
    return raw_result


def foliage_pathloss_result_update(raw_result, result):
    for node_a_z in raw_result:
        node_a, node_z = node_a_z.split("__")
        stats_a_to_z = {
            KEY.LB_FOLIAGE: raw_result[node_a_z][KEY.LB_FOLIAGE],
            KEY.LB_MCS: raw_result[node_a_z][KEY.LB_MCS],
            "rssiAvg": raw_result[node_a_z]["rssiAvgZ"],
            "snrAvg": raw_result[node_a_z]["snrAvgZ"],
            "rssiStd": raw_result[node_a_z]["rssiStdZ"],
            "snrStd": raw_result[node_a_z]["snrStdZ"],
            "txPowerAvg": raw_result[node_a_z]["txPowerAvgA"],
            "txPowerStd": raw_result[node_a_z]["txPowerStdA"],
            "pathlossAvg": raw_result[node_a_z]["A->Z Avg"],
            "pathlossStd": raw_result[node_a_z]["A->Z STD"],
            "mcsAvg_full": raw_result[node_a_z]["mcsAvgZ"],
            "mcs_p90_full": raw_result[node_a_z]["mcsP90Z"],
        }
        if result and (node_a_z in result):
            result[node_a_z].update(stats_a_to_z)
        # when result is empty
        else:
            result[node_a_z] = stats_a_to_z
        stats_z_to_a = {
            KEY.LB_FOLIAGE: raw_result[node_a_z][KEY.LB_FOLIAGE],
            KEY.LB_MCS: raw_result[node_a_z][KEY.LB_MCS],
            "rssiAvg": raw_result[node_a_z]["rssiAvgA"],
            "snrAvg": raw_result[node_a_z]["snrAvgA"],
            "rssiStd": raw_result[node_a_z]["rssiStdA"],
            "snrStd": raw_result[node_a_z]["snrStdA"],
            "txPowerAvg": raw_result[node_a_z]["txPowerAvgZ"],
            "txPowerStd": raw_result[node_a_z]["txPowerStdZ"],
            "pathlossAvg": raw_result[node_a_z]["Z->A Avg"],
            "pathlossStd": raw_result[node_a_z]["Z->A STD"],
            "mcsAvg_full": raw_result[node_a_z]["mcsAvgA"],
            "mcs_p90_full": raw_result[node_a_z]["mcsP90A"],
        }
        node_z_a = "{0}__{1}".format(node_z, node_a)
        if result and (node_z_a in result):
            result[node_z_a].update(stats_z_to_a)
        else:
            result[node_z_a] = stats_z_to_a


def interference_detection(result, foliage_pathloss_result):
    path_result = foliage_pathloss_result
    raw_result = {}
    for node_a_z in path_result:
        # snrResult
        path_result_temp = path_result[node_a_z]
        raw_result[node_a_z] = {
            KEY.LB_FOLIAGE: path_result_temp[KEY.LB_FOLIAGE],
            KEY.LB_INTERF: KEY.STATUS_UNKNOWN,
            KEY.LB_POWER: KEY.STATUS_UNKNOWN,
            "snrStdA": path_result_temp["snrStdA"],
            "snrStdZ": path_result_temp["snrStdZ"],
            "snrAvgA": path_result_temp["snrAvgA"],
            "snrAvgZ": path_result_temp["snrAvgZ"],
            "txPowerStdA": path_result_temp["txPowerStdA"],
            "txPowerStdZ": path_result_temp["txPowerStdZ"],
            "txPowerAvgA": path_result_temp["txPowerAvgA"],
            "txPowerAvgZ": path_result_temp["txPowerAvgZ"],
        }
        snrStdA = path_result_temp["snrStdA"]
        snrStdZ = path_result_temp["snrStdZ"]
        txPowerAvgA = path_result_temp["txPowerAvgA"]
        txPowerAvgZ = path_result_temp["txPowerAvgZ"]
        # check Power imbalance
        # txPower_avg (A) > txPower_avg (Z) + TX_POWER_INTERF_THRESH
        if (txPowerAvgA != "nan") and (txPowerAvgZ != "nan"):
            if txPowerAvgA > txPowerAvgZ + KEY.THRESH_POWER_INTERF:
                raw_result[node_a_z][KEY.LB_POWER] = KEY.STATUS_POWER_MISMATCH_A
            elif txPowerAvgZ > txPowerAvgA + KEY.THRESH_POWER_INTERF:
                raw_result[node_a_z][KEY.LB_POWER] = KEY.STATUS_POWER_MISMATCH_Z
            else:
                raw_result[node_a_z][KEY.LB_POWER] = KEY.STATUS_POWER_MATCH
        # check imbalance of SNR variations
        # SNR_std (A) < SNR_std (Z) + SNR_STD_INTERF_THRESH
        # link is not a foliage link
        if path_result_temp[KEY.LB_FOLIAGE] != KEY.STATUS_FOLIAGE:
            if (snrStdA != "nan") and (snrStdZ != "nan"):
                if snrStdA > snrStdZ + SNR_STD_INTERF_THRESH:
                    raw_result[node_a_z][KEY.LB_INTERF] = KEY.STATUS_INTERF_A
                elif snrStdZ > snrStdA + SNR_STD_INTERF_THRESH:
                    raw_result[node_a_z][KEY.LB_INTERF] = KEY.STATUS_INTERF_Z
                else:
                    raw_result[node_a_z][KEY.LB_INTERF] = KEY.STATUS_NO_INTERF
    interference_result_update(raw_result, result)
    return raw_result


def interference_result_update(raw_result, result):
    for node_a_z in raw_result:
        node_a, node_z = node_a_z.split("__")
        stats_a_to_z = {
            KEY.LB_INTERF: raw_result[node_a_z][KEY.LB_INTERF],
            KEY.LB_POWER: raw_result[node_a_z][KEY.LB_POWER],
        }
        if stats_a_to_z[KEY.LB_INTERF] is KEY.STATUS_INTERF_Z:
            stats_a_to_z[KEY.LB_INTERF] = KEY.STATUS_INTERF
        else:
            stats_a_to_z[KEY.LB_INTERF] = KEY.STATUS_NO_INTERF
        if result and (node_a_z in result):
            result[node_a_z].update(stats_a_to_z)
        # when result is empty
        else:
            result[node_a_z] = stats_a_to_z
        stats_z_to_a = {
            KEY.LB_INTERF: raw_result[node_a_z][KEY.LB_INTERF],
            KEY.LB_POWER: raw_result[node_a_z][KEY.LB_POWER],
        }
        if stats_z_to_a[KEY.LB_INTERF] is KEY.STATUS_INTERF_A:
            stats_z_to_a[KEY.LB_INTERF] = KEY.STATUS_INTERF
        else:
            stats_z_to_a[KEY.LB_INTERF] = KEY.STATUS_NO_INTERF
        node_z_a = "{0}__{1}".format(node_z, node_a)
        if node_z_a in result:
            result[node_z_a].update(stats_z_to_a)
        # when result is empty
        else:
            result[node_z_a] = stats_z_to_a


def prepare_time_series(timeSeries):
    """
    This function separates timeSeries - a list of key-value pairs
        into a list which contains value samples
        and a list which contains time samples in second
    """
    # float conversion is needed for python 2.7
    val = [float(x[1]) for x in timeSeries]
    time = [x[0] for x in timeSeries]
    time = [int(round(x / US_IN_SECOND)) for x in time]
    return (time, val)


def prepare_stats(resultData, key, stats_key, traffic_key, monitor):
    if monitor:
        data = resultData.get_monitor_data()
    else:
        data = resultData.get_iperf_data()
    result = {}
    for node_a in data:
        for node_z in data[node_a]:
            if traffic_key in data[node_a][node_z]:
                node_z_a = "{0}__{1}".format(node_z, node_a)
                node_a_z = "{0}__{1}".format(node_a, node_z)
                if node_z_a not in result:
                    result[node_a_z] = {
                        key + "AvgA": "nan",
                        key + "StdA": "nan",
                        key + "P90A": "nan",
                        key + "MinA": "nan",
                        key + "MaxA": "nan",
                        key + "AvgZ": "nan",
                        key + "StdZ": "nan",
                        key + "P90Z": "nan",
                        key + "MinZ": "nan",
                        key + "MaxZ": "nan",
                    }
                    if stats_key in data[node_a][node_z][traffic_key]:
                        a_time, a_val = prepare_time_series(
                            data[node_a][node_z][traffic_key][stats_key]
                        )
                        if len(a_val) == 0:
                            continue
                        node_a_z = "{0}__{1}".format(node_a, node_z)
                        resultData.logger.debug(
                            "node_a={}, node_z={}, {}_a_sample={}".format(
                                node_a, node_z, key, len(a_val)
                            )
                            + ", mean={:5.3f}, avg_time(s)={:7.0f}".format(
                                mean(a_val), round(mean(a_time))
                            )
                        )
                        result[node_a_z][key + "AvgA"] = mean(a_val)
                        result[node_a_z][key + "StdA"] = std(a_val)
                        result[node_a_z][key + "MinA"] = min(a_val)
                        result[node_a_z][key + "MaxA"] = max(a_val)
                        result[node_a_z][key + "P90A"] = percentiles(a_val, 10)
                        result[node_a_z][key + "A"] = dict(zip(a_time, a_val))
                    else:
                        continue
                    # stats missing for reverse direction: report error
                    if (
                        (node_z not in data)
                        or (node_a not in data[node_z])
                        or (traffic_key not in data[node_z][node_a])
                        or (stats_key not in data[node_z][node_a][traffic_key])
                    ):
                        error_msg = "For link {0} - {1}, ".format(node_a, node_z)
                        error_msg += "stats for {} are available, ".format(node_a)
                        error_msg += "stats for {} are un-available.".format(node_z)
                        resultData.logger.debug(error_msg)
                    else:
                        z_time, z_val = prepare_time_series(
                            data[node_z][node_a][traffic_key][stats_key]
                        )
                        if len(z_val) == 0:
                            continue
                        resultData.logger.debug(
                            "node_a={}, node_z={}, {}_z_sample={}".format(
                                node_a, node_z, key, len(z_val)
                            )
                            + ", mean={:5.3f}, avg_time(s)={:7.0f}".format(
                                mean(z_val), round(mean(z_time))
                            )
                        )
                        result[node_a_z][key + "AvgZ"] = mean(z_val)
                        result[node_a_z][key + "StdZ"] = std(z_val)
                        result[node_a_z][key + "MinZ"] = min(z_val)
                        result[node_a_z][key + "MaxZ"] = max(z_val)
                        result[node_a_z][key + "P90Z"] = percentiles(z_val, 10)
                        result[node_a_z][key + "Z"] = dict(zip(z_time, z_val))
                else:
                    msg = "For link {0} - {1}, ".format(node_a, node_z)
                    msg += "stats already included in rssiResult[{}]".format(node_z_a)
                    resultData.logger.debug(msg)
    return result


def analyze_stats(resultData, stats, udp=False, monitor=False):
    """
    analyze stats and derive avg and std for each link: a -> z, z -> a
    @param data: Data() object from util_data_loader
    """
    if monitor:
        key_to_use = "monitor"
    else:
        key_to_use = "tcp"
        if udp:
            key_to_use = "udp"

    if stats == "rssi":
        stats_key = "{0}.{1}".format(KEY.ODS_PHY_PRE, KEY.ODS_RSSI)
    elif stats == "snr":
        stats_key = "{0}.{1}".format(KEY.ODS_PHY_PRE, KEY.ODS_SNR)
    elif stats == "mcs":
        stats_key = "{0}.{1}".format(KEY.ODS_PHY_DATA_PRE, KEY.ODS_RX_MCS)
    elif stats == "txPower":
        stats_key = KEY.ODS_STA_TX_PWR
    result = prepare_stats(resultData, stats, stats_key, key_to_use, monitor)
    return result


def analyze(fieldname, myData, misc=None):
    """
    wrapper for each analysis function
    """
    if fieldname == "box_alignment":
        return analyze_alignment(myData)
    elif fieldname == "interference":
        if len(misc) > 2:
            return analyze_interference(misc[0], myData.topology, misc[1], misc[2])
        else:
            return analyze_interference(misc[0], myData.topology, misc[1])
    elif fieldname == "monitoring":
        return analyze_monitoring(myData)
    elif fieldname in ["iperf_p2p", "iperf_p2mp"]:
        return analyze_iperf(
            myData, udp=(misc[0] == "udp"), args=misc[1], p2mp_time_slot_links=misc[2]
        )
    elif fieldname == "ping_p2p":
        return analyze_ping(myData, for_sa=False)
    elif fieldname == "ping_sa":
        return analyze_ping(myData, for_sa=True)
    elif fieldname == "iperf_multihop":
        multihopResult, linkImportanceResult = analyze_multihop(
            myData, tcp=(misc[0] == "tcp"), bitrate=misc[1], server_ip=misc[2]
        )
        return multihopResult, linkImportanceResult
    elif fieldname == "connectivity":
        num_micro_routes, num_macro_routes, result = analyze_connectivity_graph(
            myData, target=misc
        )
        myData.logger.note("# of micro routes found: {0}".format(num_micro_routes))
        myData.logger.note("# of macro routes found: {0}".format(num_macro_routes))
        return result
    elif fieldname == "reciprocal_im":
        return analyze_reciprocal_im(myData)
    return {}


def print_analysis(fieldname, myresult):
    """
    print the result to screen
    """
    printout_analysis(fieldname, myresult)
