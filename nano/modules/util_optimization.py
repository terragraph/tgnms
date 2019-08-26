#!/usr/bin/env python3

import json

# built-ins
import os
from copy import deepcopy


# modules
try:
    from modules.analyzer_topology_opt import perform_optimization_change_link
    from modules.analyzer_topology_opt import estimate_performance_w_tpc
    from modules.analyzer_topology_opt import find_opt_odd_even_polarity
except BaseException:
    raise


def eval_if_no_polarity(
    myData,
    inr_analysis,
    rxImportance=None,
    debug=False,
    targetSINR=None,
    weight_pop=2,
    scale_critical_node=1,
):
    """
    evaluate the performance when no polarity is assigned
    """
    myData.logger.note("topology eval with no polarity")
    metric, est_pwr, est_sinr, est_inr = estimate_performance_w_tpc(
        myData.topology,
        inr_analysis,
        myData.logger,
        ignorePolarity=True,
        rxImportance=rxImportance,
        targetSINR=targetSINR,
        weight_pop=weight_pop,
        scale_critical_node=scale_critical_node,
    )
    return metric, (est_pwr, est_sinr, est_inr)


def eval_if_current_polarity(
    myData,
    inr_analysis,
    rxImportance=None,
    debug=False,
    targetSINR=None,
    weight_pop=2,
    scale_critical_node=1,
):
    """
    evaluate the performance when no polarity is assigned
    """
    myData.logger.note("topology eval with current polarity")
    metric, est_pwr, est_sinr, est_inr = estimate_performance_w_tpc(
        myData.topology,
        inr_analysis,
        myData.logger,
        ignorePolarity=False,
        rxImportance=rxImportance,
        targetSINR=targetSINR,
        weight_pop=weight_pop,
        scale_critical_node=scale_critical_node,
    )
    return metric, (est_pwr, est_sinr, est_inr)


def perform_golay_optimization(
    myData,
    inr_analysis,
    sinr_target,
    num_of_golay=2,
    rxImportance=None,
    weight_pop=2,
    scale_critical_node=1,
):
    """
    perform golay optimization
    can NOT work with pathreplace for now
    """
    try:
        from modules.util_golay import Golay
    except BaseException:
        raise
    # keep a backup
    new_topology = deepcopy(myData.topology)
    # get estimated inr
    est_metric, est_pwr, est_sinr, est_inr = estimate_performance_w_tpc(
        new_topology,
        inr_analysis,
        myData.logger,
        ignorePolarity=False,
        rxImportance=rxImportance,
        targetSINR=sinr_target,
        weight_pop=weight_pop,
        scale_critical_node=scale_critical_node,
    )
    # derive angle-based connectivity graph
    new_topology.get_graph_w_link_angle()
    # derive interference-based graph
    new_topology.get_graph_w_interfer(est_inr, myData.logger)
    # get most-to-least interfered links rather than sectors
    interfered_links = []
    for rxKey in sorted(list(est_inr.keys()), key=lambda x: -est_inr[x][0]):
        rx, rx_towards = rxKey.split("__")
        this_link = new_topology.get_link_name(rx, rx_towards)
        if this_link:
            interfered_links += this_link
    interfered_links = list(set(interfered_links))
    golay = Golay(new_topology, logger=myData.logger)
    golay.get_golay_w_interfer(
        interfered_links, num_of_golay=num_of_golay, ystreet=True
    )
    # print the golay assignment
    golay.print_golay()
    # apply the new golay assignment to the loaded topology
    new_topology = golay.apply_golay()
    return new_topology, (est_pwr, est_sinr, est_inr, est_metric)


def perform_pathreplace_optimization(
    myData,
    objective,
    method,
    inr_analysis,
    overview,
    sinr_target,
    rxImportance=None,
    iterations=10,
    max_num_links=5,
    weight_pop=2,
    scale_critical_node=1,
):
    """
    perform polarity & path substitution optimization
    (here we do not aim to add backup path)
    @param myData: Data() object with Topology() and loaded data
    @param objective: 'sinr' only for now
    @param method: `greedy` or `montecarlo`
    @param inr_analysis: dict, inr analysis results based on max power
    @param sinr_target: dict, each link's sinr target
    @param rxImportance: dict, node/rx importance
    @param iterations: number of iterations to run
                       set to a large number if using method `montecarlo`
    @param max_num_links: int, number of links to change
    @param weight_pop: the weight of pop node in the evaluation
    @param scale_critical_node: the scale of link/rx importance
    @return new topology (Topology object), tuples (pwr, sinr, inr, metric)
    """
    # step 1: perform polarity optimization to reduce number of links to change
    topology, ests = perform_polarity_optimization(
        myData,
        objective,
        method,
        inr_analysis,
        sinr_target,
        rxImportance=rxImportance,
        iterations=iterations,
        weight_pop=weight_pop,
        scale_critical_node=scale_critical_node,
    )
    if topology is None:
        return None, None
    myData.topology = topology
    bestPwrEst, bestSINREst, bestINREst, bestMetric = ests
    # step 2: loop to change `max_num_links` links from the worst interfered
    # to the least interfered
    est_inr = bestINREst
    addedLinksAll = []
    removedLinksAll = []
    for __ in range(max_num_links):
        newTopology, ests, removedLink, addedLinks = perform_optimization_change_link(
            est_inr,
            myData.topology,
            overview,
            inr_analysis,
            sinr_target,
            method,
            bestMetric,
            myData.logger,
            rxImportance=rxImportance,
        )
        est_pwr, est_sinr, est_inr, metric = ests
        if metric is None or removedLink is None:
            myData.logger.note("no more connectivity to use to mitigate INRs")
            break
        if metric > bestMetric:
            myData.logger.note("getting worse, abandon the change")
        else:
            myData.logger.note("added links: {}".format(addedLinks))
            addedLinksAll += addedLinks
            myData.logger.note("removed link: {}".format(removedLink))
            removedLinksAll.append(removedLink)
            myData.logger.note("reduced to: {}dB".format(metric))
            myData.topology = newTopology
            bestMetric = metric
            bestPwrEst = est_pwr
            bestSINREst = est_sinr
            bestINREst = est_inr
    return (
        deepcopy(myData.topology),
        (
            bestPwrEst,
            bestSINREst,
            bestINREst,
            bestMetric,
            addedLinksAll,
            removedLinksAll,
        ),
    )


def perform_polarity_optimization(
    myData,
    objective,
    method,
    inr_analysis,
    sinr_target,
    rxImportance=None,
    iterations=10,
    weight_pop=2,
    scale_critical_node=1,
):
    """
    perform polarity optimization
    @param myData: Data() object with Topology() and loaded data
    @param objective: 'sinr' only for now
    @param method: `greedy` or `montecarlo`
    @param inr_analysis: dict, inr analysis results based on max power
    @param sinr_target: dict, each link's sinr target
    @param rxImportance: dict, node/rx importance
    @param iterations: number of iterations to run
                       set to a large number if using method `montecarlo`
    @param weight_pop: the weight of pop node in the evaluation
    @param scale_critical_node: the scale of link/rx importance
    @return new topology (Topology object), tuples (pwr, sinr, inr, metric)
    """
    if not objective == "sinr":
        myData.logger.error("Objective {} not supported".format(objective))
        return None, None
    # always assume the power is MAX when inr_analysis is taken
    # for the most accurate estimation
    # set to None to assume Max
    est_pwr = None
    # initialize parameters
    # evaluation metric
    bestMetric = float("inf")
    # new topology to return
    bestTopology = None
    bestPwrEst = None
    bestSINREst = None
    bestINREst = None
    newTopology = deepcopy(myData.topology)
    # iterate
    for __ in range(iterations):
        # first optimize polarity based on current inr analysis
        newTopology, nodesNotTouched = find_opt_odd_even_polarity(
            inr_analysis,
            newTopology,
            method,
            myData.logger,
            pwr=est_pwr,
            rxImportance=rxImportance,
        )
        newMetric, estPwr, estSinr, estInr = estimate_performance_w_tpc(
            newTopology,
            inr_analysis,
            myData.logger,
            ignorePolarity=False,
            rxImportance=rxImportance,
            targetSINR=sinr_target,
            weight_pop=weight_pop,
            scale_critical_node=scale_critical_node,
        )
        # log only if estimation gets better
        if newMetric < bestMetric:
            bestMetric = newMetric
            bestTopology = newTopology
            bestPwrEst = estPwr
            bestSINREst = estSinr
            bestINREst = estInr
            myData.logger.info("found a better metric {}".format(bestMetric))
    myData.logger.note("the best metric {}".format(bestMetric))
    return bestTopology, (bestPwrEst, bestSINREst, bestINREst, bestMetric)


def get_target_sinr(topology, default_sinr, details_sinr_fp):
    """
    get the dict of target sinr for each link
    @param topology: Topology() object
    @param default_sinr: int/float, the default sinr value
    @param default_sinr_fp: string, file path of the json file for each link
                            (not necessarily a complete list, if not sepcified,
                            will use default_sinr)
    """
    # load fp json
    details_sinr = {}
    if details_sinr_fp and os.path.isfile(details_sinr_fp):
        try:
            details_sinr = json.load(open(details_sinr_fp))
        except BaseException:
            pass
    # deriver target SINRs per uni-directional link
    targetSINR = {}
    nodes = topology.get_all_nodes(isConnected=True)
    for rxNode in nodes:
        rxTowardsNodes = topology.get_linked_sector(rxNode)
        for rxTowardsNode in rxTowardsNodes:
            linkName = topology.get_link_name(rxNode, rxTowardsNode)[0]
            rxKey = "{0}__{1}".format(rxNode, rxTowardsNode)
            targetSINR[rxKey] = details_sinr.get(linkName, default_sinr)
    return targetSINR


def optimize(field, args, myData, overview, rxImportance):
    """
    optimization detailed function wrapper
    """
    if myData.topology is None:
        myData.logger.error("topology is None")
        return None, None
    # get inr analysis
    maxINRAnalysis = myData.get_interference_analysis()
    tmp = args["optimization"][field]
    # do optimization
    if field == "polarity":
        objective = tmp.get("objective", "sinr")
        default_sinr = tmp.get("default_target_sinr", 18)
        details_sinr_fp = tmp.get("detailed_target_sinr_fp", None)
        iterations = tmp.get("iterations", 10)
        method = tmp.get("method", "greedy")
        weight_pop = tmp.get("pop_node_weight", 2)
        scale_critical_node = tmp.get("critical_node_scale", 1)
        return perform_polarity_optimization(
            myData,
            objective,
            method,
            maxINRAnalysis,
            get_target_sinr(myData.topology, default_sinr, details_sinr_fp),
            rxImportance=rxImportance,
            iterations=iterations,
            weight_pop=weight_pop,
            scale_critical_node=scale_critical_node,
        )
    elif field == "pathreplace":
        objective = tmp.get("objective", "sinr")
        default_sinr = tmp.get("default_target_sinr", 18)
        details_sinr_fp = tmp.get("detailed_target_sinr_fp", None)
        iterations = tmp.get("iterations", 10)
        method = tmp.get("method", "greedy")
        weight_pop = tmp.get("pop_node_weight", 2)
        scale_critical_node = tmp.get("critical_node_scale", 1)
        max_num_links = tmp.get("max_num_links", 5)
        return perform_pathreplace_optimization(
            myData,
            objective,
            method,
            maxINRAnalysis,
            overview,
            get_target_sinr(myData.topology, default_sinr, details_sinr_fp),
            rxImportance=rxImportance,
            iterations=iterations,
            weight_pop=weight_pop,
            max_num_links=max_num_links,
            scale_critical_node=scale_critical_node,
        )
    elif field == "golay":
        num_of_golay = tmp.get("num_of_golay", 2)
        default_sinr = tmp.get("default_target_sinr", 18)
        details_sinr_fp = tmp.get("detailed_target_sinr_fp", None)
        weight_pop = tmp.get("pop_node_weight", 2)
        scale_critical_node = tmp.get("critical_node_scale", 1)
        return perform_golay_optimization(
            myData,
            maxINRAnalysis,
            get_target_sinr(myData.topology, default_sinr, details_sinr_fp),
            num_of_golay=num_of_golay,
            rxImportance=rxImportance,
            weight_pop=weight_pop,
            scale_critical_node=scale_critical_node,
        )
    return None, None
