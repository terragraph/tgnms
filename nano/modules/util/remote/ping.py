#!/usr/bin/env python3

from modules.util.remote.base import MULTI_THREAD_LOCK, spawn_new_login


def ping_test_each(__vm, tx, rx, ping_result, layer="link", duration=30):
    """
    Run each ping test from tx to rx
    @param __vm:
        default: NANO server LOCAL_TG object
        backup: controller REMOTE_TG() object
    @param tx: tx node name
    @param rx: rx node name
    @param ping_result: dictionary to hold the result
    @param layer: 'link' layer by default (on terrax),
                  also support 'network' (on lo)
    """
    # calculate number of packets given interval 0.2 sec
    interval = 0.2
    count = int(duration / interval)
    # get tx and rx inband ip
    tx_ip = __vm.topology.get_ip(tx, inband=True)
    rx_ip = __vm.topology.get_ip(rx, inband=True)
    rx_mac = __vm.topology.get_mac(rx)
    if tx_ip is None or rx_ip is None or rx_mac is None:
        __vm.logger.error(
            "Cannot find ip (tx {0} ip {1}; rx {2} ip {3} mac {4})".format(
                tx, tx_ip, rx, rx_ip, rx_mac
            )
        )
        return
    __vm.logger.debug("creating new ssh for ping in link {0}__{1}".format(tx, rx))
    ping_obj = spawn_new_login(
        __vm.params,
        loggerTag="{0}__{1}.ping".format(tx, rx),
        destination="sector",
        sectorIP=tx_ip,
    )
    if ping_obj is None:
        __vm.logger.error("Problem to log onto Tx!!")
        return
    try:
        ping_obj.logger.info("ping from {0} to {1}".format(tx, rx))
        if layer == "link":
            target = ping_obj.get_neigh_linklayer_ip(rx_mac)
        elif layer == "network":
            target = rx_ip
        else:
            raise BaseException
        response = ping_obj.ping(target, count=count, interval=interval)
        if not response:
            ping_obj.logger.error("Cannot identify latency!")
        # prevent simultaneously write access in multithreading
        MULTI_THREAD_LOCK.acquire()
        ping_result[tx][rx] = response
        MULTI_THREAD_LOCK.release()
    except BaseException as ex:
        ping_obj.logger.error(str(ex))
    ping_obj.close_all()
    ping_obj.logger.disable()
    ping_obj = None
