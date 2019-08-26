#!/usr/bin/env python3

import argparse
import multiprocessing

# built-ins
import os
import sys
from random import randint


# modules
sys.path.append("../")
try:
    from modules.util_data_loader import Data
    from modules.util_math import db2pwr, pwr2db
    from modules.util_interference import Interfer, NOISE_FLOOR_db
    from modules.analyzer_health_check import analyze_interference
    from modules.addon_misc import dump_result
except BaseException:
    raise

# global param
MULTI_PROCESS_LOCK = multiprocessing.Lock()


def do_connectivity_graph_analysis(args, myData):
    """
    build up a connectivity graph
    """
    try:
        from modules.analyzer_topology_opt import (
            analyze_connectivity_graph,
            show_connectivity_graph,
        )

        # from modules.addon_graph_gen import connectivity_graph_gen
    except BaseException:
        raise
    count_micro_routes, count_macro_routes, result = analyze_connectivity_graph(
        myData, target=args["target_snr"]
    )
    # show result
    show_connectivity_graph(result, count_micro_routes, count_macro_routes)
    # dump analysis result to file
    out_fp_no_suffix = "{0}/micro_macro_routes_{1}dB".format(
        args["folder"], args["target_snr"]
    )
    out_fp = dump_result(out_fp_no_suffix, result, myData.logger, use_JSON=True)
    return out_fp


def _evaluate_polarity_effectiveness(myData, myInterfer):
    # quickly reformat dict topology if myData is dict rather than Data object
    class PolarityObj(object):
        def __init__(self, data):
            self.data = data

        def get_polarity(self, node):
            try:
                if isinstance(self.data, dict):
                    return self.data[node]
                else:
                    return self.data.topology.get_polarity(node)
            except BaseException:
                return None

    # get overall INR
    sector_inrs = myInterfer.get_interfer_sectors(use_max_power=False)
    rxINRList = analyze_interference(
        sector_inrs, PolarityObj(myData), check_polarity=True
    )
    overallINR = 0
    for rxNode in rxINRList:
        overallINR += db2pwr(rxINRList[rxNode][0] + NOISE_FLOOR_db)
    return pwr2db(overallINR) - NOISE_FLOOR_db


def _search_suboptimal_polarity_one(
    baseNum, len_nodesToTouch, nodesToTouch, topo, myInterfer
):
    newPolarityList = {}
    touch_polarity = format(baseNum, "{0}b".format(len_nodesToTouch))
    for i in range(len_nodesToTouch):
        newPolarityList[nodesToTouch[i]] = touch_polarity[i] == "1"
        for node in topo.get_linked_sector(nodesToTouch[i]):
            newPolarityList[node] = not newPolarityList[nodesToTouch[i]]
            for node_l in topo.get_linked_sector(node):
                if not nodesToTouch[i] == node_l:
                    newPolarityList[node_l] = newPolarityList[nodesToTouch[i]]
    return (
        newPolarityList,
        _evaluate_polarity_effectiveness(newPolarityList, myInterfer),
    )


def _search_suboptimal_polarity_batch(
    baseNum, node2touch, myData, myInterfer, result, limit_counter=10000
):
    counter = 0
    best_val = float("inf")
    best_baseNum = None
    while counter < limit_counter:
        tmp_num = randint(0, baseNum)
        _l, tmp_val = _search_suboptimal_polarity_one(
            tmp_num, len(node2touch), node2touch, myData.topology, myInterfer
        )
        if best_val > tmp_val:
            best_val = tmp_val
            best_baseNum = tmp_num
        # don't wait if already very low
        if tmp_val < 0:
            best_val = tmp_val
            best_baseNum = tmp_num
            break
        counter += 1
    MULTI_PROCESS_LOCK.acquire()
    result.put((best_val, best_baseNum))
    MULTI_PROCESS_LOCK.release()


def _search_suboptimal_polarity(node2touch, myData, myInterfer, num_of_process=20):
    """
    The root function is `_search_suboptimal_polarity` and it uses
    `_search_suboptimal_polarity_batch` and `_search_suboptimal_polarity_one`.

    In `_search_suboptimal_polarity`, we initialize `num_of_process` processes
    and run `_search_suboptimal_polarity_batch` in parallel.
    Each `_search_suboptimal_polarity_batch` will take care of
    randomization and call 10k iterations of
    `_search_suboptimal_polarity_one` with 10k random polarity assignments.
    We evaluate each iteration with overall INR (aggregated INR across all
    nodes) and find the polarity assignment w/ minimal overall INR
    (out of [10k *  `num_of_process`] iterations).
    Each iteration has a very small probability to collide.

    Based on above procedure, it gives the suboptimal solution out of
    [10k *  `num_of_process`] iterations.
    """
    # search for the suboptimal polarity assignment
    baseNum = int(pow(2, len(node2touch)) - 1)
    processes = []
    result = multiprocessing.Queue()
    for _i in range(num_of_process):
        my_process = multiprocessing.Process(
            target=_search_suboptimal_polarity_batch,
            args=(baseNum, node2touch, myData, myInterfer, result),
        )
        processes.append(my_process)
        my_process.start()
    [p.join() for p in processes]
    best_val, best_baseNum = result.get(0)
    for i in range(len(processes)):
        if i == 0:
            continue
        tmp_val, tmp_baseNum = result.get(i)
        if tmp_val < best_val:
            best_val = tmp_val
            best_baseNum = tmp_baseNum
    return _search_suboptimal_polarity_one(
        best_baseNum, len(node2touch), node2touch, myData.topology, myInterfer
    )


def count_hw_hybrid(myData, polarityList):
    counterHWHybrid = 0
    siteDict = {}
    for node in polarityList:
        site = myData.topology.get_site_name(node)
        if site not in siteDict:
            siteDict[site] = []
        siteDict[site].append(polarityList[node])
    for site in siteDict:
        if len(set(siteDict[site])) > 1:
            myData.logger.debug("{0} has hw hybrid".format(site))
            myData.logger.debug("{} {}".format(siteDict[site], set(siteDict[site])))
            counterHWHybrid += 1
    return counterHWHybrid


def do_optimization_polarity(args, myData, myInterfer):
    """
    optimize polarity (hardware hybrid) based on actual im scan results
    TODO: here we do not optimize and change from/to normal links to/from
    y-street, we will leave it as it is, and assign polarity accordingly
    """
    # construct a list of linked-list for nodes to touch
    node2touch = []
    node2pair = {}
    polarityList = {}
    for node in myData.topology.get_all_nodes():
        # skip if not connected
        if not myData.topology.is_connected(node):
            continue
        polarityList[node] = myData.topology.get_polarity(node) is 1
        # skip if we already know it
        if node in node2pair:
            continue
        for node_l in myData.topology.get_linked_sector(node):
            if node not in node2touch and node_l not in node2pair:
                node2touch.append(node)
                node2pair[node_l] = node
            elif node in node2touch and node_l not in node2pair:
                # we ignore for y-street (as it must be opposite polarity)
                node2pair[node_l] = node
    curCountHWHybrid = count_hw_hybrid(myData, polarityList)
    ori_overallINR = _evaluate_polarity_effectiveness(myData, myInterfer)
    myData.logger.note("original overall inr {0:.2f}dB".format(ori_overallINR))
    myData.logger.note("total of {0} HW hybrid sites".format(curCountHWHybrid))
    newPolarityList, overallINR = _search_suboptimal_polarity(
        node2touch, myData, myInterfer, num_of_process=args["pnum"]
    )
    newCountHWHybrid = count_hw_hybrid(myData, newPolarityList)
    myData.logger.note(
        "found combination with overall inr {0:.2f}dB".format(overallINR)
    )
    myData.logger.note("total of {0} HW hybrid sites".format(newCountHWHybrid))
    for node in newPolarityList:
        if newPolarityList[node]:
            myData.topology.set_polarity(node, 1)
        else:
            myData.topology.set_polarity(node, 2)
    myData.logger.note("Generating new topology config file...")
    filename = args["topology"].rstrip(".json").split("/")[-1]
    myData.topology.dump_topology(
        "{0}/{1}_measurement_based_polarity.json".format(args["folder"], filename)
    )


def do_optimization_golay(args, myData, myInterfer):
    """
    optimize golay based on actual im scan results
    """
    try:
        from modules.util_golay import Golay
    except BaseException:
        raise
    # derive angle-based connectivity graph
    myData.topology.get_graph_w_link_angle()
    # derive interference-based graph
    myData.topology.get_graph_w_interfer(myInterfer)
    # get most-to-least interfered sectors
    interfer_links = myInterfer.get_interfer_links()
    myGolay = Golay(myData.topology, logger=myData.logger)
    myGolay.get_golay_w_interfer(
        interfer_links,
        num_of_golay=args["num"],
        ystreet=(not args["no_ystreet"]),
        weight=args["weight"],
    )
    # print the golay assignment
    myGolay.print_golay()
    # apply the new golay assignment to the loaded topology
    myGolay.apply_golay()
    myGolay.logger.note("Generating new topology config file...")
    filename = args["topology"].rstrip(".json").split("/")[-1]
    myData.topology.dump_topology(
        "{0}/{1}_measurement_based_golay.json".format(args["folder"], filename)
    )


def _find_file(file_list, keyword, exclude_kw=""):
    """
    Find file with keyword in it in the file_list
    """
    for f in file_list:
        if keyword in f:
            if not exclude_kw or exclude_kw not in f:
                return f
    return ""


def redefine_args(args):
    files = [x for x in os.listdir(args["folder"])]
    if _find_file(files, "_extra"):
        args["extra"] = "{0}/{1}".format(args["folder"], _find_file(files, "_extra"))
    if _find_file(files, "tg_scan_result"):
        args["im_scan"] = "{0}/{1}".format(
            args["folder"], _find_file(files, "tg_scan_result")
        )
    if not args["topology"] and _find_file(files, "topo", exclude_kw="extra"):
        args["topology"] = "{0}/{1}".format(
            args["folder"], _find_file(files, "topo", exclude_kw="extra")
        )


def optimizer_wrapper(args):
    # mkdir if it does not exist
    if not os.path.isdir(args["folder"]):
        try:
            os.makedirs(args["folder"])
        except BaseException:
            raise
    # get file if not specify input file path
    redefine_args(args)
    # load data
    myData = Data(loggerTag="DATA", logPathDir=args["folder"])
    if not args["topology"] or not args["extra"] or not args["im_scan"]:
        myData.logger.error(
            "must have topology, extra phy info, and IM results to continue"
        )
        return False
    if not myData.load_topology(args["topology"]):
        myData.logger.error("error loading topology")
        return False
    if not myData.load_topology_extra(args["extra"]):
        myData.logger.error("error loading phy info")
        return False
    if not myData.load_data_im_all(args["im_scan"]):
        myData.logger.error("error loading im scan")
        return False
    myInterfer = Interfer(
        myData.topology, loggerTag="Interference", logPathDir=args["folder"]
    )
    myInterfer.get_interference_from_data(myData.get_im_data(), out_fp=args["folder"])
    # for now polarity and golay are independent/separated
    if args["polarity"]:
        do_optimization_polarity(args, myData, myInterfer)
    elif args["golay"]:
        do_optimization_golay(args, myData, myInterfer)
    if args["routes"]:
        do_connectivity_graph_analysis(args, myData)


def main():
    """
    Optimizer Tool
    """
    parser = argparse.ArgumentParser(description="Optimizer Tool")
    parser.add_argument("name", help="network name")
    parser.add_argument(
        "--folder",
        "-f",
        action="store",
        default="/tmp/",
        help="folder path for analysis data/result, default is /tmp/",
    )
    parser.add_argument(
        "--topology",
        "-tp",
        action="store",
        default="",
        help=(
            "file path for topology; "
            + "(beta) if not set, will try to find it from -f"
        ),
    )
    parser.add_argument(
        "--extra",
        action="store",
        default="",
        help=(
            "file path for extra phy topology file; "
            + "(beta) if not set, will try to find it from -f"
        ),
    )
    parser.add_argument(
        "--im_scan",
        action="store",
        default="",
        help=(
            "Specify IM scan result folder path; "
            + "(beta) if not set, will try to find it from -f"
        ),
    )
    # golay-related
    parser.add_argument(
        "--golay",
        "-g",
        action="store_true",
        default=False,
        help=("Optimize Golay based on actual interference measurements"),
    )
    parser.add_argument(
        "--num", action="store", type=int, default=2, help="number of golay code"
    )
    parser.add_argument(
        "--no_ystreet",
        action="store_true",
        default=False,
        help="Whether assuming Y-street",
    )
    parser.add_argument(
        "--weight",
        action="store",
        default=10,
        help="Tuning parameter for improving assignment",
    )
    # polarity related
    parser.add_argument(
        "--polarity",
        "-p",
        action="store_true",
        default=False,
        help=("Optimize polarity based on actual interference measurements"),
    )
    parser.add_argument(
        "--pnum",
        action="store",
        type=int,
        default=10,
        help="number of parallel process to run; the higher the better",
    )
    # micro/macro routes related
    parser.add_argument(
        "--routes",
        action="store_true",
        default=False,
        help=("Derive micro/macro routes for future analysis"),
    )
    parser.add_argument(
        "--target_snr",
        action="store",
        type=int,
        default=15,
        help=("specify minimal snr for finding routes, by default 15dB"),
    )
    try:
        args = vars(parser.parse_args())
    except BaseException:
        sys.exit()
    if args["folder"] is not None and not os.path.isdir(args["folder"]):
        print("Folder does not exist!")
        sys.exit()
    optimizer_wrapper(args)


if __name__ == "__main__":
    main()
