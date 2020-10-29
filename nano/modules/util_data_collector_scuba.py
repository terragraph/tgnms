#!/usr/bin/env python3

import argparse
import datetime
import getpass

# import json
import logging
import os
import sys
import threading
import time

import libfb.py.employee
import modules.keywords as KEY
from modules.addon_misc import dump_result, get_range
from modules.util_logger import EmptyLogger

# modules
from modules.util_topology import Topology

# fb internal
from rfe import client as rfe_client
from RockfortExpress import RockfortExpress as rfe, constants as rfe_const


# global param
MULTI_THREAD_LOCK = threading.Lock()
# set to Scuba limit
MAX_QUERY_SAMPLE = 400000
MAC_ADDR_LENGTH = 17
SCUBA_DATASET = "terragraph_mpk_stats"


class ScubaQuery(object):
    """
    Scuba Database access
    This class includes functions to query
    all the stats/keywords for all the nodes in a topology
    """

    def __init__(
        self, topology=None, logPathDir=None, loggerTag="SCUBA", printout=True
    ):
        self.topology = topology
        self.result = {}
        self.networkName = ""
        self.raw_scuba_row = []
        if logPathDir is None:
            self.logger = EmptyLogger(loggerTag, printout=printout)
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

    def _getRfeQuery(self):
        user_name = getpass.getuser()
        user_id = libfb.py.employee.unixname_to_uid(user_name)
        return rfe.QueryCommon(
            user_name=user_name, user_id=user_id, instance=SCUBA_DATASET
        )

    def _getRfeView(self, keys, nodes, begin, end):
        filters = [
            rfe.Filter(
                key="node",
                key_type=rfe.DataType.NORMAL,
                string_vals=nodes,
                operation=rfe_const.OP_EQ,
            ),
            rfe.Filter(
                key="key",
                key_type=rfe.DataType.NORMAL,
                string_vals=keys,
                operation=rfe_const.OP_SUBSTR,
            ),
        ]
        view = rfe.View(begin=begin, end=end, filters=filters)
        return view

    _columns = ["node", "time", "key", "time_us", "value"]

    def _getQuerySampleParams(self, limit):
        samplesParams = rfe.SamplesParams(
            dimensions=[rfe.SamplesColumn(col) for col in self._columns],
            limit=limit,
            order_by="time_us",
            desc=False,
        )
        return samplesParams

    def _getNodesFromTopology(self):
        macNodeDict = {}
        mac_list = []
        for node in self.topology.get_all_nodes():
            mac_addr = self.topology.get_mac(node)
            if mac_addr is not None:
                macNodeDict[mac_addr] = node
                mac_list.append(mac_addr)
        return (mac_list, macNodeDict)

    def _cleanup(self, samples):
        """
        remove prefix and add peer
        use int for time, time_us, values
        lower case for node
        """
        DEFAULT_MAC = "00:00:00:00:00:00"
        for samp in samples:
            samp["time"] = int(samp["time"])
            samp["time_us"] = int(samp["time_us"])
            samp["value"] = int(samp["value"])
            samp["node"] = samp["node"].lower()
            key = samp["key"]
            peer_mac = DEFAULT_MAC
            prefix = "tgf."
            if prefix == key[0 : len(prefix)]:
                key = key[len(prefix) :]
                peer_mac = key[: len(peer_mac)]
                key = key[len(peer_mac) + 1 :]
            samp["key"] = key
            samp["peer"] = peer_mac

    def getSamples(self, keys, nodes, begin_time, end_time, limit=MAX_QUERY_SAMPLE):
        """
        Use this if topology = None
        """
        begin_time, end_time = get_range(begin_time, end_time, -1, -1)
        queryInfo = self._getRfeQuery()
        view = self._getRfeView(keys=keys, nodes=nodes, begin=begin_time, end=end_time)
        samplesParams = self._getQuerySampleParams(limit)
        queryResult = rfe_client.getClient().querySamples(
            queryInfo, view, samplesParams
        )
        result = [
            {col: row[ind] for ind, col in enumerate(self._columns)}
            for row in queryResult.rows
        ]
        self._cleanup(result)
        return result

    def get_scuba_rows(
        self,
        macs,
        start_time,
        end_time,
        pnum,
        keyList=None,
        targets=None,
        parallel=False,
    ):
        _, macNodeDict = self._getNodesFromTopology()
        start_time, end_time = get_range(start_time, end_time, -1, -1)
        if keyList:
            self.queryKeys = keyList
        self._getScubaQueryResult(
            macs, macNodeDict, start_time, end_time, pnum, targets, parallel
        )
        return self.raw_scuba_row

    def getQueryKeys(
        self, stapkt=False, beams=False, phy=False, phy_data=False, link=False
    ):
        keys = []
        if phy:
            keys += KEY.ODS_PHY
        if stapkt:
            keys += KEY.ODS_STA
        if phy_data:
            keys += KEY.ODS_PHY_DATA
        if link:
            keys += KEY.ODS_LINK
        if beams:
            keys += KEY.ODS_PERIOD
        self.queryKeys = keys
        self.logger.debug(
            "In the query, {} keys are included.".format(len(keys))
            + "keys={}".format(keys)
        )

    def _getQueryResult(self, key, nodes, macNodeDict, begin_time, end_time, limit):
        """
        @param result: dictionary to hold the result
        @param macNodeDict: mapping table for each node_name and mac_addr
        """
        queryInfo = self._getRfeQuery()
        view = self._getRfeView(keys=key, nodes=nodes, begin=begin_time, end=end_time)
        samplesParams = self._getQuerySampleParams(limit)
        queryResult = rfe_client.getClient().querySamples(
            queryInfo, view, samplesParams
        )
        MULTI_THREAD_LOCK.acquire()
        result = [
            {col: row[ind] for ind, col in enumerate(self._columns)}
            for row in queryResult.rows
        ]
        self._cleanup(result)
        self.raw_scuba_row.extend(result)

        tx, rx = self._formatQueryResult(queryResult.rows, macNodeDict)
        if not (len(queryResult.rows)) == 0:
            node_rx_tx = "node={0}, rx_mac={1}, tx_mac={2}, ".format(nodes, rx, tx)
            self.logger.info(
                node_rx_tx
                + "keys={0}, num_of_samples={1}.".format(key, len(queryResult.rows))
            )
        MULTI_THREAD_LOCK.release()

    def _formatQueryResult(self, queryResult, macNodeDict):
        """
        This function store query results in terms of txNodeName and rxNodeName
        Detailed output format:
        {
            txNodeName: {
                rxNodeName: {
                    key1: [(time1, val1), (time2, val2), ...],
                    key2: [(time1, val1), (time2, val2), ...],
                    ...
                }
            }
        }
        @param macNodeDict: mapping table for each node_name and mac_addr
        """
        tx = ""
        rx = ""
        columns = ["node", "time", "key", "time_us", "value"]
        for queryEntry in queryResult:
            scubaKey = queryEntry[columns.index("key")]
            scubaKey = scubaKey.replace("tgf.", "")
            tx = scubaKey[:MAC_ADDR_LENGTH]
            rx = queryEntry[columns.index("node")]
            statsKey = scubaKey.replace(tx, "")
            statsKey = statsKey[1:]
            fw_time = int(queryEntry[columns.index("time_us")])
            value = int(queryEntry[columns.index("value")])
            if tx in macNodeDict:
                tx = macNodeDict[tx]
            if rx in macNodeDict:
                rx = macNodeDict[rx]
            if tx not in self.result:
                self.result[tx] = {}
            else:
                if rx not in self.result[tx]:
                    self.result[tx][rx] = {}
                else:
                    if statsKey not in self.result[tx][rx]:
                        self.result[tx][rx][statsKey] = []
                    self.result[tx][rx][statsKey].append((fw_time, value))
        # query stats for only one node each time
        return (tx, rx)

    def _printQueryResult(self, queryResult):
        for txKey in queryResult:
            print("-" * 82)
            print("{}".format(txKey))
            for rxKey in queryResult[txKey]:
                print("{}".format(rxKey))
                for statKey, value in queryResult[txKey][rxKey].items():
                    print("{}".format(statKey))
                    print("{}".format(value))

    def _getScubaQueryResult(
        self,
        mac_list,
        macNodeDict,
        start_time,
        end_time,
        pnum,
        targets=None,
        parallel=False,
    ):
        threads = []
        diff_time = end_time - start_time
        # TODO: 10 is a arbitrary number. Need to change the code to calculate
        # expecting sample/second
        num_sample_node_key = int(diff_time) * 10
        self.result = {}
        query_num = 0
        for key in self.queryKeys:
            for node in mac_list:
                if targets is not None and node not in targets:
                    continue
                if num_sample_node_key > MAX_QUERY_SAMPLE:
                    self.logger.info(
                        "num_sample_node_key={}, ".format(num_sample_node_key),
                        "each Scuba query exceeds max value {} !".format(
                            MAX_QUERY_SAMPLE
                        ),
                    )
                if parallel:
                    # one node and one key at a time (easy to scale)
                    if len(threads) > pnum:
                        for t in threads:
                            t.join()
                        del threads[:]

                    my_thread = threading.Thread(
                        target=self._getQueryResult,
                        args=(
                            [key],
                            [node],
                            macNodeDict,
                            start_time,
                            end_time,
                            num_sample_node_key,
                        ),
                    )
                    query_num += 1
                    threads.append(my_thread)
                    my_thread.start()
                else:
                    # one key and one node at a time
                    self._getQueryResult(
                        [key],
                        [node],
                        macNodeDict,
                        start_time,
                        end_time,
                        num_sample_node_key,
                    )
                    query_num += 1

                # sleep a period for each node
                sleep_time = 2
                time.sleep(sleep_time)

            # sleep a period for each key to avoid Scuba CPU utilization issue
            sleep_time = 200
            self.logger.info(
                "total_query_num={0} so far, num_of_tx_rx_pairs={1}, ".format(
                    query_num, len(self.result)
                )
                + "wait for {0} seconds.".format(sleep_time)
            )
            time.sleep(sleep_time)
        for t in threads:
            t.join()

        self.logger.info(
            "num_nodes={0}, num_keys={1}, total_query_num={2}.".format(
                len(mac_list), len(self.queryKeys), query_num
            )
        )

    def getScubaQueryTopology(
        self, startT="-1 hour", endT="now", targets=None, pnum=20
    ):
        try:
            if startT == "-1 day" and endT == "now":
                end_time = int(time.time())
                seconds_day = 60 * 60 * 24
                # start from -1 day
                start_time = end_time - seconds_day
            elif startT == "-1 hour" and endT == "now":
                end_time = int(time.time())
                seconds_day = 60 * 60
                # start from -1 hour
                start_time = end_time - seconds_day
            else:
                # required format
                time_format = "%Y-%m-%d %H:%M:%S"
                start_time_string = datetime.datetime.strptime(startT, time_format)
                end_time_string = datetime.datetime.strptime(endT, time_format)
                start_time = int(start_time_string.strftime("%s"))
                end_time = int(end_time_string.strftime("%s"))
                print("start_time={}".format(start_time))
        except BaseException:
            self.logger.error("startT = {}, endT = {}".format(startT, endT))
            self.logger.error("startT or endT format not supported!")
            return False

        mac_list, macNodeDict = self._getNodesFromTopology()
        num_nodes = len(mac_list)

        start_time_report = time.strftime(
            "%H:%M:%S, %b %d, %Y ", time.localtime(start_time)
        )
        end_time_report = time.strftime(
            "%H:%M:%S, %b %d, %Y ", time.localtime(end_time)
        )
        network = self.networkName
        self.logger.info(
            network
            + " Scuba Query, start_time={0}, end_time={1}".format(
                start_time_report, end_time_report
            )
        )

        # an interactive manner, per-node basis
        program_start_time = time.time()
        self._getScubaQueryResult(
            mac_list,
            macNodeDict,
            start_time,
            end_time,
            targets=targets,
            pnum=pnum,
            parallel=False,
        )
        self.logger.info(
            "--Scuba query takes {} seconds for key_num={} and node_num={}--".format(
                time.time() - program_start_time, len(self.queryKeys), num_nodes
            )
        )

    def dump_data(self, fp_no_suffix):
        return dump_result(fp_no_suffix, self.result, use_pickle=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Data Loader from Scuba")
    parser.add_argument(
        "--topology", "-t", action="store", help="topology json file path"
    )
    parser.add_argument(
        "--no_stapkt", action="store_true", default=False, help="Do NOT get stapkt"
    )
    parser.add_argument(
        "--no_beams", action="store_true", default=False, help="Do NOT get beams"
    )
    parser.add_argument(
        "--no_phy", action="store_true", default=False, help="Do NOT get phy"
    )
    parser.add_argument(
        "--no_phy_data", action="store_true", default=False, help="Do NOT get phy_data"
    )
    parser.add_argument(
        "--no_link", action="store_true", default=False, help="Do NOT get link"
    )
    try:
        args = vars(parser.parse_args())
    except BaseException:
        sys.exit()

    topology = Topology()
    topology.load_topology(args["topology"])
    scubaQuery = ScubaQuery(topology)
    scubaQuery.getQueryKeys(
        stapkt=(not args["no_stapkt"]),
        beams=(not args["no_beams"]),
        phy=(not args["no_phy"]),
        phy_data=(not args["no_phy_data"]),
        link=(not args["no_link"]),
    )
    scubaQuery.getScubaQueryTopology(
        startT=args["start"],
        endT=args["end"],
        targets=args["targets"],
        pnum=args["pnum"],
    )
