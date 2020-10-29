#!/usr/bin/env python3

import os
import random
import threading
import time

import gevent
import modules.keywords as KEY
from modules.addon_misc import dump_result
from modules.addon_parser_health_check import parse_iperf_output, parse_ping_output
from modules.analyzer_health_check import convert_rate
from modules.util.remote.base import (
    MULTI_THREAD_LOCK,
    reenable_tpc_check,
    spawn_new_login,
)


def _iperf_test_launch_rx_fast(__vm, tx, rx, rx_ip, port=5201):
    """
    @param __vm:
        default: NANO server LOCAL_TG object
        backup: controller REMOTE_TG() object
    @param tx: string, tx name
    @param rx: string, rx name
    @param rx_ip: string, ip address of rx
    @param port: int, port number to launch iperf server
    @return bool, indicating succeeded or not
    """
    status = True
    # login to the desired rx node to run iperf3 client
    __i = spawn_new_login(
        __vm.params,
        loggerTag="{0}__{1}.iperf".format(tx, rx),
        destination="sector",
        sectorIP=rx_ip,
    )
    if __i is None:
        __vm.logger.error("cannot log onto {0} to launch rx iperf".format(rx))
        return False
    # run iperf server (in the background, non-blocking)
    __i.logger.debug("Run iperf server on {0}.".format(rx_ip))
    if not __i.iperf_server(port=port):
        __i.logger.error("Could not setup iperf server.")
        status = False
    # get out of rx
    __i.close_all()
    __i.logger.disable()
    __i = None
    return status


def _link_test_launch_tx_fast(
    __vm,
    tx_info,
    rx_info,
    duration,
    udp=True,
    port=5201,
    bitrate="100M",
    iperf_layer="link",
):
    """
    Launch iperf client, launch ping and test traceroute from tx
    @param __vm:
        default: NANO server LOCAL_TG object
        backup: controller REMOTE_TG() object
    @param tx_info: tx name, inband ip, and its MAC
    @param rx_info: rx name, inband ip, and its MAC
    @param duration: for how long the test should be
    @param udp: whether run udp; by default true
    @param port: port number
    @param bitrate: source bit rate; by default 100Mbps
    """
    tx, tx_ip, tx_mac = tx_info
    rx, rx_ip, rx_mac = rx_info
    # login to the desired tx node to run iperf3 client and r2d2
    __i = spawn_new_login(
        __vm.params,
        loggerTag="{0}__{1}.iperf".format(tx, rx),
        destination="sector",
        sectorIP=tx_ip,
    )
    if __i is None:
        __vm.logger.error("cannot spawn onto {0} to launch tx iperf".format(tx))
        return (False, None, None, None)
    # run r2d2 in the background
    __i.logger.debug(
        "at tx node {}, wait to start fw stats collection for {}".format(tx, rx_mac)
    )
    iperf_status = False
    iperf_start_time = None
    ping_status = False
    ping_start_time = None
    if __i.fw_stats_to_file(duration, suffix=rx_mac):
        # get target ip (link layer or inband network layer)
        if iperf_layer == "link" and rx_mac is not None:
            target = __i.get_neigh_linklayer_ip(rx_mac)
        elif iperf_layer == "network":
            target = rx_ip
        # run iperf client with server output feedback
        iperf_status, iperf_start_time = __i.iperf_client(
            target=target,
            timeout=duration,
            suffix=rx_mac,
            udp=udp,
            port=port,
            bitrate=bitrate,
            getServerOutput=True,
        )
        if not iperf_status:
            __i.logger.error("Fail to initialize iperf client!")

        # ping on tx for the durtation, decide interval and count first
        ping_interval = 1
        ping_count = int(duration / ping_interval)
        # ping on the lo interface as default while iperf on the terra interface
        ping_status, ping_start_time = __i.launch_ping6(
            target=rx_ip,
            timeout=duration,
            suffix=rx,
            count=ping_count,
            interval=ping_interval,
        )
        if not ping_status:
            __i.logger.error("Fail to initialize ping6!")
    # get out of tx
    __i.close_all()
    __i.logger.disable()
    __i = None
    return (iperf_status, ping_status, iperf_start_time, ping_start_time)


def _iperf_test_each_fast(
    __vm,
    tx_info,
    rx_info,
    duration,
    link_result,
    udp=False,
    port=5201,
    bitrate="200M",
    iperf_layer="link",
):
    """
    @param __vm:
        default: NANO server LOCAL_TG object
        backup: controller REMOTE_TG() object
    @param tx_info: tx name, inband ip, and its MAC
    @param rx_info: rx name, inband ip, and its MAC
    @param duration: for how long the test should be; default is 10 seconds
    @param iperf_result: dictionary to hold the result
    @param udp: whether run udp; by default don't
    @param port: port number

    __i: iperf REMOTE_TG() object for each tx/rx pair
    """
    tx, tx_ip, tx_mac = tx_info
    rx, rx_ip, rx_mac = rx_info
    # login to the desired rx node to run iperf3 server
    if not _iperf_test_launch_rx_fast(__vm, tx, rx, rx_ip, port=port):
        __vm.logger.error("failed to launch rx iperf server")
        return False
    # At tx node to run iperf3 client and r2d2, also measure ping latency
    (iperf_status, ping_status, iperf_start_time, __) = _link_test_launch_tx_fast(
        __vm,
        tx_info,
        rx_info,
        duration,
        udp=udp,
        port=port,
        bitrate=bitrate,
        iperf_layer=iperf_layer,
    )
    if not iperf_status or not ping_status:
        __vm.logger.error(
            "failed to launch tx iperf client and/or r2d2 and/or derive latency"
        )
        return False
    __vm.logger.info(
        "succeeded to launch iperf client at {0} for {1}s".format(tx, duration)
    )
    gevent.sleep(duration + random.randint(1, 15))
    # get both iperf and r2d2 fw stats
    __i = spawn_new_login(
        __vm.params,
        loggerTag="{0}__{1}.iperf".format(tx, rx),
        destination="sector",
        sectorIP=tx_ip,
    )
    if __i is None:
        __vm.logger.error("cannot log onto {0} to fetch results".format(tx))
        return False
    iperf_response = {}
    # get iperf
    resp = __i.write("cat /tmp/iperf_client_{0}.log".format(rx_mac), timeout=60)
    if resp[0] != "err":
        iperf_response = parse_iperf_output(
            resp[1:], iperf_start_time, __i.logger, serverOutputOnly=True
        )
        resp_temp = "\n".join(resp)
        __i.logger.debug("iperf resp for {0}->{1}: {2}".format(tx, rx, resp_temp))
        __i.write("rm /tmp/iperf_client_{0}.log".format(rx_mac))
        __vm.logger.note(
            "succeeded to parse link iperf result for {0}->{1}".format(tx, rx)
        )

    # get fw stats (reuse function get_tx_fw_stats)
    mode = "tcp"
    if udp:
        mode = "udp"
    get_tx_fw_stats(__i, tx_info, rx_info, link_result, mode=mode, noNewSpawn=True)

    # get link ping
    resp = __i.write("cat /tmp/ping6_{0}.log".format(rx), timeout=60)
    ping_response = {}
    if resp[0] != "err":
        ping_response = parse_ping_output(resp[1:], __i.logger)
        resp_temp = "\n".join(resp)
        __i.logger.debug("Ping6 response = {0}".format(resp_temp))
        __i.write("rm /tmp/ping6_{0}.log".format(rx))
        __vm.logger.note(
            "succeeded to parse link ping result for {0}->{1}".format(tx, rx)
        )
    # get out of tx
    __i.close_all()
    __i.logger.disable()
    __i = None
    # prevent simultaneously write access in multithreading
    MULTI_THREAD_LOCK.acquire()
    if mode in link_result[tx][rx]:
        link_result[tx][rx][mode].update(iperf_response)
        link_result[tx][rx][mode].update(ping_response)
    else:
        link_result[tx][rx][mode] = iperf_response
        link_result[tx][rx][mode].update(ping_response)
    MULTI_THREAD_LOCK.release()
    return True


def get_tx_fw_stats(
    __vm,
    tx_info,
    rx_info,
    result,
    mode="monitor",
    noExpect=False,
    start_time="",
    end_time="",
    noNewSpawn=False,
):
    """
    Get back to tx and get the fw_stats
    """
    tx, tx_ip, __tx_mac = tx_info
    rx, __rx_ip, rx_mac = rx_info
    if noNewSpawn:
        __i = __vm
    else:
        __i = spawn_new_login(
            __vm.params,
            loggerTag="{0}__{1}.fwstats".format(tx, rx),
            destination="sector",
            sectorIP=tx_ip,
        )
    if __i is None:
        __vm.logger.error("cannot log onto {0} in to get fw stats".format(tx_ip))
        return False
    __i.logger.debug("tx_info: {0}".format(tx_info))
    __i.logger.debug("rx_info: {0}".format(rx_info))
    fw_data = {}
    # get fw stats (only stapkt and phystatus data)
    # TODO: add more mac stats for network passive monitoring
    __i.logger.debug("Parsing stats at tx {}".format(tx))
    for my_key in KEY.FW_STATS_ALL:
        filter_kw = [rx_mac, my_key]
        fw_data[my_key] = __i.get_fw_stats(filter_kw, rx_mac)
    # remove the stat file (filename also defined in util_remote.py)
    __i.logger.debug("Remove r2d2_fw_stats at tx {}".format(tx))
    __i.write("rm /tmp/r2d2_fw_stats{0}.log".format(rx_mac))
    # only get out of tx when we spawn new ssh sessions here
    if not noNewSpawn:
        __i.close_all()
        __i.logger.disable()
        __i = None
    # prevent simultaneously write access in multithreading
    MULTI_THREAD_LOCK.acquire()
    if mode in result[tx][rx]:
        result[tx][rx][mode].update(fw_data)
    else:
        result[tx][rx][mode] = fw_data
    if mode == "monitor":
        result[tx][rx][mode][KEY.IPERF_START] = start_time
        result[tx][rx][mode][KEY.IPERF_END] = end_time
    MULTI_THREAD_LOCK.release()
    return True


def prepare_target_bitrate(
    __vm,
    traffic_type,
    parallel,
    iperf_result,
    tx,
    rx,
    variable_traffic_loading,
    is_p2mp,
    p2mp_test_rates,
):
    """
    Prepare target bit rate for the iperf test between a tx-rx pair
    """
    if isinstance(traffic_type, (list, tuple)):
        for each_traffic in traffic_type:
            if each_traffic not in iperf_result[tx][rx]:
                iperf_result[tx][rx][each_traffic] = {}
            if parallel:
                p2p_rate = _get_target_bitrate_parallel_traffic(
                    __vm, tx, rx, variable_traffic_loading
                )
                __vm.logger.debug(
                    "For {0}_{1}, p2p test target_rate = {2}".format(tx, rx, p2p_rate)
                )
                iperf_result[tx][rx][each_traffic][KEY.TARGET_BITRATE] = (
                    str(p2p_rate) if not is_p2mp else p2mp_test_rates[(tx, rx)]
                )
            else:
                target_bitrate = convert_rate(
                    bitrate=__vm.params["tests"]["iperf_p2p"]["rate"],
                    logger=__vm.logger,
                )
                iperf_result[tx][rx][each_traffic][KEY.TARGET_BITRATE] = "{0}M".format(
                    target_bitrate
                )


def _get_target_bitrate_parallel_traffic(__vm, tx, rx, variable_traffic_loading):
    """
    Get Target Birtate for the link
    If the DOF on either sides of the link is greater than 1 (implying that the
    DN is connected to more than 1 node), then the Target Bitrate is set to
    input max data rate divided by the max of the two DOFs.
    @param __vm:
        default: NANO server LOCAL_TG object
        backup: controller REMOTE_TG() object
    @param tx: Initiator of the link
    @param rx: Responder of the link
    @param variable_traffic_loading: used to enable variable traffic loading
        based on DOF in P2MP configuration
    """
    target_bitrate = __vm.params["tests"]["iperf_p2p"]["rate"]
    target_bitrate = convert_rate(target_bitrate, __vm.logger)
    target_bitrate_int = float(target_bitrate)
    target_bitrate_unit = "M"
    if variable_traffic_loading:
        len_tx_linked_sectors = len(__vm.topology.get_linked_sector(tx))
        len_rx_linked_sectors = len(__vm.topology.get_linked_sector(rx))
        return "{0}{1}".format(
            (
                round(
                    (
                        target_bitrate_int
                        / max(len_tx_linked_sectors, len_rx_linked_sectors)
                    ),
                    3,
                )
            ),
            target_bitrate_unit,
        )
    else:
        return "{0}{1}".format(target_bitrate, target_bitrate_unit)


def _iperf_test_each_wrapper(
    __vm, tx, rx, link_result, iperf_layer="link", duration=15, traffic=None
):
    """
    Run each iperf3 test from tx to rx
    @param __vm:
        default: NANO server LOCAL_TG object
        backup: controller REMOTE_TG() object
    @param tx: tx name
    @param rx: rx name
    @param link_result: dictionary to hold the link test result
    @param duration: for how long the test should be; default is 10 seconds
    @param iperf_layer: by default `link` layer (on terrax),
                  also support `network` (on lo)
    @param traffic: example ["tcp", "udp"]
    """
    # get tx and rx inband ip and mac address
    tx_ip = __vm.topology.get_ip(tx, inband=True)
    tx_mac = __vm.topology.get_mac(tx)
    rx_ip = __vm.topology.get_ip(rx, inband=True)
    rx_mac = __vm.topology.get_mac(rx)
    if tx_ip is None or rx_ip is None or tx_mac is None or rx_mac is None:
        __vm.logger.error(
            "Cannot find ip "
            + "(tx {0} ip {1} mac {2}; rx {3} ip {4} mac {5})".format(
                tx, tx_ip, tx_mac, rx, rx_ip, rx_mac
            )
        )
        return
    # create random port to use
    port = random.randint(4000, 49151)
    if not iperf_layer == "network" and not iperf_layer == "link":
        return
    if isinstance(traffic, (list, tuple)):
        for each in traffic:
            __vm.logger.info(
                "For {0}_{1}, iperf target_rate = {2}".format(
                    tx, rx, link_result[tx][rx][each][KEY.TARGET_BITRATE]
                )
            )
            _iperf_test_each_fast(
                __vm,
                (tx, tx_ip, tx_mac),
                (rx, rx_ip, rx_mac),
                duration,
                link_result,
                udp=(each == "udp"),
                port=port,
                bitrate=link_result[tx][rx][each][KEY.TARGET_BITRATE],
                iperf_layer=iperf_layer,
            )


def disable_tpc(__vm, fixpoweridx, tx, rx):
    flag = __vm.tg_fix_fwcfg_tx_power(tx, rx, fixpoweridx)
    # if failed to fix txPower, try to re-enable tpc
    if not flag:
        __vm.logger.error("Failed to fix power to {0}".format(fixpoweridx))
        reenable_tpc_check(__vm, tx, rx)
        return False
    else:
        return True


def _run_p2p_iperf_w_threading(
    __vm, threads, pnum, tx, rx, result, layer, duration, traffictype
):
    if len(threads) > pnum:
        try:
            [t.join() for t in threads]
            del threads[:]
        except KeyboardInterrupt:
            __vm.logger.note("Keyboard interrupted. Exiting.")
            del threads[:]
            return False
    try:
        my_thread = threading.Thread(
            target=_iperf_test_each_wrapper,
            args=(__vm, tx, rx, result, layer, duration, traffictype),
        )
        __vm.logger.info(
            "iperf for link {0}__{1}, total_threads={2}".format(tx, rx, len(threads))
        )
        threads.append(my_thread)
        my_thread.start()
        return True
    except BaseException:
        raise


def run_p2p_iperf(
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
    is_p2mp=False,
    p2mp_test_rates=None,
):
    threads = []
    for tx, rx in sector_pair_to_test:
        __vm.logger.info("Prepare to start iperf on link {0}__{1}".format(tx, rx))
        # if test specifies txPower index fix the power index
        if fixpoweridx:
            # fix power via disabling TPC
            if not disable_tpc(__vm, fixpoweridx, tx, rx):
                continue

        if tx not in iperf_result:
            iperf_result[tx] = {}
        if rx not in iperf_result[tx]:
            iperf_result[tx][rx] = {}

        __vm.logger.debug(
            "Prepare target bitrate for iperf for {0}__{1}".format(tx, rx)
        )
        # prepare target bit rate for the tx-rx pair
        prepare_target_bitrate(
            __vm,
            traffictype,
            parallel,
            iperf_result,
            tx,
            rx,
            variable_traffic_loading,
            is_p2mp,
            p2mp_test_rates,
        )
        __vm.logger.info("Starting iperf on link {0}__{1}".format(tx, rx))
        if parallel:
            _run_p2p_iperf_w_threading(
                __vm,
                threads,
                pnum,
                tx,
                rx,
                iperf_result,
                iperf_layer,
                duration,
                traffictype,
            )
        else:
            _iperf_test_each_wrapper(
                __vm,
                tx,
                rx,
                iperf_result,
                iperf_layer=iperf_layer,
                duration=duration,
                traffic=traffictype,
            )

    # if parallel, wait until all iperf3 test has finished
    if parallel:
        try:
            [t.join() for t in threads]
        except KeyboardInterrupt:
            __vm.logger.note("Keyboard interrupted.")
        except BaseException:
            raise

    return iperf_result


def dump_iperf_result(__vm, iperf_layer, iperf_result, p2mp_time_slot=""):
    # create p2mp directory for p2mp test
    if p2mp_time_slot:
        p2mp_path = __vm.params["output_folder"] + "/p2mp"
        p2mp_time_slot_path = p2mp_path + "/{0}".format(p2mp_time_slot)
        try:
            # create /p2mp folder if not present
            os.makedirs(p2mp_path) if not os.path.isdir(
                p2mp_path
            ) else __vm.logger.note("{0} path exists".format(p2mp_path))

            # create directory for time_slot unless it exisits
            os.makedirs(p2mp_time_slot_path) if not os.path.isdir(
                p2mp_time_slot_path
            ) else __vm.logger.note(
                "{0} path exists. Overwriting results.".format(p2mp_time_slot_path)
            )
        except BaseException:
            raise

    output_folder = (
        p2mp_time_slot_path if p2mp_time_slot else __vm.params["output_folder"]
    )
    file_name = "/iperf_{0}_layer_{1}".format(iperf_layer, int(time.time() * 1000))
    out_fp_no_suffix = "{0}{1}".format(output_folder, file_name)

    # dumping raw iperf measurement results
    return dump_result(out_fp_no_suffix, iperf_result, __vm.logger, use_pickle=True)
