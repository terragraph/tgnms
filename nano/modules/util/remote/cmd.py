#!/usr/bin/env python3

# built-in
import os
import threading
import time

# modules
from modules.addon_misc import dump_result
from modules.util.aggregation.p2mp_test import Aggregation
from modules.util.remote.base import (
    action_to_server,
    batch_action_to_nodes,
    get_nodes_for_link_test,
    iperf_reset,
    reenable_tpc,
)
from modules.util.remote.monitor import monitor_each_wrapper
from modules.util.remote.multihop import (
    multihop_test_each_wrapper,
    prepare_multihop_test_pair,
    prepare_multihop_test_set,
)
from modules.util.remote.p2mp import (
    get_p2mp_links_list,
    get_time_slot_links,
    get_time_slot_nodes,
)
from modules.util.remote.p2p import dump_iperf_result, run_p2p_iperf
from modules.util.remote.ping import ping_test_each
from modules.util.remote.scan import im_scan_all, im_scan_each
from tool.analyzer import do_single_analysis


def fetch_phy_layer_info(__vm, parallel=False, pnum="inf"):
    """
    Get a snapshot of channel infos by logining in each sector via SSH
    (current beam direction, power index, and snr)
    """
    pnum = float(pnum)
    __vm.logger.note("Fetching physical layer info. parallel: {0}".format(parallel))
    __vm.tg_enable_logging(args=__vm.params, logger=__vm.logger)
    batch_action_to_nodes(
        __vm,
        {},
        "fetch_phy_layer_info",
        clear_known_host=True,
        parallel=parallel,
        pnum=pnum,
    )
    topo_extra_fp = "{0}/topology_{1}_extra.json".format(
        __vm.params["output_folder"], __vm.params["network_name"]
    )
    __vm.topology.dump_topology_extra(topo_extra_fp)
    __vm.tg_disable_logging(args=__vm.params, logger=__vm.logger)
    return topo_extra_fp


def fetch_fw_config_all(__vm, parallel=False, pnum="inf"):
    """
    Fetch all fw config
    @param __vm:
        default: NANO server LOCAL_TG object
        backup: controller REMOTE_TG() object
    @param parallel: use parallel threading to speed up/run things fast
    @param pnum: number of parallel processes, default infinity
    @return (output file path, result dictionary)
    """
    pnum = float(pnum)
    __vm.logger.note("Fetching all fw config info.")
    fw_config_results = {}
    batch_action_to_nodes(
        __vm,
        fw_config_results,
        "get_fw_config",
        clear_known_host=False,
        parallel=parallel,
        pnum=pnum,
    )
    out_fp_no_suffix = "{0}/fw_config_{1}".format(
        __vm.params["output_folder"], int(time.time() * 1000)
    )
    out_fp = dump_result(
        out_fp_no_suffix, fw_config_results, __vm.logger, use_pickle=True
    )
    return (out_fp, fw_config_results)


def iperf_p2p_test_wrapper(
    __vm,
    targets=None,
    parallel=False,
    variable_traffic_loading=False,
    duration=10,
    pnum="inf",
    iperf_layer="link",
    traffictype=None,
    fixpoweridx=None,
):
    """
    Iperf Test on Terra Interface
    @param __vm:
        default: NANO server LOCAL_TG object
        backup: controller REMOTE_TG() object
    @param targets:
        a list of target tx nodes to test; set None to test all valid nodes
    @param parallel: use parallel threading to speed up/run things fast
    @param variable_traffic_loading: used to enable variable traffic loading
        based on DOF in P2MP configuration
    @param pnum: number of parallel processes, default infinity
    @param iperf_layer: default `link` layer
    @param traffictype: list of tcp and/or udp, e.g., ["tcp", "udp"]
    @param fixpoweridx: we can fix power to test particular target(s)
    @return (output file path, result dictionary)
    """
    pnum = float(pnum)
    __vm.logger.note("Starting iPerf P2P.")
    __vm.logger.info("Resetting iPerf on all nodes.")

    # iperf_reset shall use parallel operation
    iperf_reset(__vm, pnum)

    iperf_session_num = __vm.params["tests"]["iperf_p2p"]["sessions"]
    # restart systemd-logind just in case
    __vm.restart_systemd_logind()

    # get what sectors and links to test
    sector_pair_to_test, _skipped_sectors = get_nodes_for_link_test(
        __vm, targets, input_session_num=iperf_session_num
    )

    # run iperf3 on defined network layer for each target
    __vm.logger.info(
        "iperf on {0} links, starting run_p2p_iperf".format(len(sector_pair_to_test))
    )
    iperf_result = {}

    # run p2p iperf on all links of sector_pair_to_test
    iperf_result = run_p2p_iperf(
        __vm,
        sector_pair_to_test,
        fixpoweridx,
        traffictype,
        parallel,
        variable_traffic_loading,
        pnum,
        iperf_layer,
        duration,
        iperf_result,
    )

    # re-enable tpc
    reenable_tpc(__vm, fixpoweridx, sector_pair_to_test)

    # dump iperf results
    out_fp = dump_iperf_result(__vm, iperf_layer, iperf_result)

    # kill all iperfs
    iperf_reset(__vm, pnum)

    return (out_fp, iperf_result)


def iperf_p2mp_test_wrapper(__vm, args):
    """
    P2MP Iperf Test on Terra Interface for Scheduling Allocation Fairness Analysis

    @param __vm:
        default: NANO server LOCAL_TG object
        backup: controller REMOTE_TG() object
    @return (output file path, result dictionary)

    targets: a list of target tx nodes to test; set None to test all valid nodes
    parallel: use parallel threading to speed up/run things fast
    variable_traffic_loading: used to enable variable traffic loading
        based on DOF in P2MP configuration
    pnum: number of parallel processes, default infinity
    iperf_layer: default `link` layer
    traffictype: list of tcp and/or udp, e.g., ["tcp", "udp"]
    fixpoweridx: we can fix power to test particular target(s)
    traffic_direction: p2mp traffic direction
    """

    targets = args["tests"]["iperf_p2mp"]["tx"]
    parallel = args["parallel"]
    variable_traffic_loading = args["variable_traffic_loading"]
    duration = args["tests"]["iperf_p2mp"]["duration"]
    pnum = args["parallel_threads_limit"]
    iperf_layer = args["tests"]["iperf_p2mp"]["layer"]
    traffictype = args["tests"]["iperf_p2mp"]["type"]
    fixpoweridx = args["tests"]["iperf_p2mp"].get("fixpower", None)
    traffic_direction = args["tests"]["iperf_p2mp"]["direction"]

    pnum = float(pnum)
    __vm.logger.note("Starting iPerf P2MP.")
    __vm.logger.info("Resetting iPerf on all nodes.")

    # iperf_reset shall use parallel operation
    iperf_reset(__vm, pnum)

    iperf_session_num = __vm.params["tests"]["iperf_p2mp"]["sessions"]
    # restart systemd-logind just in case
    __vm.restart_systemd_logind()

    # get what sectors and links to test
    sector_pair_to_test, _skipped_sectors = get_nodes_for_link_test(
        __vm, targets, input_session_num=iperf_session_num
    )
    analysis_threads = []

    # setup aggregator object
    aggregator_obj = Aggregation()

    # get p2mp nodes to test from sector_pair_to_test
    p2mp_links_list = get_p2mp_links_list(__vm, sector_pair_to_test, traffic_direction)

    for time_slot in p2mp_links_list:
        iperf_result = {}
        if time_slot["links"]:
            # run iperf3 on defined network layer for each target
            __vm.logger.info(
                "iperf on {0} links, starting run_p2mp_iperf".format(
                    len(time_slot["links"])
                )
            )

            # run p2p iperf on all links in the corresponding time_slot
            iperf_result = run_p2p_iperf(
                __vm,
                time_slot["links"].keys(),
                fixpoweridx,
                traffictype,
                parallel,
                variable_traffic_loading,
                pnum,
                iperf_layer,
                duration,
                iperf_result,
                True,
                time_slot["links"],
            )

            # kill iperf on specific nodes
            iperf_reset(
                __vm, pnum, nodes=get_time_slot_nodes(time_slot["links"].keys())
            )

            # dump iperf results
            time_slot_file_path = dump_iperf_result(
                __vm,
                iperf_layer,
                iperf_result,
                p2mp_time_slot=time_slot["time_slot_index"],
            )
            args["tests"]["iperf_p2mp"]["fp"] = time_slot_file_path

            # start analysis of iperf_result
            if args["perform_analysis_immediate"]:
                analysis_thread = threading.Thread(
                    target=do_single_analysis,
                    args=(
                        "iperf_p2mp",
                        args,
                        {
                            "time_slot_file_path": os.path.dirname(time_slot_file_path),
                            "time_slot_links": get_time_slot_links(
                                __vm, time_slot["links"].keys()
                            ),
                            "aggregator_obj": aggregator_obj,
                        },
                    ),
                )
                analysis_threads.append(analysis_thread)
                analysis_thread.start()

    # wait for the all analysis threads to finish
    try:
        __vm.logger.note("Waiting for analysis to finish.")
        [thread.join(timeout=duration) for thread in analysis_threads]
    except KeyboardInterrupt:
        __vm.logger.note("Keyboard interrupted.")
        return

    # dump p2mp aggregated data
    aggregator_obj.dump_aggregated_data(
        file_path=__vm.params["output_folder"] + "/p2mp/",
        file_name="aggregated_p2mp_iperf",
    )

    # re-enable tpc
    reenable_tpc(__vm, fixpoweridx, sector_pair_to_test)


def multihop_test_wrapper(
    __vm,
    targets=None,
    parallel=False,
    duration=100,
    pnum="inf",
    traffictype=None,
    direction="southbound",
):
    """
    Multihop Iperf Performance Test
    @param __vm:
        default: NANO server LOCAL_TG object
        backup: controller REMOTE_TG() object
    @param targets: a list of target nodes to test if any
    @param parallel: use parallel threading to speed up/run things fast
    @param pnum: number of parallel processes, default infinity
    @param traffictype: list of tcp and/or udp, e.g., ["tcp", "udp"]
    @param direction: northbound - sector->server or southbound - server->sector
    @return (output file path, result dictionary)
    """
    pnum = float(pnum)
    __vm.logger.note("Starting iPerf multihop.")
    __vm.logger.info("Before test, resetting iperf on all nodes.")
    server_location = __vm.params["tests"]["iperf_multihop"]["server_location"]
    # prepare for multihop
    sector_set = prepare_multihop_test_set(__vm, targets, pnum)
    index = 0
    # multihop_result init.
    multihop_result = {}
    threads = []
    for sector in sector_set:
        index += 1
        __vm.logger.note(
            "Multihop session index = {0}, total session = {1}".format(
                index, len(sector_set)
            )
        )
        tx, rx = prepare_multihop_test_pair(
            __vm, direction, sector, server_location, multihop_result
        )
        if parallel:
            if len(threads) > pnum:
                [t.join() for t in threads]
                del threads[:]
            my_thread = threading.Thread(
                target=multihop_test_each_wrapper,
                args=(
                    __vm,
                    server_location,
                    sector,
                    multihop_result,
                    direction,
                    duration,
                    traffictype,
                ),
            )
            __vm.logger.info(
                "multihop for {0}, total_threads= {1}".format(sector, len(threads))
            )
            threads.append(my_thread)
            my_thread.start()
        else:
            __vm.logger.debug("multihop iperf on {0} sectors".format(len(sector_set)))
            multihop_test_each_wrapper(
                __vm,
                server_location,
                sector,
                multihop_result,
                direction=direction,
                duration=duration,
                traffic=traffictype,
            )
            __vm.logger.debug(
                "sector = {}, multihop result size = {}".format(
                    sector, len(multihop_result)
                )
            )
            __vm.logger.debug(
                "multihop result, keys = {}".format(multihop_result.keys())
            )
    # if parallel, wait until all iperf3 test has finished
    if parallel:
        [t.join() for t in threads]
    out_fp_no_suffix = "{0}/iperf_multihop_{1}_{2}".format(
        __vm.params["output_folder"], direction, int(time.time() * 1000)
    )
    # dump multihop results
    out_fp = dump_result(out_fp_no_suffix, multihop_result, __vm.logger, use_JSON=True)
    # afterwards, kill all iperfs
    __vm.logger.note("After test, resetting iPerf on all nodes.")
    # iperf_reset action shall be parallel by default
    iperf_reset(__vm, pnum)

    # iperf_reset on the server
    if __vm.params["tests"]["iperf_multihop"]["server_location"] == "vm":
        action_to_server(__vm, "iperf_reset", clear_known_host=False)
    return (out_fp, multihop_result)


def monitor_wrapper(__vm, targets=None, parallel=False, duration=10, pnum="inf"):
    """
    Terragraph link monitoring
    @param __vm:
        default: NANO server LOCAL_TG object
        backup: controller REMOTE_TG() object
    @param targets:
        a list of target tx nodes to test; set None to test all valid nodes
    @param parallel: use parallel threading to speed up/run things fast
    @param pnum: number of parallel processes, default infinity
    @param layer: default `link` layer
    @return (output file path, result dictionary)
    """
    pnum = float(pnum)
    __vm.logger.note("Starting monitoring.")
    # reset iperf
    __vm.logger.info("Resetting iperf on all nodes just in case.")
    batch_action_to_nodes(
        __vm, {}, "iperf_reset", clear_known_host=False, parallel=parallel, pnum=pnum
    )
    monitor_result = {}
    threads = []
    # restart systemd-logind just in case
    __vm.restart_systemd_logind()
    # get what sectors to test
    sector_pair_to_test, skipped_sectors = get_nodes_for_link_test(__vm, targets)
    # run iperf3 on defined network layer for each target
    __vm.logger.info("monitoring on {} links".format(len(sector_pair_to_test)))
    for tx, rx in sector_pair_to_test:
        if tx not in monitor_result:
            monitor_result[tx] = {}
        if rx not in monitor_result[tx]:
            monitor_result[tx][rx] = {}
        if parallel:
            if len(threads) > pnum:
                [t.join() for t in threads]
                del threads[:]
            my_thread = threading.Thread(
                target=monitor_each_wrapper,
                args=(__vm, tx, rx, monitor_result, duration),
            )
            threads.append(my_thread)
            my_thread.start()
        else:
            monitor_each_wrapper(__vm, tx, rx, monitor_result, duration=duration)
    if parallel:
        [t.join() for t in threads]
    out_fp_no_suffix = "{0}/monitor_{1}".format(
        __vm.params["output_folder"], int(time.time() * 1000)
    )
    print(
        "Finished monitoring for all links, dumping result to {}".format(
            out_fp_no_suffix
        )
    )
    out_fp = dump_result(out_fp_no_suffix, monitor_result, __vm.logger, use_pickle=True)
    __vm.logger.info("Finished monitoring")
    return (out_fp, monitor_result)


def ping_test_wrapper(
    __vm, targets=None, parallel=False, pnum="inf", layer="link", duration=15
):
    """
    Ping Test Wrapper
    @param __vm:
        default: NANO server LOCAL_TG object
        backup: controller REMOTE_TG() object
    @param targets:
        a list of target tx nodes to test; set None to test all valid nodes
    @param parallel: use parallel threading to speed up/run things fast
    @param pnum: number of parallel processes, default infinity
    @param layer: default on `link` layer (on `terrax`);
                  can also set to `network` (on `lo`)
    @return (output file path, result dictionary)
    """
    pnum = float(pnum)
    ping_result = {}
    threads = []
    # restart systemd-logind just in case
    __vm.restart_systemd_logind()
    # get what sectors to test
    sector_pair_to_test, skipped_sectors = get_nodes_for_link_test(__vm, targets)
    # ping on defined network layer for each target
    for tx, rx in sector_pair_to_test:
        if tx not in ping_result:
            ping_result[tx] = {}
        if rx not in ping_result[tx]:
            ping_result[tx][rx] = {}
        if parallel:
            if len(threads) > pnum:
                [t.join() for t in threads]
                del threads[:]
            my_thread = threading.Thread(
                target=ping_test_each, args=(__vm, tx, rx, ping_result, layer, duration)
            )
            threads.append(my_thread)
            my_thread.start()
        else:
            ping_test_each(__vm, tx, rx, ping_result, layer=layer, duration=duration)
    # if parallel, wait until all ping test has finished
    if parallel:
        [t.join() for t in threads]
    out_fp_no_suffix = "{0}/ping_{1}_layer_{2}".format(
        __vm.params["output_folder"], layer, int(time.time() * 1000)
    )
    out_fp = dump_result(out_fp_no_suffix, ping_result, __vm.logger, use_pickle=True)
    return (out_fp, ping_result)


def im_scan_wrapper(__vm, targets, tx_power=None, scan_mode=None, to_mongo_db=False):
    """
    Do IM scan and output results to folder
    Differed from others, here we set to scan all sectors as rx
    @param __vm:
        default: NANO server LOCAL_TG object
        backup: controller REMOTE_TG() object
    @param txPower: if None, don't use --tx_power_index arg in tg cli
    """
    __vm.logger.note("Preparing to start IM scan.")
    # create folder for the result
    tg_scan_ofp = "{0}/tg_scan_result".format(__vm.params["output_folder"])
    try:
        if not os.path.isdir(tg_scan_ofp):
            os.makedirs(tg_scan_ofp)
    except BaseException as ex:
        __vm.logger.error(ex)
        return False
    # use the new tg scan cli if targets are not specified
    if targets:
        rx_nodes = __vm.topology.get_all_nodes(withMAC=True, withIP=True)
        # loop over all tx nodes as initiator
        for tx in targets:
            im_scan_each(__vm, tx, rx_nodes, tg_scan_ofp)
    else:
        im_scan_all(
            __vm,
            tg_scan_ofp,
            output_folder=__vm.params["output_folder"],
            tx_power=tx_power,
            scan_mode=scan_mode,
            to_mongo_db=to_mongo_db,
        )
    return tg_scan_ofp
