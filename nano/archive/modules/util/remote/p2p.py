#!/usr/bin/env python3

import random
import time

# dumpy imports to silence lint errors
import _get_tx_fw_stats
import MULTI_THREAD_LOCK
import parse_iperf_output
import spawn_new_login


def _iperf_test_launch_tx(__c, tx, rx, tx_ip, rx_mac, timeout, port=5201):
    """
    Don't call this function directly!
    Run iPerf on RX first in the iPerf Test
    """
    # login to the desired tx node to run iperf3 server
    __i = spawn_new_login(
        __c.params,
        loggerTag="{0}__{1}.iperf".format(tx, rx),
        destination="sector",
        sectorIP=tx_ip,
    )
    if __i is None:
        __c.logger.error("cannot spawn onto {0} to launch tx iperf".format(tx))
        return False
    # run iperf server (in the background, non-blocking)
    __i.logger.debug("Run iperf server on {0}.".format(tx_ip))
    if not __i.iperf_server(port=port):
        __i.logger.error("Could not setup iperf server.")
        # get out of tx
        __i.close_all()
        __i.logger.disable()
        __i = None
        return False
    # write_to_file
    __i.logger.debug(
        "At tx node {}, wait to start fw stats collection for {}".format(
            time.time(), rx_mac
        )
    )
    __i.fw_stats_to_file(timeout, suffix=rx_mac)
    # get out of tx
    __i.close_all()
    __i.logger.disable()
    __i = None
    return __i, True


def _iperf_test_launch_rx(
    __c,
    tx_info,
    rx_info,
    duration,
    udp,
    iperf_result,
    port=5201,
    bitrate="1G",
    noExpect=False,
):
    """
    Don't call this function directly!
    Run iperf on tx towards rx (NOTE: BUT use rx as the initiator)
    @param __i: iperf REMOTE_TG() object
    @param tx_info: tx name, inband ip, and its MAC
    @param rx_info: rx name, inband ip, and its MAC
    @param duration: for how long the test should be; default is 10 seconds
    @param udp: True/False for running UDP or TCP tests
    @param iperf_result: dictionary to hold the result
    @param port: port number
    """
    tx, tx_ip, tx_mac = tx_info
    rx, rx_ip, rx_mac = rx_info
    # login to the desired rx node to run iperf3 client
    __i = spawn_new_login(
        __c.params,
        loggerTag="{0}__{1}.iperf".format(tx, rx),
        destination="sector",
        sectorIP=rx_ip,
    )
    if __i is None:
        __c.logger.error("cannot log onto {0} to launch rx iperf".format(rx))
        return False
    # get target ip (link layer or inband network layer)
    if tx_mac is not None:
        target = __i.get_neigh_linklayer_ip(tx_mac)
    else:
        target = tx_ip
    status, start_time = __i.iperf_client(
        target=target,
        timeout=duration,
        suffix=rx_mac,
        udp=udp,
        port=port,
        bitrate=bitrate,
    )
    response = {}
    if not status:
        __i.logger.error("Fail to initialize iperf client!")
    # get out of rx
    __i.close_all()
    __i.logger.disable()
    __i = None
    if status:
        # wait for duration + random time and re-enter rx to fetch iperf result
        time.sleep(duration + random.randint(1, 15))
        __i = spawn_new_login(
            __c.params,
            loggerTag="{0}__{1}.iperf".format(tx, rx),
            destination="sector",
            sectorIP=rx_ip,
        )
        if __i is None:
            __c.logger.error("cannot log onto {0} to cat iperf".format(rx))
            return False
        resp = __i.write("cat /tmp/iperf_client_{0}.log".format(rx_mac), timeout=60)
        if resp[0] != "err":
            response = parse_iperf_output(resp[1:], start_time, __i.logger)
            __i.write("rm /tmp/iperf_client_{0}.log".format(rx_mac))
        # get out of rx
        __i.close_all()
        __i.logger.disable()
        __i = None
    # prevent simultaneously write access in multithreading
    MULTI_THREAD_LOCK.acquire()
    if udp:
        iperf_result[tx][rx]["udp"] = response
    else:
        iperf_result[tx][rx]["tcp"] = response
    MULTI_THREAD_LOCK.release()
    return status


def _iperf_test_launch_tx_fast(
    __c, tx_info, rx_info, duration, udp=True, port=5201, bitrate="100M"
):
    tx, tx_ip, tx_mac = tx_info
    rx, rx_ip, rx_mac = rx_info
    # login to the desired tx node to run iperf3 client and r2d2
    __i = spawn_new_login(
        __c.params,
        loggerTag="{0}__{1}.iperf".format(tx, rx),
        destination="sector",
        sectorIP=tx_ip,
    )
    if __i is None:
        __c.logger.error("cannot spawn onto {0} to launch tx iperf".format(tx))
        return False, None
    # run r2d2 in the background
    __i.logger.debug(
        "at tx node {}, wait to start fw stats collection for {}".format(tx, rx_mac)
    )
    status = False
    start_time = None
    if __i.fw_stats_to_file(duration, suffix=rx_mac):
        # get target ip (link layer or inband network layer)
        if rx_mac is not None:
            target = __i.get_neigh_linklayer_ip(rx_mac)
        else:
            target = rx_ip
        # run iperf client with server output feedback
        status, start_time = __i.iperf_client(
            target=target,
            timeout=duration,
            suffix=rx_mac,
            udp=udp,
            port=port,
            bitrate=bitrate,
            getServerOutput=True,
        )
        if not status:
            __i.logger.error("Fail to initialize iperf client!")
    # get out of tx
    __i.close_all()
    __i.logger.disable()
    __i = None
    return status, start_time


def _iperf_test_each(
    __c, tx_info, rx_info, duration, iperf_result, udp=False, port=5201, bitrate="1G"
):
    """
    Don't call this directly
    @param __i: iperf REMOTE_TG() object for each tx/rx pair
    @param tx_info: tx name, inband ip, and its MAC
    @param rx_info: rx name, inband ip, and its MAC
    @param duration: for how long the test should be; default is 10 seconds
    @param iperf_result: dictionary to hold the result
    @param udp: whether run udp; by default don't
    @param port: port number
    """
    tx, tx_ip, __tx_mac = tx_info
    rx, __rx_ip, rx_mac = rx_info
    # start iperf on tx through tx inband ip
    if not _iperf_test_launch_tx(__c, tx, rx, tx_ip, rx_mac, duration, port=port):
        __c.logger.error("failed to launch tx iperf (as rx)")
        return False
    if not _iperf_test_launch_rx(
        __c, tx_info, rx_info, duration, udp, iperf_result, port=port, bitrate=bitrate
    ):
        __c.logger.error("failed to launch rx iperf (as tx)")
        return False
    # get tx fw stats
    mode = "tcp"
    if udp:
        mode = "udp"
    return _get_tx_fw_stats(__c, tx_info, rx_info, iperf_result, mode=mode)
