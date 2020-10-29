#!/usr/bin/env python3

import time

from modules.util.remote.controller_operation import REMOTE_TG


def _im_scan_each_download_file(__vm, remote_fp, tg_scan_ofp, local_fp_all):
    """
    Don't call this directly.
    In charge of pull file from the controller/remote bridge/local to local
    """
    if __vm.pull(
        __vm.params["controller"]["ip"],
        remote_fp,
        tg_scan_ofp,
        username=__vm.params["controller"]["username"],
        password=__vm.params["controller"]["password"],
        authkey=__vm.params["controller"]["authkey_fp"],
        devserver_hack=__vm.params["devserver_hack"],
        forceit=False,
    ):
        __vm.write("rm -f {0}".format(remote_fp))
        local_fp_all.append("{0}/{1}".format(tg_scan_ofp, remote_fp.split("/")[-1]))


def im_scan_all(
    __vm,
    tg_scan_ofp,
    output_folder=None,
    tx_power=None,
    scan_mode=None,
    to_mongo_db=False,
):
    """
    @param __vm: controller ssh session
    @param tg_scan_ofp: output folder path for the scan result
    """
    local_fp_all = []

    # check if IM scan is already running in controller
    __vm.tg_scan_waiting()
    # TODO scan: shall we parse the scan finish time before process

    # start the scan for all nodes in the network
    status = __vm.tg_scan_start(im=True, tx_power=tx_power, scan_mode=scan_mode)
    if status == "err":
        __vm.logger.error("tg scan start failed")
        return ""

    # wait until the scan is finished (blocking)
    __vm.tg_scan_waiting()

    # get the status
    filepath = __vm.tg_scan_status(
        local_file_path=tg_scan_ofp,
        output_folder=output_folder,
        to_mongo_db=to_mongo_db,
    )
    if not filepath:
        __vm.logger.error("No output for tg scan status")
        return ""
    if isinstance(__vm, REMOTE_TG):
        __vm.logger.info("Downloading im scan results from {0}".format(filepath))
        _im_scan_each_download_file(__vm, filepath, tg_scan_ofp, local_fp_all)
    return local_fp_all


def im_scan_each(__vm, tx, rx_nodes, tg_scan_ofp, rx_node_limit=30, to_mongo_db=False):
    """
    @param tx: string, tx node name
    @param rx_nodes: a list of rx node names
    @param rx_node_limit: control number of responders at the same time
    @return filepath of the pulled file on local device
    """
    simultaneous_rxs = []
    local_fp_all = []
    for i in range(len(rx_nodes)):
        rx = rx_nodes[i]
        if rx_node_limit > len(simultaneous_rxs):
            simultaneous_rxs.append(rx)
            if not i == len(rx_nodes) - 1:  # if we are doing the last node
                continue
        # start the scan
        status = __vm.tg_scan_start(im=True, tx_node=tx, rx_node=simultaneous_rxs)
        if status == "err":
            __vm.logger.error("tg scan start failed")
            del simultaneous_rxs[:]
            # if just error, continue
            continue
        elif status == "tx_err":
            # if tx does not exist, we do not continue
            return []
        # hardcoded waiting time for now
        time.sleep(5)
        # get the status
        filepath = __vm.tg_scan_status(
            suffix="{0}".format(tx),
            local_file_path=tg_scan_ofp,
            to_mongo_db=to_mongo_db,
        )
        if not filepath:
            __vm.logger.error("No output for tg scan status")
            continue
        if isinstance(__vm, REMOTE_TG):
            _im_scan_each_download_file(__vm, filepath, tg_scan_ofp, local_fp_all)
        del simultaneous_rxs[:]
    return local_fp_all
