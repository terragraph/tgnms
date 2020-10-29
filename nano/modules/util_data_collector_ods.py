#!/usr/bin/env python3

import json
import logging

# built-ins
import os
import subprocess
import threading
import time

# modules
import modules.keywords as KEY
from modules.addon_misc import dump_result
from modules.util_logger import EmptyLogger


# global param
ENTITY_PREFIX = "CXL-Node-Test-"
MULTI_THREAD_LOCK = threading.Lock()


class ODS(object):
    """
    ODS Database Access
    Provide API to connect from ODS
    """

    def __init__(self, topology, logPathDir=None, loggerTag="ODS", printout=True):
        self.topology = topology
        self.data = {}
        if logPathDir is None:
            self.logger = EmptyLogger(loggerTag, printout=True)
        else:
            logpath_r = "{0}/log/".format(logPathDir)
            if not os.path.isdir(logpath_r):
                try:
                    os.makedirs(logpath_r)
                except BaseException:
                    logpath_r = logPathDir
            self.logger = EmptyLogger(
                loggerTag,
                logPath="{0}/log/tg_{1}_{2}.log".format(
                    logPathDir, loggerTag, int(time.time())
                ),
                printout=printout,
                printlevel=logging.INFO,
            )

    def change_keys_to_fetch(
        self, stapkt=False, beams=False, phy=False, phy_data=False, link=False
    ):
        def action(keys):
            for each in keys:
                keys_to_fetch.append(each)

        keys_to_fetch = []
        if stapkt:
            action(KEY.ODS_STA)
        if beams:
            action(KEY.ODS_PERIOD)
        if phy:
            action(KEY.ODS_PHY)
        if phy_data:
            action(KEY.ODS_PHY_DATA)
        if link:
            action(KEY.ODS_LINK)
        self.logger.info(keys_to_fetch)
        self.keys_to_fetch = keys_to_fetch

    def fetch_all(self, startT="-1 day", endT="now", targets=None, pnum=20):
        self.data = {}
        tmp_data = fetch_from_ods(
            self.topology,
            self.keys_to_fetch,
            self.logger,
            startT=startT,
            endT=endT,
            targets=targets,
            pnum=pnum,
        )
        if not tmp_data:
            return False
        for data_key in tmp_data:
            node, peer = data_key.split("___")
            if node not in self.data:
                self.data[node] = {}
            if peer not in self.data[node]:
                self.data[node][peer] = {}
            for my_dict in tmp_data[data_key]:
                if not my_dict:
                    self.logger.error("{0} has nothing".format(node))
                    continue
                for fetch_key in self.keys_to_fetch:
                    if fetch_key not in my_dict[KEY.ODS_QUERY_KEY]:
                        self.logger.error(
                            "{0} not exist for node {1}".format(fetch_key, node)
                        )
                        continue
                    self.data[node][peer][fetch_key] = my_dict[KEY.ODS_QUERY_DATA]
        return True

    def dump_data(self, fp_no_suffix):
        return dump_result(fp_no_suffix, self.data, self.logger, use_pickle=True)


def run_cmd_on_devserver(p, logger=None):
    out, err = p.communicate()
    if err:
        if logger is not None:
            logger.error(err)
        else:
            print(err)
        return None
    if out == "":
        return None
    return out


def ods_data_compression(data):
    """
    compress data from ods
    key ideas are:
    (1) for tx/rx ok/failed packets, record diff only
    (2) remove repeated data if time is different but value is the same
    """
    for i in range(len(data)):
        d = data[i][KEY.ODS_QUERY_DATA]
        # if data less than 3, then do nothing
        if len(d) < 3:
            continue
        # (1) if the right key, calculate diff only
        for key in KEY.KEYS_TO_DIFF:
            if key not in data[i][KEY.ODS_QUERY_KEY]:
                continue
            # calcluate backwards
            for j in range(len(d) - 1, 0, -1):
                d[j][1] -= d[j - 1][1]
            del d[0]
        # (2) assume time is already in sequence
        #     delete backwards to prevent indexing issues
        for j in range(len(d) - 2, 0, -1):
            if d[j][1] == d[j + 1][1] and d[j][1] == d[j - 1][1]:
                del d[j]


def rapido_ods(
    data,
    data_key,
    entity,
    key,
    tstart="-1 hour",
    tend="now",
    showtime=True,
    compress=True,
):
    """
    assume single entity and single key
    """
    print("Starting {0}".format(data_key))
    cmd = "/usr/local/bin/rapido "
    cmd += '--entity="{0}" '.format(entity)
    cmd += '--key="{0}" '.format(key)
    cmd += '--tstart="{0}" '.format(tstart)
    cmd += '--tend="{0}" '.format(tend)
    if showtime:
        cmd += "--showtime "
    cmd += "--format=json "  # output to json format
    p = subprocess.Popen(
        cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, shell=True
    )
    result = run_cmd_on_devserver(p)
    if result is not None:
        try:
            tmp = json.loads(result)
        except BaseException as ex:
            print(ex)
            result = None
    MULTI_THREAD_LOCK.acquire()
    if result is None or len(tmp) < 1 or KEY.ODS_QUERY_DATA not in tmp[0]:
        data[data_key] = []
        return
    # sort based on time (if not already)
    try:
        if compress:
            ods_data_compression(tmp)
        data[data_key] = tmp
    except BaseException as ex:
        print(ex)
    MULTI_THREAD_LOCK.release()
    print("Ending {0}".format(data_key))


def _fetch_from_ods_each(
    topology,
    keys_to_fetch,
    linked_sectors,
    node,
    node_mac,
    tmp_data,
    threads,
    pnum,
    startT,
    endT,
):
    for peer in linked_sectors:
        # skip if we don't know peer's mac address
        peer_mac = topology.get_mac(peer)
        if peer_mac is None:
            continue
        ods_entity = "{0}{1}".format(ENTITY_PREFIX, peer_mac)
        ods_keys = []
        for key in keys_to_fetch:
            if key in KEY.ODS_LINK:
                ods_keys.append("link.{0}.{1},".format(node_mac, key))
            else:
                # otherwise assuming is TG FW Stats
                ods_keys.append("tgf.{0}.{1},".format(node_mac, key))
        tmp_data_k = "{0}___{1}".format(node, peer)
        if len(threads) >= pnum:
            for t in threads:
                t.join()
            del threads[:]
        # prevent too many threads at once
        my_thread = threading.Thread(
            target=rapido_ods,
            args=(tmp_data, tmp_data_k, ods_entity, ",".join(ods_keys), startT, endT),
        )
        threads.append(my_thread)
        my_thread.start()


def fetch_from_ods(
    topology, keys_to_fetch, logger, startT="-1 day", endT="now", targets=None, pnum=20
):
    tmp_data = {}
    threads = []
    # skip if no keys specified
    if not keys_to_fetch:
        logger.error("Nothing to fetch")
        return {}
    nodes = topology.get_all_nodes()
    if nodes is None:
        logger.error("Topology has nothing!")
        return {}
    # for each node we fetch the data
    for node in topology.get_all_nodes():
        # skip if not in the specified targets
        if targets is not None and node not in targets:
            continue
        # skip if we don't know node's mac address
        node_mac = topology.get_mac(node)
        if node_mac is None:
            continue
        # skip if no linked sector
        linked_sectors = topology.get_linked_sector(node)
        if not linked_sectors:
            continue
        _fetch_from_ods_each(
            topology,
            keys_to_fetch,
            linked_sectors,
            node,
            node_mac,
            tmp_data,
            threads,
            pnum,
            startT,
            endT,
        )
    for t in threads:
        t.join()
    return tmp_data
