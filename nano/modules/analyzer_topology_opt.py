#!/usr/bin/env python3

# built-ins
import random
from copy import deepcopy


# modules
try:
    import modules.keywords as KEY
    from modules.util_math import db2pwr, pwr2db
    from modules.util_math import compute_path_loss, compute_ant_gain
    from modules.util_math import translate_tx_power_idx, translate_tx_power
    from modules.addon_misc import get_cluster_beam_idx
    from modules.util_interference import NOISE_FLOOR_db, NOISE_FLOOR

    # from addon_terminal_color import colorString
except BaseException:
    raise


# global params
ANT_GAIN_PLUS_EXTRA_LOSS = 21


def _get_connectivity_stats(result):
    # count number of micro/macro routes
    count_pairs_with_micro = 0
    count_pairs_with_macro = 0
    for tx in result:
        counted = False
        if len(result[tx]) > 1:
            count_pairs_with_macro += 1
        for rx in result[tx]:
            if not counted and len(result[tx][rx]) > 1:
                count_pairs_with_micro += 1
                counted = True
    return (count_pairs_with_micro, count_pairs_with_macro)


def analyze_connectivity_graph(data, target=15):
    """
    generate the connectivity graph based on im_scan data
    """
    result = {}
    im_data = data.get_im_data()
    data.logger.note(
        "analyzing connectivity graph w/ target SNR = {0}dB".format(target)
    )
    for tx in im_data:
        # skip if node name not recognized
        if not data.topology.is_node(tx):
            continue
        for token in im_data[tx]:
            for rx in im_data[tx][token]:
                # skip if node name not recognized
                if not data.topology.is_node(rx):
                    continue
                routes = get_cluster_beam_idx(
                    im_data[tx][token][rx], use_rssi=False, target=target
                )
                # skip if no routes found even if we use max power index
                if not routes:
                    continue
                # add to result
                if tx not in result:
                    result[tx] = {}
                if not data.topology.get_site_name(tx) == data.topology.get_site_name(
                    rx
                ):
                    result[tx][rx] = routes
    count_micro, count_macro = _get_connectivity_stats(result)
    return (count_micro, count_macro, result)


def get_rx_importance(linkImportance, topology):
    """
    get sector (as rx) importance from linkImportance dict
    @param linkImportance: dict
    @param topology: Topology() object
    @return dict
    """
    rxImportance = {}
    if linkImportance:
        for linkName in linkImportance:
            if "link-" not in linkName:
                continue
            aNode = topology.get_a_node(linkName)
            zNode = topology.get_z_node(linkName)
            # sum up the previous importance if p2mp
            rxImportance[aNode] = linkImportance[linkName][KEY.A2Z].get(
                "link_route_num", 0
            ) + rxImportance.get(aNode, 0)
            rxImportance[zNode] = linkImportance[linkName][KEY.Z2A].get(
                "link_route_num", 0
            ) + rxImportance.get(zNode, 0)
    for rx in rxImportance:
        if rxImportance[rx] is 0:
            rxImportance[rx] = 1  # avoid 0 importance
    return rxImportance


def estimate_inr_from_pwr(inr_analysis, pwr, logger):
    """
    estimate with pwr, what inr analysis is
    @param inr_analysis: inr analysis with the MAX power
    @param pwr: predicted power profile
    @param logger: EmptyLogger object
    """
    logger.debug("=== entering estimate_inr_from_pwr")
    new_inr_est = {}
    for rxKey in inr_analysis.keys():
        overallINR_pwr = 0
        if rxKey not in new_inr_est:
            new_inr_est[rxKey] = [-10, []]
        # get the interferers
        __, interferers = inr_analysis[rxKey]
        for i in range(len(interferers) - 1, -1, -1):
            aggressor, inr, aggressorTowards = interferers[i]
            aggressorKey = "{}__{}".format(aggressor, aggressorTowards)
            aggressorPwr = pwr.get(aggressorKey, [KEY.MAX_PWR_IDX, KEY.MAX_PWR_DB])
            diff = KEY.MAX_PWR_DB - aggressorPwr[1]
            inr2 = inr - diff  # calibrated inr
            logger.debug(
                "{} has txpower {:.2f}dB, inr lowers from {:.2f}dB to {:.2f}dB".format(
                    aggressorKey, aggressorPwr[1], inr, inr2
                )
            )
            # skip if our aggressor now does not create interference
            if inr2 <= -10:
                continue
            interferenceRSSI = inr2 + NOISE_FLOOR_db
            new_inr_est[rxKey][1].append([aggressor, inr2, aggressorTowards])
            overallINR_pwr += db2pwr(interferenceRSSI)
        logger.debug("- ori inr: {:.2f}".format(inr_analysis[rxKey][0]))
        new_inr_est[rxKey][0] = pwr2db(overallINR_pwr) - NOISE_FLOOR_db
        logger.debug("- new inr: {:.2f}".format(new_inr_est[rxKey][0]))
        if new_inr_est[rxKey][0] <= -10:
            del new_inr_est[rxKey]
    return new_inr_est


def estimate_pwr_with_inr(
    prev_inr, prev_pwr, topology, logger, linkDefects=None, targetSINR=None
):
    """
    estimate power with inr
    here we assume the txPower profile changes simultaneously in the newtork,
    which may not be the case
    also, we do not consider PER in our estimation, which may cause difference
    comparing with the actual network performance, as current TPC algorithm
    relies on both SINR and PER
    @param prev_inr: analysis with estimated inr (previous)
    @param prev_pwr: analysis with estimated pwr (previous)
    @param topology: Topology object
    @param logger: EmptyLogger object
    @param targetSINR: dict, target sinr by key `rx__rxTowards`
    """
    logger.debug("==== entering estimate_pwr_with_inr")
    if targetSINR is None:
        targetSINR = {}
    if linkDefects is None:
        linkDefects = {}
    new_pwr = {}
    new_sinr = {}
    nodes = topology.get_all_nodes(isConnected=True)
    # estimate
    for txNode in nodes:
        txTowardsNodes = topology.get_linked_sector(txNode)
        for txTowardsNode in txTowardsNodes:
            txKey = "{0}__{1}".format(txNode, txTowardsNode)
            rxKey = "{0}__{1}".format(txTowardsNode, txNode)
            inr = prev_inr.get(rxKey, [-10, []])[0]
            txPwr = prev_pwr.get(txKey, [KEY.MAX_PWR_IDX, KEY.MAX_PWR_DB])
            # use path loss model to calculate theoretical snr at current power
            distance = topology.get_distance(txNode, txTowardsNode)
            if distance < 0.1:
                continue
            pathloss = compute_path_loss(distance)
            curSNR = (
                txPwr[1]
                + pathloss
                + ANT_GAIN_PLUS_EXTRA_LOSS
                - linkDefects.get(txKey, 0)
                - NOISE_FLOOR_db
            )
            interf = inr + NOISE_FLOOR_db  # interference
            curRSSI = curSNR + NOISE_FLOOR_db  # current power can achieve
            curSINR = curRSSI - pwr2db(db2pwr(interf) + NOISE_FLOOR)
            logger.debug(
                "=== {} INR {:.2f}dB; ".format(rxKey, inr)
                + "tx power index ori {}; ".format(txPwr[0])
                + "distance {:.2f}m; ".format(distance)
                + "current SINR {:.2f}dB".format(curSINR)
            )
            # 1dB additional margin
            pwrBackoff = curSINR - targetSINR.get(rxKey, 18) - 1
            txPwr[0] = translate_tx_power_idx(txPwr[1] - pwrBackoff)
            logger.debug(
                "backoff {:.2f}dB; ".format(pwrBackoff)
                + "proposed tx pwr index {}; ".format(txPwr[0])
            )
            if txPwr[0] < 0:
                txPwr[0] = 0
            elif txPwr[0] > KEY.MAX_PWR_IDX:
                txPwr[0] = KEY.MAX_PWR_IDX
            # recalculate txpower and curSINR due to hw limit
            prevPwr_dB = txPwr[1]
            txPwr[1] = translate_tx_power(txPwr[0])
            curSINR += txPwr[1] - prevPwr_dB
            new_pwr[txKey] = txPwr
            new_sinr[rxKey] = curSINR
            logger.debug(
                "new power index {}; ".format(txPwr[0])
                + "sinr {:.2f}dB".format(curSINR)
            )
    return new_pwr, new_sinr


def update_inr_when_link_transmitting(topology, inr_analysis, linkNodes):
    """
    estimate and update inr analysis when a new setup link is transmitting
    """
    # when the link node is transmitting
    for txNode, txTowardsNode in linkNodes:
        txAzimuth = topology.get_angle(txTowardsNode, txNode)
        txTowardsNodes = topology.get_linked_sector(txNode)
        for rxNode in topology.get_all_nodes(isConnected=True):
            if txNode == rxNode:  # skip if the same node
                continue
            if rxNode in txTowardsNodes:  # skip if desired link or p2mp
                continue
            rxTowardsNodes = topology.get_linked_sector(rxNode)
            for rxTowardsNode in rxTowardsNodes:
                rxKey = "{0}__{1}".format(rxNode, rxTowardsNode)
                rxAzimuth = topology.get_angle(rxTowardsNode, rxNode)
                # derive path loss
                distance = topology.get_distance(txNode, rxNode)
                pathloss = compute_path_loss(distance)
                # derive tx gain
                inr_txAzimuth = topology.get_angle(rxNode, txNode)
                tx_gain = compute_ant_gain(inr_txAzimuth, txAzimuth, useBoxModel=False)
                inr_rxAzimuth = topology.get_angle(txNode, rxNode)
                rx_gain = compute_ant_gain(inr_rxAzimuth, rxAzimuth, useBoxModel=False)
                # compute rss
                rss = (
                    KEY.MAX_PWR_DB
                    + tx_gain
                    + rx_gain
                    + pathloss
                    + ANT_GAIN_PLUS_EXTRA_LOSS
                )
                inr = rss - NOISE_FLOOR_db
                if inr > -10:
                    if rxKey not in inr_analysis:
                        inr_analysis[rxKey] = [-10, []]
                    inr_analysis[rxKey][1].append((txNode, inr, txTowardsNode))


def update_inr_when_link_receiving(topology, inr_analysis, linkNodes):
    """
    estimate and update inr analysis when a new setup link is receiving
    """
    # when the link node is receiving
    for rxNode, rxTowardsNode in linkNodes:
        rxKey = "{0}__{1}".format(rxNode, rxTowardsNode)
        inr_analysis[rxKey] = [-10, []]
        rxAzimuth = topology.get_angle(rxTowardsNode, rxNode)
        rxTowardsNodes = topology.get_linked_sector(rxNode)
        for txNode in topology.get_all_nodes(isConnected=True):
            if txNode == rxNode:  # skip if the same node
                continue
            if txNode in rxTowardsNodes:  # skip if desired link or p2mp
                continue
            txTowardsNodes = topology.get_linked_sector(txNode)
            for txTowardsNode in txTowardsNodes:
                txAzimuth = topology.get_angle(txTowardsNode, txNode)
                # derive path loss
                distance = topology.get_distance(txNode, rxNode)
                pathloss = compute_path_loss(distance)
                # derive tx gain
                inr_txAzimuth = topology.get_angle(rxNode, txNode)
                tx_gain = compute_ant_gain(inr_txAzimuth, txAzimuth, useBoxModel=False)
                inr_rxAzimuth = topology.get_angle(txNode, rxNode)
                rx_gain = compute_ant_gain(inr_rxAzimuth, rxAzimuth, useBoxModel=False)
                # compute rss
                rss = (
                    KEY.MAX_PWR_DB
                    + tx_gain
                    + rx_gain
                    + pathloss
                    + ANT_GAIN_PLUS_EXTRA_LOSS
                )
                inr = rss - NOISE_FLOOR_db
                if inr > -10:
                    inr_analysis[rxKey][1].append((txNode, inr, txTowardsNode))


def update_inr_for_single_link(inr_analysis, linkName, topology):
    """
    update the inr for a link that creates to and receives from other links
    """
    updated_inr_analysis = deepcopy(inr_analysis)
    # deal with the new link to `estimate` if it interfer with others
    aNode = topology.get_a_node(linkName)
    zNode = topology.get_z_node(linkName)
    # when the link nodes are transmitting
    update_inr_when_link_transmitting(
        topology, updated_inr_analysis, [(aNode, zNode), (zNode, aNode)]
    )
    # when the link nodes are receiving
    update_inr_when_link_receiving(
        topology, updated_inr_analysis, [(aNode, zNode), (zNode, aNode)]
    )
    return updated_inr_analysis


def estimate_inr_from_topology_change(inr_analysis, newLinkName, topology):
    """
    estimate inr from topology based on the prediction on newly added link
    """
    inr_analysis = update_inr_for_single_link(inr_analysis, newLinkName, topology)
    new_inr_est = {}
    # re-compute the new inr dictionary
    for rxKey in inr_analysis:
        rx, rxTowardsNode = rxKey.split("__")
        if not topology.get_link_name(rx, rxTowardsNode):
            # skip if the link does not exist any more
            continue
        if rxKey not in new_inr_est:
            new_inr_est[rxKey] = [-10, []]
        # get the interferers
        __, interferers = inr_analysis[rxKey]
        overallINR_pwr = 0
        for i in range(len(interferers) - 1, -1, -1):
            aggressor, inr, aggressorTowards = interferers[i]
            if not topology.get_link_name(aggressor, aggressorTowards):
                # skip if the link does not exist any more
                continue
            new_inr_est[rxKey][1].append([aggressor, inr, aggressorTowards])
            overallINR_pwr += db2pwr(inr + NOISE_FLOOR_db)
        new_inr_est[rxKey][0] = pwr2db(overallINR_pwr) - NOISE_FLOOR_db
        if new_inr_est[rxKey][0] <= -10:
            del new_inr_est[rxKey]
    return new_inr_est


def estimate_inr_with_polarity(
    inr_analysis,
    topology,
    ignorePolarity=False,
    rxImportance=None,
    weight_pop=2,
    scale_critical_node=1,
):
    """
    calculate overall inr considering polarity
    @param inr_analysis: {key: [overallINR, [[agressor, inr, towards], ...]]}
    @param topology: topology object; if not specified, will ignore polarity
    @param rxImportance: {rx: importanceFactor}
    @param weight_pop: the weight of pop node in the evaluation
    @param scale_critical_node: the scale of link/rx importance
    """
    if rxImportance is None:
        rxImportance = {}
    inr_analysis_new = {}  # we shall leave inr_analysis untouched
    # since inr analysis is `without polarity` initially, safe to just update
    # based on polarity changes
    optimizerMetric_pwr = 0
    for key in inr_analysis:
        rx, rxTowardsNode = key.split("__")
        if key not in inr_analysis_new:
            inr_analysis_new[key] = [-10, []]
        rxPolarity = topology.get_polarity(rx) if not ignorePolarity else -1
        oldOverallINR, interferers = inr_analysis[key]
        newOverallINR_pwr = 0  # use this as power rather than db
        for i in range(len(interferers) - 1, -1, -1):
            aggressor, inr, aggressorTowards = interferers[i]
            aggrPolarity = (
                topology.get_polarity(aggressor) if not ignorePolarity else -2
            )
            # only when they have different polarity, interference can happen
            if rxPolarity is aggrPolarity:
                continue
            inr_analysis_new[key][1].append([aggressor, inr, aggressorTowards])
            # add up
            rssi_interference_pwr = db2pwr(inr + NOISE_FLOOR_db)
            newOverallINR_pwr += rssi_interference_pwr
        inr_analysis_new[key][0] = pwr2db(newOverallINR_pwr) - NOISE_FLOOR_db
        if inr_analysis_new[key][0] < -10:  # ignore if overall inr too small
            del inr_analysis_new[key]
            continue
        # here we assume the link importance (rxImportance) `scales up` the
        # `inr` and if the node upon receiving is a pop node, it's `inr` will
        # be doubled
        optimizerMetric_pwr += (
            newOverallINR_pwr
            * (scale_critical_node * rxImportance.get(rx, 1))
            * (weight_pop if topology.is_pop(rx) else 1)
        )
    optimizerMetric = pwr2db(optimizerMetric_pwr) - NOISE_FLOOR_db
    return inr_analysis_new, optimizerMetric


def separate_interfered_nodes(topology, inr_analysis, rxImportance=None):
    """
    separate nodes those are interfered and those are not
    @param topology: Topology() object
    @param inr_analysis: interference analysis
    @param rxImportance: dict, importance of a node
                         this comes from the uni-directional link importance
                         measurement summarized by the traceroute
    @return nodes without INR at all, nodes with INR
    """
    nodesNoINR = set()
    nodesHaveINR = []
    for rx in topology.get_all_nodes(isConnected=True):
        rxTowardsNodes = topology.get_linked_sector(rx)
        isPoP = topology.is_pop(rx)
        # here we treat p2mp as separated links
        for rxTowardsNode in rxTowardsNodes:
            key = "{0}__{1}".format(rx, rxTowardsNode)
            if not inr_analysis.get(key, []):
                # [rx, has visited]
                nodesNoINR.add(rx)
                continue
            # Build nodesHaveINR list with following attributes
            # [rx, interferers, overallINR, isPoP, criticality, has visited]
            nodesHaveINR.append(
                [
                    rx,
                    inr_analysis[key][1],
                    inr_analysis[key][0],
                    isPoP,
                    rxImportance.get(rx, 1),
                    False,
                ]
            )
    return nodesNoINR, nodesHaveINR


def get_nodes_to_index_map(nodesHasINR, logger):
    """
    derive the nodes to index map for faster process
    @param nodesHasINR: list of `[overINR, [interfers, inr]]`
        each entry is [rx, interferers, overallINR, isPoP, criticality, has visited]
    @param logger: EmptyLogger() object
    """
    nodesIdxMap = {}
    for i in range(len(nodesHasINR)):
        if nodesHasINR[i][0] not in nodesIdxMap:
            nodesIdxMap[nodesHasINR[i][0]] = []
        # nodesIdxMap has entries with format {rx, [index]}
        nodesIdxMap[nodesHasINR[i][0]].append(i)
    logger.debug("{}".format(nodesIdxMap))
    return nodesIdxMap


def derive_polarity_choice(topology, thisNode, logger, interfererNodes, keepOri=False):
    """
    derive polarity based on current topology and node
    @param topology: Topology() object
    @param thisNode: the node name of the current node
    @param logger: EmptyLogger() object
    @param interfererNodes: list of interferer nodes
    @param keepOri: boolean, if set then we try not to change polarity
    """
    if keepOri:
        polarity = topology.get_polarity(thisNode)
        if not polarity:
            # if topology does not have it, then set to polarity 1
            return 1
        return polarity
    # assume we originally have 2 choices for polarity 1 or 2
    availableChoice = [1, 2]
    # polarity grouping - whoever affect me the most I'll ask you to change
    # TODO: here we do not consider hyber-grouping where
    # in p2mp we may face 2 CNs each has low INR comparing with the 3rd,
    # but together have higher INR
    interfererGroupsNode = {1: [], 2: []}
    interfererGroupsPwr = {1: 0, 2: 0}
    for otherNode, inr, __ in interfererNodes:
        polarity = topology.get_polarity(otherNode)
        interfererGroupsNode[polarity].append((otherNode, inr))
        interfererGroupsPwr[polarity] += db2pwr(inr + NOISE_FLOOR_db)
    logger.debug("interferers: {}".format(interfererGroupsNode))
    # our priority here is to reduce interference
    if interfererGroupsPwr[1] > interfererGroupsPwr[2]:
        # nodes w/ polarity 1 create more interference than 2
        # we shall have more chance to choose 1 to avoid
        availableChoice += [1] * 10
    else:
        # nodes w/ polarity 2 create more interference than 1
        # we shall have more chance to choose 2 to avoid
        availableChoice += [2] * 10
    logger.debug("* remaining choice: {}".format(availableChoice))
    if not availableChoice:  # are we out of choice? if so, pick random
        logger.debug("* Out of choice! Random pick?")
        availableChoice = [1, 2]
    # TODO: try to keep minimum polarity change in the entire network
    thisPolarity = topology.get_polarity(thisNode)
    logger.debug("* It had polarity {}".format(thisPolarity))
    if (
        not thisPolarity
        or availableChoice.count(thisPolarity) < len(availableChoice) / 2
    ):
        # TODO: better design the logic to assign a new polarity
        thisPolarity = random.choice(availableChoice)
    return thisPolarity


def find_random_montecarlo_polarity(
    topology, nodesHaveINR, nodesNoINR, nodesIdxMap, logger
):
    """
    find one random polarity assignment
    @param topology: Topology() object
    @param nodesHaveINR: list
    @param nodesNoINR: dict
    @param nodesIdxMap: list
    @param logger: EmptyLogger() object
    """
    newTopology = deepcopy(topology)
    # go through all nodes that suffer from INR
    for i in range(len(nodesHaveINR)):
        if nodesHaveINR[i][5]:  # has visited, then continue
            continue
        thisNode = nodesHaveINR[i][0]
        thisPolarity = random.choice([1, 2])  # random choice
        newTopology.set_polarity(thisNode, thisPolarity)
        # this node has now been visited
        for idx in nodesIdxMap[thisNode]:
            nodesHaveINR[idx][5] = True  # set `visited` to True
        # set polarity to the linked nodes and set those to be visited
        propagatedNodes = []
        for towardsNode in newTopology.get_linked_sector(thisNode):
            propagatedNodes.append((towardsNode, thisPolarity))
        while len(propagatedNodes) > 0:
            curNode, avoidPolarity = propagatedNodes.pop(0)
            logger.debug("# Propagates to {}".format(curNode))
            curPolarity = 2 if avoidPolarity == 1 else 1
            # maybe curNode is a free node without interference
            if curNode in nodesNoINR:
                nodesNoINR[curNode] = True  # has visited
            # or maybe not, we set nodesHasINR to `has visited`
            for idx in nodesIdxMap.get(curNode, []):
                nodesHaveINR[idx][5] = True
            newTopology.set_polarity(curNode, curPolarity)
            # add next propagation nodes to visit next
            for towardsNode in newTopology.get_linked_sector(curNode):
                if nodesNoINR.get(towardsNode, False) or (
                    nodesIdxMap.get(towardsNode, [])
                    and nodesHaveINR[nodesIdxMap[towardsNode][0]][5]
                ):
                    # has visited
                    continue
                propagatedNodes.append((towardsNode, curPolarity))
    return newTopology


def find_opt_odd_even_polarity_bfs(
    topology, nodesHaveINR, nodesNoINR, nodesIdxMap, logger
):
    """
    bfs search
    @param topology: Topology() object
    @param nodesHaveINR: list
    @param nodesNoINR: dict
    @param nodesIdxMap: dict
    @param logger: EmptyLogger() object
    """
    newTopology = deepcopy(topology)
    # go through all nodes that suffer from INR
    # nodesHaveINR has entries with format
    #   [rx, interferers, overallINR, isPoP, criticality, has visited]
    for i in range(len(nodesHaveINR)):
        if nodesHaveINR[i][5]:  # has visited, then continue
            continue
        thisNode = nodesHaveINR[i][0]
        logger.debug("======= dealing with {}".format(thisNode))
        # order interferer nodes accordingly to max to min INR level
        interfererNodes = sorted(nodesHaveINR[i][1], key=lambda x: -x[1])
        # set polarity to this node
        thisPolarity = derive_polarity_choice(
            newTopology, thisNode, logger, interfererNodes, keepOri=(i == 0)
        )
        newTopology.set_polarity(thisNode, thisPolarity)
        logger.debug("* {} polarity is now {}".format(thisNode, thisPolarity))
        # this node has now been visited
        for idx in nodesIdxMap[thisNode]:
            nodesHaveINR[idx][5] = True  # set `visited` to True
        # set polarity of the linked nodes and status to be `visited`
        propagatedNodes = []
        for towardsNode in newTopology.get_linked_sector(thisNode):
            propagatedNodes.append((towardsNode, thisPolarity))
        while len(propagatedNodes) > 0:
            curNode, avoidPolarity = propagatedNodes.pop(0)
            logger.debug("# Propagates to {}".format(curNode))
            curPolarity = 2 if avoidPolarity == 1 else 1
            # when curNode is free without interference
            if curNode in nodesNoINR:
                # if already visited and have the same polarity to avoid,
                # then we have a problem!
                if (
                    nodesNoINR[curNode]
                    and newTopology.get_polarity(curNode) == avoidPolarity
                ):
                    logger.error("conflict!! how is it possible??")
                    logger.error(
                        "node {} and towardsNode {} are both visited ".format(
                            thisNode, curNode
                        )
                        + "and have the same polarity {}!!".format(avoidPolarity)
                    )
                nodesNoINR[curNode] = True  # has visited
            # when curNode is not free from interference
            #  we set nodesHasINR to `has visited`
            for idx in nodesIdxMap.get(curNode, []):
                # if already visited and polarity is the same as curPolarity,
                # then we have a problem!
                if (
                    nodesHaveINR[idx][5]
                    and newTopology.get_polarity(curNode) == avoidPolarity
                ):
                    logger.error("conflict!! how is it possible??")
                    logger.error(
                        "node {} and towardsNode {} are both visited ".format(
                            thisNode, curNode
                        )
                        + "and have the same polarity {}!!".format(avoidPolarity)
                    )
                nodesHaveINR[idx][5] = True
            newTopology.set_polarity(curNode, curPolarity)
            # add next propagation nodes to visit next
            for towardsNode in newTopology.get_linked_sector(curNode):
                if nodesNoINR.get(towardsNode, False) or (
                    nodesIdxMap.get(towardsNode, [])
                    and nodesHaveINR[nodesIdxMap[towardsNode][0]][5]
                ):
                    # has visited
                    continue
                propagatedNodes.append((towardsNode, curPolarity))
    return newTopology


def find_opt_odd_even_polarity(
    inr_analysis, topology, method, logger, pwr=None, rxImportance=None
):
    """
    perform optimization by altering polarity (odd/even only)
    @param inr_analysis: dict, the inr analysis with max power
    @param topology: Topology() object
    @param method: `greedy` or `montecarlo`
    @param logger: EmptyLogger() object
    @param pwr: dict, this is to help re-derive the inr analysis based on the
                current power
    @param rxImportance: dict, importance of a node
                         this comes from the uni-directional link importance
                         measurement summarized by the traceroute
    """
    # initialize parameters
    if rxImportance is None:
        rxImportance = {}
    # update inr_analysis with current operational power
    if pwr:
        inr_analysis = estimate_inr_from_pwr(inr_analysis, pwr, logger)

    # 1. get nodes that do not suffer from interference at all
    #    this assumes the interference measurement is accurate
    NWithoutINR, NWithINR = separate_interfered_nodes(
        topology, inr_analysis, rxImportance=rxImportance
    )
    # NWithoutINR dict has entries with {rx: has visited}
    NWithoutINR = {x: False for x in NWithoutINR}  # convert it into graph

    # 2. sort nodes based on uni-directional link importance, ordering:
    #    * critical node/uni-link first
    #    * if draw then pop node first
    #    * if draw again then inr first
    # NWithINR list has entries with
    #    [rx, interferers, overallINR, isPoP, criticality, has visited]
    NWithINR = sorted(NWithINR, key=lambda x: (x[4], x[3], x[2]), reverse=True)

    # 3. assign polarity to each node in order
    # 3.1 prepare
    nodesIdxMap = get_nodes_to_index_map(NWithINR, logger)
    if method == "greedy":
        # 3.2 bfs search from most critical to least critical
        newTopology = find_opt_odd_even_polarity_bfs(
            topology, NWithINR, NWithoutINR, nodesIdxMap, logger
        )
    elif method == "montecarlo":
        # 3.2 assign polarity by monte carlo run
        newTopology = find_random_montecarlo_polarity(
            topology, NWithINR, NWithoutINR, nodesIdxMap, logger
        )
    return newTopology, [x for x in NWithoutINR if not NWithoutINR[x]]


def predict_tpc_and_inr(
    est_inr, est_pwr, topology, logger, predictIter=3, targetSINR=None
):
    """
    joint predict tpc and inr assuming polarity not changed
    """
    est_inr_max = deepcopy(est_inr)
    if targetSINR is None:
        targetSINR = {}

    # if necessary, we can emulate link defects
    # (blockage, foliage, etc. for a particular network)
    linkDefects = {}

    # if necessary, we can change seed
    if not est_pwr:
        nodes = topology.get_all_nodes(isConnected=True)
        # set initial power to max power
        for txNode in nodes:
            txTowardsNodes = topology.get_linked_sector(txNode)
            for txTowardsNode in txTowardsNodes:
                txKey = "{0}__{1}".format(txNode, txTowardsNode)
                est_pwr[txKey] = [KEY.MAX_PWR_IDX, KEY.MAX_PWR_DB]
    est_inr = estimate_inr_from_pwr(est_inr_max, est_pwr, logger)

    # iteratively predict inr with the same polarity, assuming tpc
    for i in range(predictIter):
        logger.debug("round {}".format(i))
        # estimate power from the estimated inr
        est_pwr, est_sinr = estimate_pwr_with_inr(
            est_inr,
            est_pwr,
            topology,
            logger,
            linkDefects=linkDefects,
            targetSINR=targetSINR,
        )
        # estimate inr from the estimated power
        est_inr = estimate_inr_from_pwr(est_inr_max, est_pwr, logger)
    return est_pwr, est_sinr, est_inr


def estimate_performance_w_tpc(
    topology,
    est_inr,
    logger,
    ignorePolarity=False,
    rxImportance=None,
    targetSINR=None,
    weight_pop=2,
    scale_critical_node=1,
):
    """
    estimate the performance based on tpc prediction
    @param topology: Topology() object
    @param est_inr: {key: [overallINR, [[agressor, inr, towards], ...]]}
    @param logger: EmptyLogger() object
    @param ignorePolarity: bool, whether we ignore polarity in estimation
    @param rxImportance: dict, node importance; set to None to ignore
    @param targetSINR: dict, target sinr with keys `rx__rxTowards`
    @param weight_pop: the weight of pop node in the evaluation
    @param scale_critical_node: the scale of link/rx importance
    """
    if targetSINR is None:
        targetSINR = {}
    logger.debug("* estimating worst case inr...")
    est_inr_max, __ = estimate_inr_with_polarity(
        est_inr,
        topology,
        ignorePolarity=ignorePolarity,
        rxImportance=rxImportance,
        weight_pop=weight_pop,
        scale_critical_node=scale_critical_node,
    )
    logger.info("* predicting tpc...")
    est_pwr, est_sinr, est_inr = predict_tpc_and_inr(
        est_inr_max, {}, topology, logger, targetSINR=targetSINR
    )
    __, metricWithTpc = estimate_inr_with_polarity(
        est_inr,
        topology,
        ignorePolarity=ignorePolarity,
        rxImportance=rxImportance,
        weight_pop=weight_pop,
        scale_critical_node=scale_critical_node,
    )
    logger.info("* w/ tpc metric: {}dB".format(metricWithTpc))
    return metricWithTpc, est_pwr, est_sinr, est_inr


def derive_potential_link_choices(topology, connectivity, aNode, zNode, logger):
    """
    derive potential links from the connectivity (from `overview_labels`)
    """
    pairChoices = []
    for node, key in [(aNode, KEY.A2Z), (zNode, KEY.Z2A)]:
        if topology.get_linked_sector(node):
            continue
        # otherwise node is not connected to anyone, dangerous!
        # try to find a substitute
        choices = []
        connections = connectivity.get(key, {}).get(KEY.CONNECTIVITY, [])
        for targetNode in connections:
            if ".CN" in targetNode:  # ignore if it is CN node as backup
                continue
            # ignore if target node already connects with 2 links
            if len(topology.get_linked_sector(targetNode)) > 1:
                continue
            choices.append(targetNode)
        logger.info("available choices for {}: {}".format(node, choices))
        if not choices:
            logger.note("Cannot find substitute! abandon the change")
            return []
        if pairChoices:
            newPairChoices = []
            for each in pairChoices:
                for choice in choices:
                    newPairChoices.append([(each[0], each[1]), (node, choice)])
            pairChoices = newPairChoices
        else:
            for choice in choices:
                pairChoices.append((node, choice))
    return pairChoices


def perform_optimization_change_link_trial(
    linkName,
    topology,
    overview,
    ori_inr_analysis,
    method,
    logger,
    rxImportance=None,
    targetSINR=None,
    iterations=10,
    debug=False,
):
    """
    perform single change link optimization based on the current topology
    @param linkName: string, the name of the link to remove
    @param topology: Topology() object
    @param overview: dict, the latest overview containing connectivity
    @param ori_inr_analysis: dict, the inr analysis with max power
    @param method: string, either `greedy` (recommend) or `motecarlo`
    @param logger: EmptyLogger() object
    @param rxImportance: dict, importance of a node
                         this comes from the uni-directional link importance
                         measurement summarized by the traceroute
    @param targetSINR: dict
    @param iterations: integer, number of iterations to estimate TPC
    @param debug: boolean, whether we print more debugging messages
    """
    # backup to prevent changes in the original topology
    topology = deepcopy(topology)
    # remove link (it changes the `topology` object, but not the original)
    logger.info("Removing link {}...".format(linkName))
    aNode, zNode = topology.remove_wireless_link(linkName)
    if aNode is None or zNode is None:
        return None
    # get backup links if removal causes separated links
    logger.info("Deriving potential link choices..")
    pairChoices = derive_potential_link_choices(
        topology, overview.get(linkName, {}), aNode, zNode, logger
    )
    logger.info("Choices replacing {}: {}".format(linkName, pairChoices))
    if not pairChoices:
        return None
    # back up the after removing link topology
    oriTopologyRemovedLink = deepcopy(topology)
    bestMetric = float("inf")
    bestTopology = None
    bestChoice = None
    bestINRAnalysis = None
    # for each link choice, we try and see its performance
    for choice in pairChoices:
        topology = deepcopy(oriTopologyRemovedLink)
        if isinstance(choice, tuple):  # only one link to add
            choice = [choice]  # treated as two links to add
        # add links to topology file
        newLinks = []
        for each in choice:
            orderedNodes = sorted([each[0], each[1]])
            topology.add_wireless_link(orderedNodes[0], orderedNodes[1])
            try:
                newLink = topology.get_link_name(orderedNodes[0], orderedNodes[1])[0]
            except BaseException:
                logger.info("didnt find link name for {}".format(each))
                return None
            newLinks.append(newLink)
            inr_analysis = estimate_inr_from_topology_change(
                ori_inr_analysis, newLink, topology
            )
        # estimate performance with tpc
        est_pwr = None
        minMetric = float("inf")
        minTopology = None
        for __ in range(iterations):
            # do optimization
            prevTopology = deepcopy(topology)
            topology, nodesNotTouched = find_opt_odd_even_polarity(
                inr_analysis,
                topology,
                method,
                logger,
                pwr=est_pwr,
                rxImportance=rxImportance,
            )
            metric, est_pwr, est_sinr, est_inr = estimate_performance_w_tpc(
                topology,
                inr_analysis,
                logger,
                ignorePolarity=False,
                rxImportance=rxImportance,
                targetSINR=targetSINR,
            )
            if metric < minMetric:
                minMetric = metric
                minTopology = prevTopology
        if minMetric < bestMetric:
            bestMetric = minMetric
            bestTopology = minTopology
            bestChoice = newLinks
            bestINRAnalysis = inr_analysis
    logger.info(
        "{} is the best choice - it gives metric: {}dB".format(bestChoice, bestMetric)
    )
    return bestMetric, bestTopology, bestINRAnalysis, bestChoice, linkName


def perform_optimization_change_link(
    est_inr,
    topology,
    overview,
    ori_inr_analysis,
    targetSINR,
    method,
    prevBestMetric,
    logger,
    debug=False,
    rxImportance=None,
):
    """
    optimize the network by changing one link at a time
    @param est_inr: dict, the inr analysis after polarity optimization
    @param topology: Topology() object
    @param overview: dict, the latest overview containing connectivity
    @param ori_inr_analysis: dict, the inr analysis with max power
    @param targetSINR: dict, each link's sinr target
    @param method: string, either `greedy` (recommend) or `motecarlo`
    @param prevBestMetric: float, this is the metric from the previous
                           optimization, if current optimization gets larger
                           metric number than this, then we abandon the change
    @param logger: EmptyLogger() object
    @param debug: boolean, whether we print more debugging messages
    @param rxImportance: dict, importance of a node
                         this comes from the uni-directional link importance
                         measurement summarized by the traceroute
    """
    originalTopology = deepcopy(topology)  # backup
    # focus on the still worst interfered link and look for substitutes
    rxKeys = sorted(est_inr.keys(), key=lambda x: -est_inr[x][0])
    bestMetricTopoChange = prevBestMetric
    bestTopoTopoChange = None
    bestINRAnalysis = None
    bestLinkRemoval = None
    bestLinksAdded = None
    # go through each potential link to change, one at a time
    for rxKey in rxKeys:
        # skip if we do not have strong INR (inr < 0dB)
        if est_inr[rxKey][0] < 0:
            logger.info("{} has small inr {}dB".format(rxKey, est_inr[rxKey][0]))
            continue
        # get corersponding link name
        rx, rxTowards = rxKey.split("__")
        try:
            rxLinkName = topology.get_link_name(rx, rxTowards)[0]
        except BaseException:
            logger.error("{} does not have a link!".format(rxKey))
            continue
        # reset topology
        topology = deepcopy(originalTopology)
        # try changing rxLinkName
        results = perform_optimization_change_link_trial(
            rxLinkName,
            topology,
            overview,
            ori_inr_analysis,
            method,
            logger,
            rxImportance=rxImportance,
            targetSINR=targetSINR,
            iterations=3,
            debug=debug,
        )
        if results is None:
            continue
        metric, topology, inr_analysis, addedLinks, removedLink = results
        # we only pick one change here
        if metric < bestMetricTopoChange:
            logger.info("find better metric: {}".format(metric))
            bestMetricTopoChange = metric
            bestTopoTopoChange = topology
            bestINRAnalysis = inr_analysis
            bestLinkRemoval = removedLink
            bestLinksAdded = addedLinks
    if bestTopoTopoChange is None:
        return originalTopology, (None, None, est_inr, None), None, None
    topology = deepcopy(bestTopoTopoChange)
    metric, est_pwr, est_sinr, est_inr = estimate_performance_w_tpc(
        topology,
        bestINRAnalysis,
        logger,
        ignorePolarity=False,
        rxImportance=rxImportance,
        targetSINR=targetSINR,
    )
    return (
        bestTopoTopoChange,
        (est_pwr, est_sinr, est_inr, metric),
        bestLinkRemoval,
        bestLinksAdded,
    )
