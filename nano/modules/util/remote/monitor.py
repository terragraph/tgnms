#!/usr/bin/env python3

import time

import gevent
from modules.util.remote.base import spawn_new_login
from modules.util.remote.p2p import get_tx_fw_stats


def _passive_monitor_each(__vm, tx_info, rx_info, duration, monitor_result):
    """
    Don't call this directly
    @param __i: iperf REMOTE_TG() object for each tx/rx pair
    @param tx_info: tx name, inband ip, and its MAC
    @param rx_info: rx name, inband ip, and its MAC
    @param duration: for how long the test should be; default is 10 seconds
    @param monitor_result: dictionary to hold the result
    """
    tx, tx_ip, __tx_mac = tx_info
    rx, __rx_ip, rx_mac = rx_info
    __i = spawn_new_login(
        __vm.params,
        loggerTag="{0}__{1}.monitor".format(tx, rx),
        destination="sector",
        sectorIP=tx_ip,
    )
    __i.logger.info("Start monitoring on link {0}__{1}".format(tx, rx))
    if __i is None:
        __vm.logger.error("cannot log onto {0} for passive monitor".format(tx))
        return False
    # fetch fw stats to file for monitoring (non-blocking)
    start_time = int(time.time())
    __i.fw_stats_to_file(duration, suffix=rx_mac)
    gevent.sleep(duration + 2)
    return get_tx_fw_stats(
        __i,
        tx_info,
        rx_info,
        monitor_result,
        mode="monitor",
        start_time=start_time,
        end_time=int(time.time()),
    )


def monitor_each_wrapper(__vm, tx, rx, monitor_result, duration=15):
    """
    @param __vm:
        default: NANO server LOCAL_TG object
        backup: controller REMOTE_TG() object
    @param tx: tx name
    @param rx: rx name
    @param monitor_result: dictionary to hold the result
    @param duration: for how long the test should be; default is 10 seconds
    @param layer: by default `link` layer (on terrax)
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
    _passive_monitor_each(
        __vm, (tx, tx_ip, tx_mac), (rx, rx_ip, rx_mac), duration, monitor_result
    )
