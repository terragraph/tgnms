#!/usr/bin/env python3

import json
import logging

# built-ins
import os
import random

# modules
import modules.keywords as KEY
from modules.addon_misc import dump_result
from modules.util_logger import EmptyLogger
from modules.util_math import (
    compute_ant_gain,
    compute_path_loss,
    db2pwr,
    deg2index,
    index2deg,
    isnan,
    pwr2db,
    translate_tx_power,
    translate_tx_power_idx,
)


# global params
MAX_PWR_DB = translate_tx_power(KEY.MAX_PWR_IDX)
MIN_PWR_DB = translate_tx_power(0)
# thermal noise -81.5  noise figure -7
NOISE_FLOOR_db = -74.5
MINIMUM_SNR_db = -10
TARGET_SINR_db = 18
NOISE_FLOOR = pow(10, NOISE_FLOOR_db / 10.0)
EXTRA_LOSS = 10
BEAM_GRAN_DEG = 1.5
# rule: 1:1 when index from 0 to 22; 1:0.5 when beyond 22
CUT_OFF_IDX = 22


class Interfer(object):
    """
    Interference module provides functionality to load, calculate, and predict
    interference, based on only topology, or the actual scan measurements
    """

    def __init__(
        self, topology, loggerTag="Interference", logPathDir=None, printout=False
    ):
        """
        @param topology: Topology() object form util_topology
        @param loggerTag: logger identifier
        @param logPathDir: path of where log stays
        @param printout: whether we print out the process, default False

        Expected self.result Format:
        {
            tx_node_name: {
                KEY.USE_MAX_PWR: {
                    interfered_rx: {
                        KEY.RSSI: xx, KEY.SNR: xx, KEY.POSTSNR: xx
                    }, ...
                },
                KEY.USE_CUR_PWR: {
                    interfered_rx: {
                        KEY.RSSI: xx, KEY.SNR: xx, KEY.POSTSNR: xx
                    }
                },
                KEY.TX_POWER: integer
            }
        }
        """
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
                logPath="{0}/log/tg_{1}.log".format(logPathDir, loggerTag),
                printout=printout,
                printlevel=logging.INFO,
            )
        self.__tp = topology
        self.result = {}
        # for predictions
        self.estimated_pwr = {}
        self.estimated_inr = {}
        # For Debugging
        self.estimated_rssi = {}
        self.tx_rx_links = {}
        # Configuring the output folder for the debug logs during
        # offline interference prediction
        self.logPathDir = logPathDir

    def get_interferers(self, tx_name, use_max_power=False):
        """
        get interfered rx nodes, given a tx node
        @param tx_name: tx node name
        @param use_max_power: whether get based on max power or cur power
        """
        if tx_name not in self.result:
            return None
        my_key = KEY.USE_CUR_PWR
        if use_max_power:
            my_key = KEY.USE_MAX_PWR
        if my_key not in self.result[tx_name]:
            return None
        return self.result[tx_name][my_key]

    def get_snr(self, tx_name, rx_name, use_max_power=False):
        """
        get interfered inr given tx and rx
        @param tx_name: tx node name
        @param rx_name: rx node name
        @param use_max_power: whether get based on max power or cur power
        """
        if tx_name not in self.result:
            return None
        my_key = KEY.USE_CUR_PWR
        if use_max_power:
            my_key = KEY.USE_MAX_PWR
        if rx_name not in self.result[tx_name][my_key]:
            return None
        return self.result[tx_name][my_key][rx_name][KEY.SNR]

    def get_interfer_links(self, use_max_power=False):
        """
        get sorted interfering links based on interfering sectors
        """
        interfer_sectors = self.get_interfer_sectors(use_max_power)
        interfer_links = []
        for each in interfer_sectors:
            tx, rx, _overallInr = each[0:3]
            rx_link = self.__tp.get_link_name(rx)
            if rx_link:
                interfer_links += rx_link
            tx_link = self.__tp.get_link_name(tx)
            if tx_link:
                interfer_links += tx_link
        return list(set(interfer_links))

    def get_interfer_sectors(self, use_max_power=False, use_custom_power=False):
        """
        get sorted interfering sectors based on INR
        @param use_max_power: whether get based on max power or cur power
        """
        my_key = KEY.USE_CUR_PWR
        if use_custom_power:
            my_key = KEY.USE_CUSTOMIZED_PWR
        elif use_max_power:
            my_key = KEY.USE_MAX_PWR
        interfer_sectors = []
        for txNode in self.result:
            # backward compatible to the old interference format (for prection)
            if my_key in self.result[txNode]:
                for rxNode in self.result[txNode][my_key]:
                    m = self.result[txNode][my_key][rxNode]
                    interfer_sectors.append((txNode, rxNode, m[KEY.SNR]))
                continue
            # new format in interference analysis
            for txTowardsNode in self.result[txNode]:
                tmp = self.result[txNode][txTowardsNode]
                if my_key in tmp:
                    for rxNode in tmp[my_key]:
                        for rxTowardsNode in tmp[my_key][rxNode]:
                            m = tmp[my_key][rxNode][rxTowardsNode]
                            interfer_sectors.append(
                                (
                                    txNode,
                                    rxNode,
                                    m[KEY.SNR],
                                    txTowardsNode,
                                    rxTowardsNode,
                                )
                            )
        return (
            sorted(interfer_sectors, key=lambda x: x[2], reverse=True)
            if interfer_sectors
            else []
        )

    """
    Predictions Based Interference Calculation
    """

    def _assign_prediction_result(self, txNode, use_max_pwr=True):
        rxNodes = self.__tp.get_linked_sector(txNode)
        # skip if is not linked
        if not rxNodes:
            return
        my_key = KEY.USE_CUR_PWR
        if use_max_pwr:
            my_key = KEY.USE_MAX_PWR
        for rxInterferer in self.estimated_inr:
            if rxInterferer in rxNodes:
                continue
            for tx, inr in self.estimated_inr[rxInterferer][1]:
                if not tx == txNode:
                    continue
                self.result[txNode][my_key][rxInterferer] = {
                    KEY.RSSI: inr + NOISE_FLOOR_db,
                    KEY.SNR: inr,
                    KEY.POSTSNR: inr,
                }

    def get_interference_from_predicts(
        self,
        num_iter,
        useBoxModel=False,
        tpcOFF=False,
        polarityOFF=False,
        targetSINR=TARGET_SINR_db,
    ):
        """
        predict sectors with interference
        @param num_iter: number of runs hoping estimated TPC converges
        @param useBoxModel: use box model instead of sinc, by default disabled
        @param useAntModel: use antenna model instead of either sinc or box model
        @param tpcOFF: to disable TPC, TPC is enabled by default
        @param polarityOFF: disable polarity, polarity is enabled by default
        """
        # predict worst case first
        self.logger.info("Assigning TPC to start with max power index..")
        self._predict_tpc(useBoxModel=useBoxModel, targetSINR=targetSINR, tpcOFF=tpcOFF)
        self.logger.info("Deriving INR at this config..")
        self._predict_inr(useBoxModel=useBoxModel, polarityOFF=polarityOFF)
        self.result = {}
        for txNode in self.estimated_pwr:
            if not self.__tp.is_connected(txNode):
                continue
            self.result[txNode] = {
                KEY.USE_MAX_PWR: {},
                KEY.USE_CUR_PWR: {},
                KEY.TX_POWER: float("nan"),
            }
            self._assign_prediction_result(txNode, use_max_pwr=True)
        # predict tpc and current interference
        # run N times, hoping it converges
        for _i in range(num_iter):
            self.logger.info("Deriving new TPC to compensate..")
            self._predict_tpc(
                useBoxModel=useBoxModel, targetSINR=targetSINR, tpcOFF=tpcOFF
            )
            self.logger.info("Deriving INR at this config..")
            self._predict_inr(useBoxModel=useBoxModel, polarityOFF=polarityOFF)

        # Output network-wise connected links
        self.logger.debug(
            "After iteration, Connected links  = {0}".format(self.tx_rx_links)
        )
        out_fp_no_suffix = "{0}/connected_tx_rx".format(self.logPathDir)
        dump_result(
            out_fp_no_suffix,
            self.tx_rx_links,
            self.logger,
            use_JSON=True,
            to_mongo_db=False,
        )
        # Output network-wise INR values
        self.logger.debug(
            "After iteration, INR profile = {0}".format(self.estimated_inr)
        )
        out_fp_no_suffix2 = "{0}/INR_profile".format(self.logPathDir)
        dump_result(
            out_fp_no_suffix2,
            self.estimated_inr,
            self.logger,
            use_JSON=True,
            to_mongo_db=False,
        )
        # Output Same-pole RSSI values
        self.logger.debug(
            "After iteration, RSSI profile = {0}".format(self.estimated_rssi)
        )
        out_fp_no_suffix3 = "{0}/RSSI_profile".format(self.logPathDir)
        dump_result(
            out_fp_no_suffix3,
            self.estimated_rssi,
            self.logger,
            use_JSON=True,
            to_mongo_db=False,
        )
        for txNode in self.estimated_pwr:
            if not self.__tp.is_connected(txNode):
                continue
            self._assign_prediction_result(txNode, use_max_pwr=False)
            self.result[txNode][KEY.TX_POWER] = self.estimated_pwr[txNode][1]

    def _predict_tpc(self, useBoxModel=False, targetSINR=TARGET_SINR_db, tpcOFF=False):
        """
        Simulation-oriented
        Predict TPC based on estimated INR
        @param tpcOFF: to disable TPC, TPC is enabled by default
        """
        if len(self.estimated_inr) < 1:
            for txNode in self.__tp.get_all_nodes():
                # assume everyone uses minimum possible power
                # format:
                # {txNode: (tx power in db, tx power index,
                # sinr when it is rx, rssi when it is rx)}
                self.estimated_pwr[txNode] = (
                    MAX_PWR_DB,
                    KEY.MAX_PWR_IDX,
                    float("nan"),
                    float("nan"),
                )
            return
        self.estimated_pwr = {}
        for txNode in self.__tp.get_all_nodes():
            rxNodes = self.__tp.get_linked_sector(txNode)
            # skip if is not linked
            if not rxNodes:
                continue
            # handle p2mp - txPower takes the max out of many
            txPowerList = []
            sinrList = []
            for rxNode in rxNodes:
                d = self.__tp.get_distance(txNode, rxNode)
                pathLoss = compute_path_loss(d)
                # assume they point to each other
                txGain = compute_ant_gain(0, useBoxModel=useBoxModel)
                rxGain = compute_ant_gain(0, useBoxModel=useBoxModel)
                # get overall interference
                rx_i = self.estimated_inr[rxNode][0] + NOISE_FLOOR_db
                i_n = pwr2db(db2pwr(rx_i) + NOISE_FLOOR)
                if tpcOFF:
                    txPower = MAX_PWR_DB
                else:
                    # sinr = txPower (EIRP) + txGain + rxGain + pathLoss - i_n + 30
                    txPower = (
                        targetSINR - txGain - rxGain - pathLoss + i_n + EXTRA_LOSS - 30
                    )
                # convert to supported values
                txPower = translate_tx_power(translate_tx_power_idx(txPower))
                rssi = txPower + txGain + rxGain + pathLoss - EXTRA_LOSS + 30
                sinr = rssi - i_n
                if txPower > MAX_PWR_DB:
                    sinr -= txPower - MAX_PWR_DB
                    txPower = MAX_PWR_DB
                if txPower < MIN_PWR_DB:
                    sinr += -txPower + MIN_PWR_DB
                    txPower = MIN_PWR_DB
                if rxNode not in self.estimated_pwr:
                    self.estimated_pwr[rxNode] = [float("nan")] * 4
                self.estimated_pwr[rxNode][2] = sinr
                self.estimated_pwr[rxNode][3] = rssi
                txPowerList.append(txPower)
                sinrList.append(sinr)
            sinr = max(sinrList)
            txPower = txPowerList[sinrList.index(sinr)]
            if txNode not in self.estimated_pwr:
                self.estimated_pwr[txNode] = [float("nan")] * 4
            self.estimated_pwr[txNode][0] = txPower
            self.estimated_pwr[txNode][1] = translate_tx_power_idx(txPower)
            if tpcOFF:
                self.estimated_pwr[txNode][0] = MAX_PWR_DB
                self.estimated_pwr[txNode][1] = KEY.MAX_PWR_IDX
        self.logger.debug("estimated power: {}".format(self.estimated_pwr))

    def _predict_inr(self, useBoxModel=False, polarityOFF=False, samePoleDist=0.5):
        """
        Simulation-oriented
        Predict INR based on estimated tpc
        @param useBoxModel: use box model instead of sinc, by default disabled
        @param polarityOFF: disable polarity, polarity is enabled by defaulty
        @param samePoleDist: Configurable distance for the same-pole nodes
        @param useAntModel: use antenna model instead of either sinc or box model
        """
        self.estimated_inr = {}
        # For Debugging
        self.estimated_rssi = {}
        self.tx_rx_links = {}
        node_names = self.__tp.get_all_nodes(isConnected=True)
        for rxNode in node_names:
            rxTowardsNodes = self.__tp.get_linked_sector(rxNode)
            # skip if is not linked
            if not rxTowardsNodes:
                continue
            # randomly pick the tx node w.r.t. rxNode
            # (as we do not know what time transmitting in p2mp)
            rxTowardsNode = random.choice(rxTowardsNodes)
            rxSite = self.__tp.get_site_name(rxNode)
            # get receiver azimuth w.r.t. tx (absolute angle)
            rxAzimuth = self.__tp.get_angle(rxTowardsNode, rxNode)
            rxINR = 0
            rxINList = []
            # For Debugging
            samePoleRSSI = 0
            samePoleTxList = []
            #  Modeling the interference from adjacent sectors in the same site
            #  when Polarity is ON
            for txNode in node_names:
                txSite = self.__tp.get_site_name(txNode)
                #  Modeling the case where we respect polarity assignment
                if not polarityOFF:
                    # skip if the same node, or same site, or linked sector
                    if txNode == rxNode or txSite == rxSite or txNode in rxTowardsNodes:
                        continue
                    # skip if polarity is the same
                    if self.__tp.get_polarity(txNode) is self.__tp.get_polarity(rxNode):
                        continue
                    # randomly pick the rx node w.r.t. txNode
                    # (as we do not know what time transmitting in p2mp)
                    txTowardsNodes = self.__tp.get_linked_sector(txNode)
                    # Getting connected links
                    self.tx_rx_links[txNode] = txTowardsNodes
                    # skip if is not linked
                    if not txTowardsNodes:
                        continue
                    txTowardsNode = random.choice(txTowardsNodes)
                    txAzimuth = self.__tp.get_angle(txTowardsNode, txNode)
                    # derive path loss
                    d = self.__tp.get_distance(txNode, rxNode)
                    path_loss = compute_path_loss(d)
                    # derive tx gain
                    inr_txAzimuth = self.__tp.get_angle(rxNode, txNode)
                    tx_gain = compute_ant_gain(
                        inr_txAzimuth, txAzimuth, useBoxModel=useBoxModel
                    )
                    inr_rxAzimuth = self.__tp.get_angle(txNode, rxNode)
                    rx_gain = compute_ant_gain(
                        inr_rxAzimuth, rxAzimuth, useBoxModel=useBoxModel
                    )
                #  Modeling the case where we ignore polarity assignment
                else:
                    if txSite == rxSite:
                        # skip if the same node or linked sector
                        if txNode == rxNode:
                            continue
                        # randomly pick the rx node w.r.t. txNode
                        # (as we do not know what time transmitting in p2mp)
                        txTowardsNodes = self.__tp.get_linked_sector(txNode)
                        self.tx_rx_links[
                            txNode
                        ] = txTowardsNodes  # Getting connected links

                        # skip if is not linked
                        if not txTowardsNodes:
                            continue
                        txTowardsNode = random.choice(txTowardsNodes)
                        txAzimuth = self.__tp.get_angle(txTowardsNode, txNode)
                        # d = 0.5
                        path_loss = compute_path_loss(samePoleDist)
                        # derive tx gain
                        # Assuming they are perpendicular to each other
                        tx_gain = compute_ant_gain(90, useBoxModel=useBoxModel)
                        rx_gain = compute_ant_gain(90, useBoxModel=useBoxModel)
                    else:
                        # skip if the same node, or same site, or linked sector
                        if txNode == rxNode or txNode in rxTowardsNodes:
                            continue
                        # randomly pick the rx node w.r.t. txNode
                        # (as we do not know what time transmitting in p2mp)
                        txTowardsNodes = self.__tp.get_linked_sector(txNode)
                        # Getting connected links
                        self.tx_rx_links[txNode] = txTowardsNodes

                        # skip if is not linked
                        if not txTowardsNodes:
                            continue
                        txTowardsNode = random.choice(txTowardsNodes)
                        txAzimuth = self.__tp.get_angle(txTowardsNode, txNode)
                        # derive path loss
                        d = self.__tp.get_distance(txNode, rxNode)
                        path_loss = compute_path_loss(d)
                        # derive tx gain
                        inr_txAzimuth = self.__tp.get_angle(rxNode, txNode)
                        tx_gain = compute_ant_gain(
                            inr_txAzimuth, txAzimuth, useBoxModel=useBoxModel
                        )
                        inr_rxAzimuth = self.__tp.get_angle(txNode, rxNode)
                        rx_gain = compute_ant_gain(
                            inr_rxAzimuth, rxAzimuth, useBoxModel=useBoxModel
                        )
                # get tx power
                txPower = MAX_PWR_DB
                if txNode in self.estimated_pwr:
                    txPower = self.estimated_pwr[txNode][0]
                # compute rss
                rss_db = txPower + tx_gain + rx_gain + path_loss + 30  # dB
                inr = rss_db - NOISE_FLOOR_db  # dB
                if polarityOFF and txSite == rxSite:
                    samePoleRSSI += db2pwr(rss_db)
                    samePoleTxList.append((txNode, rss_db))
                if inr > -10:
                    rxINList.append((txNode, inr))  # dB
                rxINR += db2pwr(rss_db)  # power
            overallINR = pwr2db(rxINR) - NOISE_FLOOR_db  # dB
            if overallINR < -10:
                self.estimated_inr[rxNode] = (-10, [])
            else:
                self.estimated_inr[rxNode] = (overallINR, rxINList)  # dB
            self.estimated_rssi[rxNode] = (pwr2db(samePoleRSSI), samePoleTxList)
        self.logger.debug(self.estimated_inr)
        self.logger.debug(self.estimated_rssi)

    """
    Actual Measurements Based Interference Calculation
    """

    def load_interference_result(self, fp):
        """
        load existing interference analysis result
        """
        with open(fp, "r") as inf:
            self.result = json.load(inf)

    def _get_token_of_interference_node(self, txNode, rxNode):
        """
        Don't call this function directly
        It gets the token (which scan index) given tx and rx node names,
        as required in the tg scan data

        If syntax is changed, may need to change this function
        """
        # skip if the same one
        if txNode == rxNode:
            return None
        # skip if not connected
        if not self.__tp.is_connected(rxNode):
            self.logger.note("RX {0} is not connected".format(rxNode))
            return None
        # skip if data does not contain the tx node as tx
        self.logger.debug("tx {0}, rx {1}".format(txNode, rxNode))
        if txNode not in self.data:
            return None
        for token in self.data[txNode]:
            if rxNode in self.data[txNode][token]:
                return token
        return None

    def _get_interference_data(
        self, my_data, tx_as_txIdx, rx_as_rxIdx, useExactBeam=False
    ):
        """
        Don't call this function directly
        It gets the measurement given a particular tx and rx beam index
        """
        txIdx_left = deg2index(index2deg(tx_as_txIdx) - BEAM_GRAN_DEG)
        txIdx_right = deg2index(index2deg(tx_as_txIdx) + BEAM_GRAN_DEG)
        rxIdx_left = deg2index(index2deg(rx_as_rxIdx) - BEAM_GRAN_DEG)
        rxIdx_right = deg2index(index2deg(rx_as_rxIdx) + BEAM_GRAN_DEG)
        key = "{0}_{1}".format(tx_as_txIdx, rx_as_rxIdx)
        key_up = "{0}_{1}".format(tx_as_txIdx, rxIdx_left)
        key_down = "{0}_{1}".format(tx_as_txIdx, rxIdx_right)
        key_left = "{0}_{1}".format(txIdx_left, rx_as_rxIdx)
        key_right = "{0}_{1}".format(txIdx_right, rx_as_rxIdx)
        if key in my_data:
            return my_data[key]
        if not useExactBeam:
            if key_left in my_data:
                return my_data[key_left]
            elif key_right in my_data:
                return my_data[key_right]
            elif key_up in my_data:
                return my_data[key_up]
            elif key_down in my_data:
                return my_data[key_down]
        self.logger.info(
            "no measurements at ({0},{1})".format(tx_as_txIdx, rx_as_rxIdx)
        )
        return None

    def _estimate_interference(
        self, my_data, target_pwr_idx=None, data_pwr_idx=KEY.MAX_PWR_IDX
    ):
        """
        Don't call this function directly
        It estimates the interference on a target power index,
        given the data measured at a different power index
        """
        estimation = None
        if (
            target_pwr_idx is None
            or isnan(target_pwr_idx)
            or data_pwr_idx is None
            or isnan(data_pwr_idx)
            or target_pwr_idx == data_pwr_idx
        ):
            offset = 0
        else:
            # rule: 1:1 when index from 0 to 22; 1:0.5 when beyond 22
            target_diff = target_pwr_idx - CUT_OFF_IDX
            if target_diff > 0:
                target_diff = target_diff / 2
            data_diff = data_pwr_idx - CUT_OFF_IDX
            if data_diff > 0:
                data_diff = data_diff / 2
            offset = target_diff - data_diff
        if my_data[KEY.SNR] + offset > MINIMUM_SNR_db:
            estimation = {
                KEY.RSSI: my_data[KEY.RSSI] + offset,
                KEY.SNR: my_data[KEY.SNR] + offset,
                KEY.POSTSNR: my_data[KEY.POSTSNR] + offset,
            }
        return estimation

    def dump_interference_result(self, outfolder_path):
        """
        dump the interference result to a folder
        output file is named interference_result.json
        """
        try:
            with open("{0}/interference_result.json".format(outfolder_path), "w") as of:
                json.dump(self.result, of, indent=2)
        except BaseException:
            return False
        return True

    def _validate_node(self, node, is_tx=True):
        """
        Dont call this function directly.

        It validate if we know a node beam index and return its beam index
        """
        # skip if not connected
        if not self.__tp.is_connected(node):
            self.logger.note("{0} is not connected".format(node))
            return None
        # skip if we don't know its beam direction
        idx, idx_rx = self.__tp.get_current_beam(node)
        if not is_tx:
            idx = idx_rx
        if idx is None:
            self.logger.error("{0} has no beam info".format(node))
            return None
        return idx

    def get_interference_w_customized_power(self, customized_power_dict=None):
        """
        @param customized_power_dict: dict
               format: {txNode: rxNode: {KEY.ODS_STA_TX_PWR_avg: xx}}
        """
        # do nothing if nothing found
        if not self.result or customized_power_dict is None:
            return
        self.logger.debug("entered get_interference_w_customized_power")
        # otherwise compute a customized pwr entry
        for txNode in self.result:
            for txTowardsNode in self.result[txNode]:
                tmp = self.result[txNode][txTowardsNode]
                txPowerIdx = KEY.MAX_PWR_IDX
                if txNode in customized_power_dict:
                    if txTowardsNode in customized_power_dict[txNode]:
                        txPowerIdx = customized_power_dict[txNode][txTowardsNode]
                if KEY.USE_CUSTOMIZED_PWR not in tmp:
                    tmp[KEY.USE_CUSTOMIZED_PWR] = {}
                for rxNode in tmp[KEY.USE_MAX_PWR]:
                    for rxTowardsNode in tmp[KEY.USE_MAX_PWR][rxNode]:
                        est_inr = self._estimate_interference(
                            tmp[KEY.USE_MAX_PWR][rxNode][rxTowardsNode],
                            target_pwr_idx=txPowerIdx,
                            data_pwr_idx=KEY.MAX_PWR_IDX,
                        )
                        if est_inr is None:
                            continue
                        if rxNode not in tmp[KEY.USE_CUSTOMIZED_PWR]:
                            tmp[KEY.USE_CUSTOMIZED_PWR][rxNode] = {}
                        tmp[KEY.USE_CUSTOMIZED_PWR][rxNode][rxTowardsNode] = est_inr
        self.logger.debug(self.result)

    def _get_rxinfo(self, relImBeams):
        """
        Get rxInfo from relative IM scan beam info
        """
        rxInfo = []
        for addr, beam in relImBeams.items():
            rxFromNode = self.__tp.get_node_from_mac(addr)
            if not rxFromNode:
                self.logger.error("Node name missing for " + addr)
                continue
            rxInfo.append([rxFromNode, beam])
        return rxInfo

    def _process_response(self, txNode, txInfo, rxNode, scan):
        """
        Dont call this function directly.

        Updates results with INR info for one TX-RX pair
        """
        res = scan[rxNode]
        rxInfo = self._get_rxinfo(res[KEY.REL_IM_BEAMS])

        # Loop through TX beams at TX node and RX beams at RX node
        for txToNode, txBeam, txPwr in txInfo:
            if txToNode == rxNode:
                continue
            for rxFromNode, rxBeam in rxInfo:
                if rxFromNode == txNode:
                    continue

                # Get INR from scan result
                inr = self._get_interference_data(
                    res, txBeam, rxBeam, useExactBeam=True
                )
                if inr is None:
                    continue

                # Found INR --> initialize results for TX node
                if txNode not in self.result:
                    self.result[txNode] = {}
                if txToNode not in self.result[txNode]:
                    self.result[txNode][txToNode] = {
                        KEY.USE_MAX_PWR: {},
                        KEY.USE_CUR_PWR: {},
                        KEY.TX_POWER: None,  # Unused
                    }
                result = self.result[txNode][txToNode]

                # Update results for INR at current power and max power
                for tag, pwr in [
                    (KEY.USE_CUR_PWR, txPwr),
                    (KEY.USE_MAX_PWR, KEY.MAX_PWR_IDX),
                ]:
                    inr_est = self._estimate_interference(
                        inr, target_pwr_idx=pwr, data_pwr_idx=scan[KEY.TX_POWER_IDX]
                    )
                    if not inr_est:
                        continue
                    if rxNode not in result[tag]:
                        result[tag][rxNode] = {}
                    result[tag][rxNode][rxFromNode] = inr_est

    def _get_interference_from_current_beams(self):
        """
        Process relative IM scan data and compute interference with current
        operational beams (reflects changes due to RTCAL/VBS/CBF)
        """
        # Loop through all nodes to get pair-wise interference
        for txNode in self.data:
            # format: [(towardsNode, asTxBeamIdx, asRxBeamIdx, txPwrIdx), ...]
            each = self.__tp.get_all_beams_and_power(txNode)
            txPwrTowards = {b[0]: b[3] for b in each}

            for _token, scan in self.data[txNode].items():
                if scan["mode"] != KEY.SCAN_MODE_RELATIVE:
                    continue

                # Get TX info and map txTowardsNode --> TX beam index
                txInfo = []
                scanPwr = scan.get("txPwrIdx", 0)
                for addr, beam in scan[KEY.REL_IM_BEAMS].items():
                    txToNode = self.__tp.get_node_from_mac(addr)
                    if not txToNode:
                        self.logger.error("Node name missing for " + addr)
                        continue
                    if txToNode not in txPwrTowards:
                        pwr = scanPwr
                        tag = "scan"
                    else:
                        pwr = txPwrTowards[txToNode]
                        tag = "current"
                    self.logger.note(
                        "Using {0} power for {1} --> {2}".format(tag, txNode, txToNode)
                    )
                    txInfo.append([txToNode, beam, pwr])

                # Get RX info and map rxFromNode --> RX beam index
                for rxNode in scan["rxNodes"]:
                    if rxNode == txNode:
                        continue
                    self._process_response(txNode, txInfo, rxNode, scan)

    def _get_interference_from_directional_beams(self):
        """
        Process fine IM scan data and compute interference for current
        directional beams (does not reflect changes due to RTCAL/VBS/CBF)
        """
        # get all node names from topology (only those connected)
        node_names = self.__tp.get_all_nodes(isConnected=True)
        # loop through all nodes to get pair-wise interference
        for txNode in node_names:
            # format: [(towardsNode, asTxBeamIdx, asRxBeamIdx, txPwrIdx), ...]
            each = self.__tp.get_all_beams_and_power(txNode)
            if not each:
                continue
            txInfos = [[b[0], b[1], b[3]] for b in each]
            for rxNode in node_names:
                # skip if they are the same
                if txNode == rxNode:
                    continue
                each = self.__tp.get_all_beams_and_power(rxNode)
                if not each:
                    continue
                rxInfos = [[b[0], b[2]] for b in each]
                # get the correct token from mesurements
                token = self._get_token_of_interference_node(txNode, rxNode)
                if token is None:
                    self.logger.debug(
                        "{0} to {1} token not exist".format(txNode, rxNode)
                    )
                    continue
                else:
                    self.logger.debug("{0} to {1} token exists".format(txNode, rxNode))
                if self.data[txNode][token]["mode"] != KEY.SCAN_MODE_FINE:
                    continue
                # loop through txbeam & rxbeam combinations
                for txTowardsNode, asTxBeamIdx, txPowerIdx in txInfos:
                    # skip if it's a desired link
                    if rxNode == txTowardsNode:
                        self.logger.note(
                            "{0} and {1} is a desired link!".format(txNode, rxNode)
                        )
                        continue
                    for rxTowardsNode, asRxBeamIdx in rxInfos:
                        self.logger.debug(
                            "tx {0} towards {1} uses {2}".format(
                                txNode, txTowardsNode, asTxBeamIdx
                            )
                        )
                        self.logger.debug(
                            "rx {0} towards {1} uses {2}".format(
                                rxNode, rxTowardsNode, asRxBeamIdx
                            )
                        )
                        # get the interference measurement of the tx-rx pair
                        inr = self._get_interference_data(
                            self.data[txNode][token][rxNode], asTxBeamIdx, asRxBeamIdx
                        )
                        if inr is None:
                            continue
                        # if not using max power for scans, we will
                        # adjust the results to estimate what it looks like when
                        # using max txPowerIdx (for APPROXIMATION only)
                        pwrIdxUponIMScan = self.data[txNode][token].get(
                            KEY.TX_POWER_IDX, KEY.MAX_PWR_IDX
                        )
                        if not pwrIdxUponIMScan == KEY.MAX_PWR_IDX:
                            self.logger.error("IM scan NOT done by max power")
                            self.logger.error(
                                "We have to estimate from powerIdx {0} to max power".format(
                                    pwrIdxUponIMScan
                                )
                            )
                            self.logger.error("Analysis may be inaccurate")
                            inr = self._estimate_interference(
                                inr,
                                target_pwr_idx=KEY.MAX_PWR_IDX,
                                data_pwr_idx=pwrIdxUponIMScan,
                            )
                            if inr is None:
                                continue
                        if txPowerIdx is None:
                            self.logger.debug("got no txPowerIdx")
                        # initialize for txNode only if we have valid result
                        if txNode not in self.result:
                            self.result[txNode] = {}
                        if txTowardsNode not in self.result[txNode]:
                            self.result[txNode][txTowardsNode] = {
                                KEY.USE_MAX_PWR: {},
                                KEY.USE_CUR_PWR: {},
                                KEY.TX_POWER: txPowerIdx,
                            }
                        # add current tx power interference to result
                        tmp = self.result[txNode][txTowardsNode]
                        if rxNode not in tmp[KEY.USE_MAX_PWR]:
                            tmp[KEY.USE_MAX_PWR][rxNode] = {}
                        tmp[KEY.USE_MAX_PWR][rxNode][rxTowardsNode] = inr
                        # estimate with current power
                        est_inr = self._estimate_interference(
                            inr, target_pwr_idx=txPowerIdx, data_pwr_idx=KEY.MAX_PWR_IDX
                        )
                        if est_inr is None:
                            continue
                        if rxNode not in tmp[KEY.USE_CUR_PWR]:
                            tmp[KEY.USE_CUR_PWR][rxNode] = {}
                        tmp[KEY.USE_CUR_PWR][rxNode][rxTowardsNode] = est_inr

    def get_interference_from_data(self, data, out_fp=None, scanMode=None):
        """
        derive interference based on current topology
        it now handles analysis with p2mp configurations
        @param data: tg scan data
        @param out_fp: output folder path
        """
        self.data = data
        self.logger.info("Get interference from data, scanMode = {}".format(scanMode))
        if scanMode == KEY.SCAN_MODE_RELATIVE:
            self.logger.note("Using relative IM scan data (operational beams)")
            self._get_interference_from_current_beams()
        else:
            self.logger.note("Using fine IM scan data (directional beams)")
            self._get_interference_from_directional_beams()

        # don't output result to folder if out_fp is None
        if out_fp is None:
            return True
        if os.path.isfile(out_fp):
            self.logger.error("{0} is not a folder".format(out_fp))
            return False
        return self.dump_interference_result(out_fp)
