#!/usr/bin/env python3

import threading

# patch for gevent and threading issues
# please refer to https://github.com/gevent/gevent/issues/688
import gevent
from modules.util.remote.controller_operation import REMOTE_TG


# global param
MULTI_THREAD_LOCK = threading.Lock()
gevent.monkey.patch_thread()


def spawn_new_login(
    myParams,
    loggerTag="CONNECT",
    printout=True,
    noExpect=False,
    destination="sector",
    sectorIP=None,
):
    """
    Spawn a new login access to remote controller, server or sector
    @param myParams: a dictionary holding login configurations
    @param loggerTag: the label name of the log
    @param printout: whether print out to stdout
    @return REMOTE_TG object
    """
    myConnection = REMOTE_TG(
        myParams,
        loggerTag=loggerTag,
        logPathDir=myParams["output_folder"],
        printout=printout,
    )
    if destination == "controller":
        myConnection.logger.info("Trying to log into controller")
        if not myConnection.connect(
            myParams["controller"]["ip"],
            username=myParams["controller"]["username"],
            password=myParams["controller"]["password"],
            authkey=myParams["controller"]["authkey_fp"],
            noExpect=noExpect,
        ):
            myConnection.logger.info("Failed to log into controller")
            return None
    elif destination == "sector":
        if not myConnection.connect(
            sectorIP,
            username=myParams["node"]["username"],
            password=myParams["node"]["password"],
            authkey=myParams["node"]["authkey_fp"],
            noExpect=noExpect,
        ):
            myConnection.logger.info("Failed to log into node - ip {}".format(sectorIP))
            return None
    # TODO: if traffic starts at the server (for multihop), no need to log into?
    elif destination == "server":
        if not myConnection.connect(
            myParams["server"]["ip"],
            username=myParams["server"]["username"],
            password=myParams["server"]["password"],
            authkey=myParams["server"]["authkey_fp"],
            noExpect=noExpect,
        ):
            myConnection.logger.info(
                "Failed to log into NANO server - ip {}".format(
                    myParams["server"]["ip"]
                )
            )
            return None
    return myConnection


def get_nodes_for_link_test(__vm, targets, input_session_num="all"):
    """
    Get nodes that need to run iperf server
    @param __vm:
        default: NANO server LOCAL_TG object
        backup: controller REMOTE_TG() object
    @param targets: list of nodes, set None for all
    @return (sector pairs to test, sector pairs to ignore)
    """
    __vm.logger.debug("prepare node/link list for the link test")
    sector_pair_to_test, sectors_to_skip = _prepare_sector_pair_for_link_test(
        __vm.topology, targets
    )
    if len(sector_pair_to_test) < 1:
        __vm.logger.error("No matched targets in specified topology network!")
        __vm.logger.debug("Specified targets: {0}".format(targets))
        __vm.logger.debug("Invalid Nodes: {0}".format(sectors_to_skip))
    __vm.logger.info(
        "Valid link pairs: {0}, to select {1} pairs; {2} invalid pairs".format(
            len(sector_pair_to_test), input_session_num, len(sectors_to_skip)
        )
    )
    __vm.logger.debug("Sectors_to_test = {}".format(sector_pair_to_test))
    if input_session_num != "all":
        total_session_num = len(sector_pair_to_test)
        __vm.logger.info(
            "Select {0} link pairs out of {1} pairs for link test".format(
                input_session_num, total_session_num
            )
        )
        selected_sector_pairs = sector_pair_to_test[:input_session_num]
    else:
        # test all available sectors
        selected_sector_pairs = sector_pair_to_test
    return selected_sector_pairs, sectors_to_skip


def _prepare_sector_pair_for_link_test(topology, targets):
    sector_pair_to_test = []  # to test
    sectors_to_skip = set()  # to skip/ignore
    for tx in topology.get_all_nodes():
        # skip if is not connected
        if not topology.is_connected(tx):
            sectors_to_skip.add((tx, None))
            continue
        for rx in topology.get_linked_sector(tx):
            # skip if not specified targets:
            if targets is not None and tx not in targets:
                pass
            elif not topology.is_node(rx):
                pass
            # skip if tx or rx is offline
            elif (
                topology.get_status(tx) == "OFFLINE"
                or topology.get_status(rx) == "OFFLINE"
            ):
                sectors_to_skip.add((tx, rx))
            # skip if cannot find inband ip for the tx node
            elif topology.get_ip(tx, inband=True) is None:
                sectors_to_skip.add((tx, rx))
            # skip if cannot find inband ip for the rx node
            elif topology.get_ip(rx, inband=True) is None:
                sectors_to_skip.add((tx, rx))
            # skip if on the same pole
            elif topology.get_site_name(tx) == topology.get_site_name(rx):
                pass
            else:
                if (tx, rx) not in sector_pair_to_test and (
                    (rx, tx) not in sector_pair_to_test
                ):
                    # add both tx->rx and rx->tx and maintain the order
                    sector_pair_to_test.append((tx, rx))
                    sector_pair_to_test.append((rx, tx))
    return sector_pair_to_test, sectors_to_skip


def batch_action_to_nodes(
    __vm, result, action, clear_known_host=False, parallel=False, pnum="inf", nodes=None
):
    """
    Perform a batch action to all the nodes
    """
    pnum = float(pnum)
    if clear_known_host:
        __vm.write('echo "" > ~/.ssh/known_hosts')
    threads = []
    nodes = (
        __vm.topology.get_all_nodes(withMAC=True, withIP=True) if not nodes else nodes
    )
    # go through all nodes
    for node in nodes:
        __vm.logger.debug(
            "node={0}, network_name={1}, action={2}".format(
                node, __vm.params["network_name"], action
            )
        )
        # skip if offline
        if __vm.topology.get_status(node) == "OFFLINE":
            __vm.logger.note("{0} is OFFLINE, cannot get beams".format(node))
            continue
        if parallel:
            if len(threads) > pnum:
                __vm.logger.debug("threads more than limit {0}".format(pnum))
                [t.join() for t in threads]
                del threads[:]
            my_thread = threading.Thread(
                target=_action_on_node, args=(__vm, node, result, action)
            )
            threads.append(my_thread)
            my_thread.start()
        else:
            _action_on_node(__vm, node, result, action)
    # if parallel, wait until all ping test has finished
    [t.join() for t in threads]


def _action_on_node(__vm, node, result, action=""):
    """
    perform action on node
    """
    # get node inband ip
    node_ip = __vm.topology.get_ip(node, inband=True)
    # get to new node
    node_obj = spawn_new_login(
        __vm.params,
        loggerTag="{0}.action".format(node),
        destination="sector",
        sectorIP=node_ip,
    )
    if node_obj is None:
        __vm.logger.error("problem to log onto {0}!".format(node_ip))
        return
    node_obj.logger.debug("created new ssh for {0}".format(node))
    try:
        node_obj.topology = __vm.topology
        if action == "get_fw_config":
            node_obj.logger.debug("get config on {0}".format(node))
            fw_config = node_obj.fetch_fw_config()
            # prevent simultaneously write access in multithreading
            MULTI_THREAD_LOCK.acquire()
            result[node] = fw_config
            MULTI_THREAD_LOCK.release()
        elif action == "fetch_phy_layer_info":
            node_obj.logger.debug("get channel info on {0}".format(node))
            myinfo = node_obj.get_channel_info(node)
            # prevent simultaneously write access in multithreading
            MULTI_THREAD_LOCK.acquire()
            for node_l in myinfo:
                __vm.topology.set_extra_channel_info(node, node_l, myinfo[node_l])
            MULTI_THREAD_LOCK.release()
        elif action == "iperf_reset":
            node_obj.logger.debug("reset iperf on {0}".format(node))
            if node_obj.iperf_reset():
                node_obj.logger.debug("suceeded")
    except BaseException as ex:
        __vm.logger.error("{0} got an exception:".format(node))
        __vm.logger.error(str(ex))
    node_obj.close_all()
    node_obj.logger.disable()
    node_obj = None


def action_to_server(__vm, action, clear_known_host=False):
    """
    Perform an action to a server
    """
    # get to server
    server_obj = spawn_new_login(
        __vm.params, loggerTag="server.action", destination="server"
    )
    server_obj.restart_systemd_logind()
    if clear_known_host:
        server_obj.write('echo "" > ~/.ssh/known_hosts')

    if server_obj is None:
        __vm.logger.error("problem to log onto server!")
        return
    server_obj.logger.info(
        "created new ssh for server ip".format(__vm.params["server"]["ip"])
    )
    try:
        server_obj.topology = __vm.topology
        if action == "iperf_reset":
            server_obj.logger.info("reset iperf on server VM")
            if server_obj.iperf_reset():
                server_obj.logger.debug("suceeded")
        # elif action ==  'get_config':
    except BaseException as ex:
        __vm.logger.error("server got an exception:")
        __vm.logger.error(str(ex))
    server_obj.close_all()
    server_obj.logger.disable()
    server_obj = None


def reenable_tpc_check(__vm, txNode, rxNode):
    """
    this is to re-enable tpc and check if it is succeeded
    """
    if __vm.tg_set_fwcfg_tpcenable(txNode, rxNode, 3):
        __vm.logger.info("Reported success when re-enable tpc")
    curTxPwr, curTpc = __vm.tg_get_fwcfg_tx_power_tpc(txNode, rxNode)
    if curTpc is 3:
        return True
    __vm.logger.error(
        "Failed re-enable tpc for {0}->{1}. Tpc is {2} and txpwridx {3}".format(
            txNode, rxNode, curTpc, curTxPwr
        )
    )
    return False


def reenable_tpc(__vm, fixpoweridx, sector_pair_to_test):
    if fixpoweridx is not None:
        for tx, rx in sector_pair_to_test:
            if not reenable_tpc_check(__vm, tx, rx):
                __vm.logger.error("Please go to controller to enable tpc manually")
                __vm.logger.error(
                    "Using command: "
                    + "`tg fw node -n {0} set_fw_params {1} 3 -r {2}`".format(
                        tx, "tpcEnable", rx
                    )
                )


def iperf_reset(__vm, pnum, nodes=None):
    if nodes:
        __vm.logger.note("Resetting iperf on selected nodes.")
    # iperf_reset shall use parallel operation
    batch_action_to_nodes(
        __vm,
        {},
        "iperf_reset",
        clear_known_host=False,
        parallel=True,
        pnum=pnum,
        nodes=nodes,
    )
