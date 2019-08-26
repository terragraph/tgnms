#!/usr/bin/env python3

# built-ins

# modules
import modules.keywords as KEY
from modules.util_math import euclidean, get_histogram, index2deg, mean, mode, std


# global variables
ODS_STA_MCS = KEY.ODS_STA_MCS.replace(KEY.ODS_STA_PRE + ".", "")
ODS_STA_PER = KEY.ODS_STA_PER.replace(KEY.ODS_STA_PRE + ".", "")
ODS_STA_TX_PWR = KEY.ODS_STA_TX_PWR.replace(KEY.ODS_STA_PRE + ".", "")
ODS_BWHAN_TX_SLOT_PERC = KEY.ODS_BWHAN_TX_SLOT_PERC.replace(KEY.ODS_BWHAN_PRE + ".", "")
ODS_BWHAN_RX_SLOT_PERC = KEY.ODS_BWHAN_RX_SLOT_PERC.replace(KEY.ODS_BWHAN_PRE + ".", "")
TX_UTIL_RATIO = KEY.ODS_STA_TX_EFF.replace(KEY.ODS_STA_PRE + ".", "")


"""
Overview related
"""


def skip_decision(key, result):
    """
    decide whether we shall skip if status is unknown
    """
    if "lb_" in key and result.get(key, None) == KEY.STATUS_UNKNOWN:
        return True
    return False


def removeOldLinks(latestLinks, overview):
    """
    remove the old links from overview based on given links in topology
    @param latestLinks: list, derived from topology (wireless links only)
    @param overview: dict, previous latest overview
    """
    for link in overview.keys():
        if link not in latestLinks:
            overview.pop(link, {})


def label_interference(resultdict, overallINR):
    """
    label the interference based on the overallINR
    """
    if overallINR <= KEY.THRESH_NO_INTERF:
        resultdict[KEY.LB_INTERF] = KEY.STATUS_NO_INTERF
    elif overallINR <= KEY.THRESH_WEAK_INTERF:
        resultdict[KEY.LB_INTERF] = KEY.STATUS_WEAK_INTERF
    elif overallINR <= KEY.THRESH_VERYSTRONG_INTERF:
        resultdict[KEY.LB_INTERF] = KEY.STATUS_STRONG_INTERF
    else:
        # if label is unknown, then do not touch
        if skip_decision(KEY.LB_INTERF, resultdict):
            return
        resultdict[KEY.LB_INTERF] = KEY.STATUS_UNKNOWN


def extract_interference_im(overview, topology, analysis):
    """
    extract key (cared) data from interference analysis (idle) for summary purpose
    @param overview: dict, previous overview
    @param topology: Topology() object
    @param analysis: dict, (it does NOT follow general analysis format)
    """

    def take_inr_from(fromNode, toNode, key, overview, analysis):
        """
        uni-directional connectivity assignment
        """
        inrKey = "{0}__{1}".format(fromNode, toNode)
        if analysis.get(inrKey, {}):
            for interferer, inr, __inrtowards in analysis[inrKey][1]:
                overview[link][key][KEY.INTERFERS].append((interferer, inr))
            # count total number of interferers
            overview[link][key][KEY.INTERFERS + "_len"] = len(
                overview[link][key][KEY.INTERFERS]
            )
            # label the unidirectional link by checking overall INR
            label_interference(overview[link][key], analysis[inrKey][0])

    # skip if empty analysis
    if not analysis:
        return
    # go through current links in topology
    latestLinks = topology.get_links(isWireless=True)
    # go through links in topology
    for link in latestLinks:
        if link not in overview:
            overview[link] = {}
        aNode = topology.get_a_node(link)
        zNode = topology.get_z_node(link)
        # reset the inteferer info
        # (we do not do time-series as here we only care about snapshot result)
        for unikey in [KEY.A2Z, KEY.Z2A]:
            if unikey not in overview[link]:
                overview[link][unikey] = {}
            overview[link][unikey][KEY.INTERFERS] = []
        # add the uni-directional connectivity info from the latest snapshot
        take_inr_from(aNode, zNode, KEY.Z2A, overview, analysis)
        take_inr_from(zNode, aNode, KEY.A2Z, overview, analysis)


def extract_connectivity(overview, topology, analysis):
    """
    extract key (cared) data from connectivity analysis for summary purpose
    @param overview: dict, previous overview
    @param topology: Topology() object
    @param analysis: dict, (it does NOT follow general analysis format)
    """

    def take_connectivity_from(link, fromNode, toNode, key, overview, analysis):
        """
        uni-directional connectivity assignment
        """
        if analysis.get(fromNode, {}):
            for towardsNode in analysis[fromNode]:
                # skip if this is the desired link and no micro-routes
                if towardsNode == toNode and len(analysis[fromNode][toNode]) is 1:
                    continue
                overview[link][key][KEY.CONNECTIVITY][towardsNode] = analysis[fromNode][
                    towardsNode
                ]
                if towardsNode == toNode:
                    overview[link][key][KEY.CONNECTIVITY + "_uRCount"] = (
                        len(analysis[fromNode][toNode]) - 1
                    )
            # count total number of other potential macro routes
            overview[link][key][KEY.CONNECTIVITY + "_mRCount"] = len(
                overview[link][key][KEY.CONNECTIVITY]
            )

    # skip if empty analysis
    if not analysis:
        return
    # go through current links in topology
    latestLinks = topology.get_links(isWireless=True)
    # go through links
    for link in latestLinks:
        if link not in overview:
            overview[link] = {}
        aNode = topology.get_a_node(link)
        zNode = topology.get_z_node(link)
        # reset the connectivity info
        # (we do not do time-series as here we only care about snapshot result)
        for unikey in [KEY.A2Z, KEY.Z2A]:
            if unikey not in overview[link]:
                overview[link][unikey] = {}
            overview[link][unikey][KEY.CONNECTIVITY] = {}
        # add the uni-directional connectivity info from the latest snapshot
        take_connectivity_from(link, aNode, zNode, KEY.A2Z, overview, analysis)
        take_connectivity_from(link, zNode, aNode, KEY.Z2A, overview, analysis)


def extract_ping_analysis(overview, topology, analysis):
    """
    extract key (cared) data from ping latency analysis for summary purpose
    @param overview: dict, previous overview
    @param topology: Topology() object
    @param analysis: dict, (it follows general analysis format)
    """
    if not analysis:
        return
    # go through current links in topology
    latestLinks = topology.get_links(isWireless=True)
    # go through the links in use
    for link in latestLinks:
        if link not in overview:
            overview[link] = {}
        if link not in analysis:
            continue
        # always update bi-directional link label (single snapshot)
        # if label is unknown, then do not touch
        if not skip_decision(KEY.LB_PING_STATUS, analysis[link]):
            overview[link][KEY.LB_PING_STATUS] = analysis[link][KEY.LB_PING_STATUS]
        # always update uni-directional link label (single snapshot)
        for unikey in [KEY.A2Z, KEY.Z2A]:
            if unikey not in overview[link]:
                overview[link][unikey] = {}
            for key in analysis[link][unikey]:
                # if label is unknown, then do not touch
                if skip_decision(key, analysis[link][unikey]):
                    continue
                overview[link][unikey][key] = analysis[link][unikey][key]
                # save space
                if isinstance(overview[link][unikey][key], float):
                    tmp = float("{0:.2f}".format(overview[link][unikey][key]))
                    overview[link][unikey][key] = tmp
    # remove links not in use
    removeOldLinks(latestLinks, overview)


def extract_boxalign_analysis(overview, topology, analysis):
    """
    extract key (cared) data from box alignment analysis for summary purpose
    @param overview: dict, previous overview
    @param topology: Topology() object
    @param analysis: dict, (it follows general analysis format)
    """
    if not analysis:  # do nothing if analysis is empty
        return
    # go through current links in topology
    latestLinks = topology.get_links(isWireless=True)
    # go through the links in use
    for link in latestLinks:
        if link not in overview:
            overview[link] = {}
        if link not in analysis:
            continue
        # always update uni-directional link label (single snapshot)
        for unikey in [KEY.A2Z, KEY.Z2A]:
            if unikey not in overview[link]:
                overview[link][unikey] = {}
            for key in analysis[link][unikey]:
                # if label is unknown, then do not touch
                if skip_decision(key, analysis[link][unikey]):
                    continue
                overview[link][unikey][key] = analysis[link][unikey][key]
    # remove links not in use
    removeOldLinks(latestLinks, overview)


def extract_monitoring_analysis(overview, topology, analysis):
    """
    extract key (cared) data from monitoring analysis for summary purpose
    @param overview: dict, previous overview
    @param topology: Topology() object
    @param analysis: dict, (it follows general analysis format)
    """

    def update_bidirectional_stats(fromDict, toDict):
        """
        bidirectional stats:
            distance, dashboard url, labels
        """
        # always update link distance
        toDict[KEY.DISTANCE] = fromDict.get(KEY.DISTANCE, -1)
        toDict[KEY.DASHBOARD] = fromDict.get(KEY.DASHBOARD, "")
        # always update labels (single snapshot)
        for lbkey in [x for x in fromDict if "lb_" in x]:
            # if label is unknown, then do not touch
            if skip_decision(lbkey, fromDict):
                continue
            toDict[lbkey + "_mon"] = fromDict[lbkey]

    def update_unidirectional_stats(fromDict, toDict):
        """
        unidirectional stats:
            labels, rssi, snr, iperf-related, pathloss,
            mcs, PER, txPwrIdx, txUtilRatio
        """
        keys_to_update = [
            key
            for key in fromDict
            if "lb_" in key
            or KEY.ODS_RSSI in key
            or KEY.ODS_SNR in key
            or KEY.IPERF_DETAILS in key
            or KEY.PING_DETAILS in key
            or KEY.PATHLOSS in key
            or ODS_STA_MCS in key
            or ODS_STA_PER in key
            or ODS_STA_TX_PWR in key
            or TX_UTIL_RATIO in key
            or ODS_BWHAN_TX_SLOT_PERC in key
            or ODS_BWHAN_RX_SLOT_PERC in key
        ]
        for key in keys_to_update:
            # if label is unknown, then do not touch
            if skip_decision(key, fromDict):
                continue
            overview[link][unikey][key + "_mon"] = fromDict[key]
            # save space
            if isinstance(overview[link][unikey][key + "_mon"], float):
                tmp = float("{0:.2f}".format(overview[link][unikey][key + "_mon"]))
                overview[link][unikey][key + "_mon"] = tmp

    if not analysis:
        return
    # go through current links in topology
    latestLinks = topology.get_links(isWireless=True)
    # go through the links in use
    for link in latestLinks:
        if link not in overview:
            overview[link] = {}
        if link not in analysis:
            continue
        # update bi-directional link stats
        update_bidirectional_stats(analysis[link], overview[link])
        # update uni-directional link stats
        for unikey in [KEY.A2Z, KEY.Z2A]:
            if unikey not in overview[link]:
                overview[link][unikey] = {}
            update_unidirectional_stats(
                analysis[link].get(unikey, {}), overview[link][unikey]
            )
    # remove links not in use
    removeOldLinks(latestLinks, overview)


def update_bidirectional_stats(fromDict, toDict):
    """
    bidirectional stats:
        distance, dashboard url, labels
    """
    # always update link distance
    toDict[KEY.DISTANCE] = fromDict.get(KEY.DISTANCE, -1)
    toDict[KEY.DASHBOARD] = fromDict.get(KEY.DASHBOARD, "")
    # always update labels (single snapshot)
    for lbkey in [x for x in fromDict if "lb_" in x]:
        # if label is unknown, then do not touch
        if skip_decision(lbkey, fromDict):
            continue
        toDict[lbkey] = fromDict[lbkey]


def extract_iperf_analysis(overview, topology, analysis, traffic="", logger=None):
    """
    extract key (cared) data from iperf analysis for summary purpose
    @param overview: dict, previous overview
    @param topology: Topology() object
    @param analysis: dict, (it follows general analysis format
           but has an upper key layer, e.g., `udp` or `tcp`)
    @param traffic: string, e.g., 'udp' or 'tcp'
    """

    def update_unidirectional_stats(fromDict, toDict):
        """
        unidirectional stats:
            labels, rssi, snr, iperf-related, pathloss,
            mcs, PER, txPwrIdx, txEff
        """
        keys_to_update = [
            key
            for key in fromDict
            if "lb_" in key
            or KEY.ODS_RSSI in key
            or KEY.ODS_SNR in key
            or KEY.IPERF_DETAILS in key
            or KEY.PING_DETAILS in key
            or KEY.PATHLOSS in key
            or ODS_STA_MCS in key
            or ODS_STA_PER in key
            or ODS_STA_TX_PWR in key
            or TX_UTIL_RATIO in key
            or ODS_BWHAN_TX_SLOT_PERC in key
            or ODS_BWHAN_RX_SLOT_PERC in key
            or KEY.TARGET_BITRATE in key
        ]
        for key in keys_to_update:
            # if label is unknown, then do not touch
            if skip_decision(key, fromDict):
                continue
            overview[link][unikey][key] = fromDict[key]
            # save space
            if isinstance(overview[link][unikey][key], float):
                tmp = float("{0:.2f}".format(overview[link][unikey][key]))
                overview[link][unikey][key] = tmp

    if not traffic:  # a recursive call dealing with both tcp and udp
        # summarize tcp first
        extract_iperf_analysis(
            overview, topology, analysis, traffic=KEY.TCP, logger=logger
        )
        # then summarize udp (if stats overlapped, will be overwritten)
        extract_iperf_analysis(
            overview, topology, analysis, traffic=KEY.UDP, logger=logger
        )
        return
    if not analysis or not analysis.get(traffic, {}):
        return
    analysis = analysis.get(traffic, {})
    # go through current links in topology
    latestLinks = topology.get_links(isWireless=True)
    for link in latestLinks:
        if link not in overview:
            overview[link] = {}
        if link not in analysis:
            continue
        # update bi-directional link stats
        update_bidirectional_stats(analysis[link], overview[link])
        # always update uni-directional link label (single snapshot)
        logger.debug(
            "In extract_iperf_analysis, {}, latest analysis = {}".format(
                link, analysis[link]
            )
        )
        for unikey in [KEY.A2Z, KEY.Z2A]:
            if unikey not in overview[link]:
                overview[link][unikey] = {}
            update_unidirectional_stats(
                analysis[link].get(unikey, {}), overview[link][unikey]
            )
        logger.debug(
            "In extract_iperf_analysis, {}, overview = {}".format(link, analysis[link])
        )
    # remove old links
    removeOldLinks(latestLinks, overview)


def derive_latest_overview(overview, allAnalysis, topology, logger=None):
    """
    update the overview dict by putting all analysis together
    @param overview: dict, previous overview
    @param allAnalysis: dict, latest analysis newer than previous overview
    @param topology: Topology() object
    """
    # use iperf tcp/udp as a base (if exists; and if both, prefer udp)
    extract_iperf_analysis(
        overview,
        topology,
        allAnalysis.get("analysis_iperf", {}),
        traffic="",
        logger=logger,
    )
    # get beam index and box alignment analysis
    extract_boxalign_analysis(
        overview, topology, allAnalysis.get("analysis_box_misalignment", {})
    )
    # get monitoring analysis
    extract_monitoring_analysis(
        overview, topology, allAnalysis.get("analysis_monitoring", {})
    )

    # TODO multihop
    # extract_multihop_analysis

    # get connectivity analysis
    # (as there may exist multiple targetSNR, load from high to low)
    keys = [key for key in allAnalysis if "connectivity" in key]
    if keys:
        keys = sorted(keys, key=lambda x: int(x.split("_")[-1][:-2]), reverse=True)
        for key in keys:
            extract_connectivity(overview, topology, allAnalysis.get(key, {}))
    # get interference (from im) analysis
    extract_interference_im(
        overview, topology, allAnalysis.get("analysis_interference_power_active", {})
    )


def derive_overview_sum_days_connectivity(uniresult, toNode, dlen):
    """
    special treatment for connectivity as we need to
    find the most consistent results
    @param result: dict, the overview result of one link
    @param toNode: str, towards node name (for checking uR count)
    @param dlen: int, length of the fetched data (to help calucate mode())
    """
    mRCount = 0
    uRCount = 0
    # assume empty connectivity due to inconsistency
    summary = {}
    # step1: go through once to count appeared times
    for each in uniresult[KEY.CONNECTIVITY]:
        for towardsNode in each:
            if towardsNode not in summary:
                # structure: [count, possible paths, stable paths]
                summary[towardsNode] = [0, [], []]
            summary[towardsNode][0] += 1
            summary[towardsNode][1] += each[towardsNode]
    # step2: compare with dlen: pass if only it appears HALF of dlen times
    for towardsNode in summary.keys():
        if summary[towardsNode][0] < KEY.THRESH_STABLE_PATH_RATIO * dlen:
            summary.pop(towardsNode, None)
            continue
        # then judge if the possible path appears HALF of dlen times
        # structure: [path, count]
        paths = []
        for p in summary[towardsNode][1]:
            p[2] = [p[2]]  # convert to list for easy signal addition
            # derive angle to save computations (0 -> txIdx, 1 -> rxIdx)
            p += [index2deg(p[0]), index2deg(p[1])]
            if not paths:
                paths.append([p, 1])
                continue
            # if euclidean distance is close to previous, then assume same path
            thesame = False
            for prevp in paths:
                if euclidean(prevp[0][3:], p[3:]) < KEY.TX_RX_DIFF_THRESH_DEG:
                    prevp[1] += 1
                    prevp[0][2] += p[2]
                    thesame = True
                    break
            if not thesame:
                paths.append([p, 1])
        # any path appears more than HALF of dlen time? if so, add to stable path
        for p, count in paths:
            if count > KEY.THRESH_STABLE_PATH_RATIO * dlen:
                # structure: [[txIdx, rxIdx, potentialSNR, potentialSNR std]]
                summary[towardsNode][2].append((p[0], p[1], mean(p[2]), std(p[2])))
        # pop if found no stable paths
        if not summary[towardsNode][2]:
            summary.pop(towardsNode, None)
    # step3: reformat the paths of these connectivity
    for towardsNode in summary:
        summary[towardsNode] = summary[towardsNode][2]
        mRCount += 1
        if towardsNode == toNode:
            uRCount = len(summary[towardsNode]) - 1
    uniresult[KEY.CONNECTIVITY] = summary
    uniresult[KEY.CONNECTIVITY + "_mRCount"] = mRCount
    uniresult[KEY.CONNECTIVITY + "_uRCount"] = uRCount


def derive_overview_sum_days_derivestat(result, link, dlen):
    """
    compute mode, or mean & std of the historical values for each list
    connectivity requires a special treatment
    @param result: dict, the overview result of one link
    @param link: string, link name
    @param dlen: int, length of the fetched data (to help calucate mode())
    """

    def find_mode_w_nan(listOfVals, length):
        if not (isinstance(listOfVals, list) or isinstance(listOfVals, tuple)):
            return float("nan")
        modeVal = mode(listOfVals)
        if length - len(listOfVals) > listOfVals.count(modeVal):
            return float("nan")
        return modeVal

    try:
        tmp = link.replace("link-", "").split("-")
        if len(tmp) > 2:
            if "." in tmp[0]:
                aNode = tmp[0]
                zNode = "-".join(tmp[1:])
            elif "." in tmp[1]:
                aNode = "-".join(tmp[0:2])
                zNode = "-".join(tmp[2:])
            else:
                aNode = tmp[0]
                zNode = tmp[1]
        else:
            aNode, zNode = tmp
    except BaseException:
        aNode, zNode = None, None
    for bikey in result:
        # for bi-directional labels and distance
        if "lb_" in bikey or KEY.DISTANCE == bikey:
            result[bikey] = find_mode_w_nan(result[bikey], dlen)
        # for a2z and z2a
        elif bikey in [KEY.A2Z, KEY.Z2A]:
            toNode = zNode
            if bikey == KEY.A2Z:
                toNode = aNode
            for unikey in result[bikey].keys():
                # for uni-directional labels
                if "lb_" in unikey:
                    result[bikey][unikey] = find_mode_w_nan(result[bikey][unikey], dlen)
                elif "_avg" in unikey:
                    result[bikey][unikey.replace("_avg", "_std")] = std(
                        result[bikey][unikey]
                    )
                    result[bikey][unikey] = mean(result[bikey][unikey])
                elif KEY.CONNECTIVITY == unikey:
                    # special treatment for connectivity over days
                    derive_overview_sum_days_connectivity(result[bikey], toNode, dlen)
                elif unikey == ODS_STA_MCS + "_p90":
                    result[bikey][unikey.replace("_p90", "_std")] = std(
                        result[bikey][unikey]
                    )
                    result[bikey][unikey] = mean(result[bikey][unikey])


def derive_overview_sum_days_getlinklist(overview, link, data):
    """
    create a list of historical values for some overviews
    @param result: dict, the overview result of a link
    """
    datalen = len(data)
    # go over all data from oldest to latest
    for i in range(datalen - 1, -1, -1):
        result = data[i].get(link, {})
        if not result:
            return
        # go through all keys
        for bikey in result:
            # for bi-directional labels and distance
            if "lb_" in bikey or KEY.DISTANCE == bikey:
                if bikey not in overview[link]:
                    overview[link][bikey] = []
                overview[link][bikey].append(result[bikey])
            # for a2z and z2a
            elif bikey in [KEY.A2Z, KEY.Z2A]:
                if bikey not in overview[link]:
                    overview[link][bikey] = {}
                for unikey in result[bikey]:
                    # for uni-directional labels, parameter averages, mcs p90
                    if not (
                        "lb_" in unikey
                        or "_avg" in unikey
                        or unikey == KEY.CONNECTIVITY
                        or unikey == ODS_STA_MCS + "_p90"
                    ):
                        continue
                    if unikey not in overview[link][bikey]:
                        overview[link][bikey][unikey] = []
                    overview[link][bikey][unikey].append(result[bikey][unikey])


def derive_overview_sum_days(data):
    """
    compute the summed info for list of historical overviews
    @param data: list, sorted from latest to oldest overviews
    """
    overview = {}
    # generate all keys
    for each in data:  # list entry
        for key in each:  # dict entry
            if "link-" in key and key not in overview:
                overview[key] = {}
    # go over all links
    for link in overview:
        derive_overview_sum_days_getlinklist(overview, link, data)
        # calculate
        derive_overview_sum_days_derivestat(overview[link], link, len(data))
    return overview


"""
Histogram related
"""


def compute_bilinkwise_hist(hist, overview):
    """
    compute the histograms for bi-directional link properties
    """
    if not overview:
        return
    # distance histogram (every 50m)
    hist[KEY.DISTANCE] = get_histogram(overview, KEY.DISTANCE, roundBase=50)
    # get all label statistics
    for lbkey in KEY.ALL_LBS:
        tmp = get_histogram(overview, lbkey, perDirection=False)
        if tmp.get("total_count", 0) is 0:
            continue
        hist[lbkey + "_bi"] = tmp


def compute_unilinkwise_hist(hist, overview):
    """
    compute the histograms for uni-directional link properties
    """
    if not overview:
        return
    # MCS P90
    hist[ODS_STA_MCS + "_uni"] = get_histogram(
        overview, ODS_STA_MCS + "_p90", perDirection=True
    )
    # txPowerIndex
    hist[ODS_STA_TX_PWR + "_uni"] = get_histogram(
        overview, ODS_STA_TX_PWR + "_avg", perDirection=True, roundDigit=0
    )
    # special handler for txPowerIndex > 21
    val = 0
    for txPwrIdx in hist[ODS_STA_TX_PWR + "_uni"]["details_num"]:
        if txPwrIdx > 21:
            val += hist[ODS_STA_TX_PWR + "_uni"]["details_num"].pop(txPwrIdx)
    if val > 0:
        hist[ODS_STA_TX_PWR + "_uni"]["details_num"][">21"] = val
    # PER
    hist[KEY.PER + "_uni"] = get_histogram(
        overview, KEY.PER + "_avg", perDirection=True, roundDigit=1, roundBase=0.2
    )
    # connectivity uR counts
    hist[KEY.CONNECTIVITY + "_uRCount"] = get_histogram(
        overview, KEY.CONNECTIVITY + "_uRCount", perDirection=True
    )
    # connectivity mR counts
    hist[KEY.CONNECTIVITY + "_mRCount"] = get_histogram(
        overview, KEY.CONNECTIVITY + "_mRCount", perDirection=True
    )
    # get all label statistics
    for lbkey in KEY.ALL_LBS:
        tmp = get_histogram(overview, lbkey, perDirection=True)
        if tmp.get("total_count", 0) is 0:
            continue
        hist[lbkey + "_uni"] = tmp


def compute_overivew_histogram(overview):
    """
    compute the histograms for the overview
    """
    histograms = {}
    compute_bilinkwise_hist(histograms, overview)
    compute_unilinkwise_hist(histograms, overview)
    return histograms
