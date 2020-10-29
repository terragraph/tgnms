#!/usr/bin/env python3

import logging

# built-ins
import os

# modules
import modules.keywords as KEY
from modules.addon_misc import dump_result, load_result
from modules.util_logger import EmptyLogger
from modules.util_topology import Topology


class Data(object):
    """
    Data module which loads results (from file)
    """

    def __init__(self, topology=None, loggerTag="DATA", logPathDir=None, printout=True):
        """
        @param topology: Topology() object form util_topology
        @param loggerTag: logger identifier
        @param logPathDir: path of where log stays
        @param printout: whether we print out the process, default True
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
        self.logPathDir = logPathDir
        # variables config
        self.topology = topology
        # data
        self.mod_history = {}
        self.data_monitor = {}
        self.data_iperf = {}
        self.data_ping_p2p = {}
        self.data_ping_sa = {}
        self.data_multihop = {}
        self.data_multihop_cpe = {}
        self.data_im = {}
        self.data = {}
        # analysis
        self.analysis_ping = {}
        self.analysis_tcp = {}
        self.analysis_udp = {}
        self.analysis_routes = {}
        self.analysis_foliage = {}
        self.analysis_interference = {}
        self.analysis_connectivity = {}

    def load_topology(self, fp):
        if self.topology is None:
            self.topology = Topology()
        return self.topology.load_topology(fp)

    def load_topology_extra(self, fp):
        """
        load phy layer info from topology_xx_extra.json

        format:
        {
            txNodeName: {
                rxNodeName: {
                    phy_layer_stat_key1: val,
                    ...
                }, ...
            }, ...
        }
        """
        if self.topology is None:
            self.logger.debug("Created a new Topology()")
            self.topology = Topology()
        return self.topology.load_topology_extra(fp)

    def load_mod_history(self, fp):
        """
        load fw_config modification history

        format:
        {
            nodeName: [
                (time1, cateogry, param, change_to_val)
            ]
        }
        """
        if isinstance(fp, dict):
            mod_history = fp
        else:
            mod_history = load_result(fp)
        if not mod_history:
            return False
        self.mod_history = mod_history
        return True

    def load_ods_data_offline(self, fp):
        """
        load data from ODS offline

        format:
        {
            txNodeName: {
                rxNodeName: {
                    ods_key1: [(time1, val1), (time2, val2), ...],
                    ods_key2: [(time1, val1), (time2, val2), ...],
                    ...
                }
            }
        }
        """
        if isinstance(fp, dict):
            ods_data = fp
        else:
            ods_data = load_result(fp)
        if not ods_data:
            return False
        self.data = ods_data
        return True

    def load_routes_analysis(self, fp):
        """
        format:
        {
            txNodeName: {
                rxNodeName: [
                    (txIdx, rxIdx, SNR), ...
                ], ...
            }, ...
        }
        """
        try:
            if isinstance(fp, dict):
                self.analysis_routes = fp
            else:
                self.analysis_routes = load_result(fp, self.logger)
        except BaseException:
            return False
        return True

    def get_routes_analysis(self):
        return self.analysis_routes

    def load_foliage_analysis(self, fp):
        """
        format:
        {
            txNodeName__rxNodeName: {
                KEY.LB_FOLIAGE: int,
                "rssiStdNodeA": float,
                "rssiStdNodeZ": float,
                "rssiAvgNodeA": float,
                "rssiAvgNodeZ": float,
                "snrStdNodeA": float,
                "snrStdNodeZ": float,
                "snrAvgNodeA": float,
                "snrAvgNodeZ": float
            }, ...
        }
        """
        try:
            if isinstance(fp, dict):
                self.analysis_foliage = fp
            else:
                self.analysis_foliage = load_result(fp, self.logger)
        except BaseException:
            return False
        return True

    def get_foliage_analysis(self):
        return self.analysis_foliage

    def load_connectivity_analysis(self, fp):
        """
        format:
        {
            txNodeName: {
                rxNodeName: {
                    [txIdx, rxIdx, SNR], ...
                }, ...
            }, ...
        }
        """
        try:
            if isinstance(fp, dict):
                self.analysis_connectivity = fp
            else:
                self.analysis_connectivity = load_result(fp, self.logger)
        except BaseException:
            return False
        return True

    def get_connectivity_analysis(self):
        return self.analysis_connectivity

    def load_interference_analysis(self, fp):
        """
        format:
        {
            rxNodeName-rxTowardsNodeName: [
                overall_INR_float,
                [
                    (txNodeName, INR, txTowardsNode), ...
                ]
            ], ...
        }
        """
        try:
            if isinstance(fp, dict):
                self.analysis_interference = fp
            else:
                self.analysis_interference = load_result(fp, self.logger)
        except BaseException:
            return False
        return True

    def get_interference_analysis(self):
        return self.analysis_interference

    def load_iperf_analysis(self, fp, udp=False):
        """
        format:
        {
            txNodeName__rxNodeName: {
                KEY.IPERF_AVG: float,
                KEY.IPERF_MIN: float,
                KEY.IPERF_MAX: float,
                KEY.IPERF_STD: float,
                KEY.IPERF_UDP_LOSS: None,
                KEY.IPERF_PER_AVG: float,
                KEY.LB_TCP/UDP_STATUS: int
            }
        }
        """
        try:
            if udp:
                if isinstance(fp, dict):
                    self.analysis_udp = fp
                else:
                    self.analysis_udp = load_result(fp, self.logger)
                    if "udp" in self.analysis_udp:
                        self.analysis_udp = self.analysis_udp["udp"]["iperf_result"]
            else:
                if isinstance(fp, dict):
                    self.analysis_tcp = fp
                else:
                    self.analysis_tcp = load_result(fp, self.logger)
                    if "tcp" in self.analysis_tcp:
                        self.analysis_tcp = self.analysis_tcp["tcp"]["iperf_result"]
        except BaseException:
            return False
        return True

    def get_iperf_analysis(self, udp=False):
        if udp:
            return self.analysis_udp
        return self.analysis_tcp

    def load_data(self, fp):
        """
        load data from file path `fp`

        format:
        {
            txNodeName: {
                rxNodeName: {
                    'monitor': {
                        extra_info1(e.g., KEY.ODS_STA_PER): [(tsf, val), ...],
                        ...
                    },
                    'tcp': {
                        ... similar as above ...
                        KEY.IPERF_DETAILS: [(time, bytes sent, bandwidth)],
                        KEY.IPERF_AVG: float,
                        KEY.IPERF_MIN: float,
                        KEY.IPERF_MAX: float,
                        KEY.IPERF_STD: float,
                        KEY.IPERF_UDP_LOSS: None
                    },
                    'udp': {
                        ... same as above ...
                        KEY.IPERF_UDP_LOSS: float
                    }
                }
            }
        }
        """
        if isinstance(fp, dict):
            data = fp
        else:
            data = load_result(fp, self.logger)
            if not data:
                return False
        for tx in data:
            for rx in data[tx]:
                if "udp" in data[tx][rx] or "tcp" in data[tx][rx]:
                    self.data_iperf = data
                    return True
                if "monitor" in data[tx][rx]:
                    self.data_monitor = data
                    return True
        return False

    def get_monitor_data(self, tx=None, rx=None):
        """
        return monitor data, optionally of specified tx and rx
        """
        if tx is None and rx is None:
            return self.data_monitor
        if tx not in self.data_monitor:
            self.logger.error("tx {0} not found in monitor data".format(tx))
            return {}
        if rx not in self.data_monitor[tx]:
            self.logger.error("rx {0} not found in monitor data".format(rx))
            return {}
        return self.data_monitor[tx][rx]

    def get_iperf_data(self, tx=None, rx=None):
        """
        return iperf data, optionally of specified tx and rx
        """
        if tx is None and rx is None:
            return self.data_iperf
        if tx not in self.data_iperf:
            self.logger.error("tx {0} not found in iperf data".format(tx))
            return {}
        if rx not in self.data_iperf[tx]:
            self.logger.error("rx {0} not found in iperf data".format(rx))
            return {}
        return self.data_iperf[tx][rx]

    def load_ping_analysis(self, fp):
        """
        format:
        {
            txNodeName__rxNodeName: {
                KEY.PING_LOSS: float,
                KEY.PING_AVG: float,
                KEY.PING_MIN: float,
                KEY.PING_MAX: float,
                KEY.PING_STD: float,
                KEY.LB_PING_STATUS: int
            },
        }
        """
        try:
            if isinstance(fp, dict):
                self.analysis_ping = fp
            else:
                self.analysis_ping = load_result(fp, self.logger)
        except BaseException:
            return False
        return True

    def get_ping_analysis(self):
        return self.analysis_ping

    def load_multihop_data(self, fp):
        if isinstance(fp, dict):
            data_multihop = fp
        else:
            data_multihop = load_result(fp, self.logger)
        for sector in data_multihop:
            try:
                if data_multihop[sector]["iperf_status"] == "Passed":
                    self.data_multihop = data_multihop
                    return True
            except KeyError:
                continue
        self.data_multihop = {}
        return False

    def load_multihop_data_vis(self, fp):
        if isinstance(fp, dict):
            data_multihop = fp
        else:
            data_multihop = load_result(fp, self.logger)
        for sector in data_multihop:
            try:
                if data_multihop[sector]["iperf_result"]:
                    self.data_multihop = data_multihop
                    return True
            except KeyError:
                continue
        self.data_multihop = {}
        return False

    def load_multihop_cpe_data(self, fp):
        if isinstance(fp, dict):
            data_multihop_cpe = fp
        else:
            data_multihop_cpe = load_result(fp, self.logger)
        for sector in data_multihop_cpe:
            try:
                if data_multihop_cpe[sector]["iperf_cpe_status"] == "Passed":
                    self.data_multihop_cpe = data_multihop_cpe
                    return True
            except KeyError:
                continue
        self.data_multihop_cpe = {}
        return False

    def load_ping_data(self, fp, for_sa=False):
        """
        load ping data from file path `fp`

        format:
        {
            txNodeName: {
                rxNodeName: {
                    KEY.PING_DETAILS: [(seq, ttl, latency)],
                    KEY.PING_AVG: float,
                    KEY.PING_MIN: float,
                    KEY.PING_MAX: float,
                    KEY.PING_STD: float
                }
            }
        }
        """
        if isinstance(fp, dict):
            data_ping = fp
        else:
            data_ping = load_result(fp, self.logger)
        for tx in data_ping:
            for rx in data_ping[tx]:
                if KEY.PING_DETAILS in data_ping[tx][rx]:
                    if for_sa:
                        self.data_ping_sa = data_ping
                    else:
                        self.data_ping_p2p = data_ping
                    return True
        return False

    def get_ping_data(self, for_sa=False):
        if for_sa:
            return self.data_ping_sa
        return self.data_ping_p2p

    def get_multihop_data(self, tx=None, rx=None):
        """
        return multihop data, optionally of specified tx and rx
        it could include iperf throughput, ping latency, traceroute hop counts
        """
        # obtain the entire for all tx - rx pairs
        if tx is None and rx is None:
            return self.data_iperf
        # obtain one single measurement associated with the tx node
        if tx not in self.data_iperf:
            self.logger.error("tx {0} not found in iperf data".format(tx))
            return {}
        if rx not in self.data_iperf[tx]:
            self.logger.error("rx {0} not found in iperf data".format(rx))
            return {}
        return self.data_iperf[tx][rx]

    def get_mulihop_cpe_data(self):
        return self.data_multihop_cpe

    def get_per_sector_iperf(self, sector):
        iperf_data = self.data_multihop[sector]["iperf_result"]
        if "server_output_json" in self.data_multihop[sector]["iperf_result"]:
            # UL - server_output_json
            self.logger.debug("node {} uplink in multihop".format(sector))
            iperf_data = self.data_multihop[sector]["iperf_result"][
                "server_output_json"
            ]
        else:
            if self.data_multihop[sector]["iperf_result"] is not None:
                # DL - direct output
                self.logger.debug("node {} downlink in multihop".format(sector))
                iperf_data = self.data_multihop[sector]["iperf_result"]
            else:
                self.logger.debug(
                    "multihop iperf result is empty for {}".format(sector)
                )

        iperf_client_data = self.data_multihop[sector]["iperf_result"]
        iperf_sum_bps = 0
        retransmits = []
        try:
            for interval in iperf_data["intervals"]:
                iperf_sum_bps = iperf_sum_bps + interval["sum"]["bits_per_second"]
            self.logger.debug("iperf_sum_bps={}".format(iperf_sum_bps))
            cumulative_iperf_mbps = (
                iperf_sum_bps / len(iperf_data["intervals"])
            ) * 0.000001
        except Exception as e:
            print(e)
            cumulative_iperf_mbps = 0

        try:
            for interval in iperf_client_data["intervals"]:
                retransmits.append(interval["sum"]["retransmits"])
        except Exception as e:
            print(e)
            retransmits.append(0)
        self.logger.debug("cumulative_iperf_mbps={0:.2f}".format(cumulative_iperf_mbps))
        self.logger.debug("sector {0}, retransmits={1}".format(sector, retransmits))
        if not retransmits:
            max_retransmits = 0
        else:
            max_retransmits = max(retransmits)
        return cumulative_iperf_mbps, max_retransmits

    def get_per_cpe_iperf(self, sector):
        iperf_data = self.data_multihop_cpe[sector]["iperf_cpe_result"]
        iperf_sum_bps = 0
        retransmits = []
        try:
            for interval in iperf_data["intervals"]:
                iperf_sum_bps = iperf_sum_bps + interval["sum"]["bits_per_second"]
                retransmits.append(interval["sum"]["retransmits"])
            cumulative_iperf_mbps = (
                iperf_sum_bps / len(iperf_data["intervals"])
            ) * 0.000001
            if not retransmits:
                max_retransmits = 0
            else:
                max_retransmits = max(retransmits)
            return cumulative_iperf_mbps, max_retransmits
        except Exception:
            print(self.data_multihop_cpe[sector])
            return 0

    def load_data_im_all(self, folderpath, prefix="raw_scan"):
        """
        load all tg scan data (im data) from folder path
        """
        # clear out data_im if we try to load all
        self.data_im = {}
        files = [x for x in os.listdir(folderpath) if prefix in x]
        # distinguish pickle and json data
        tmp = [x for x in files if ".pickle" in x]
        if tmp:
            files = tmp
        else:
            files = [x for x in files if ".pickle" not in x]
        if len(files) < 1:
            self.logger.error("no related files in {0}".format(folderpath))
            return False
        for f in files:
            self.load_data_im_each("{0}/{1}".format(folderpath, f), more=True)
        if len(self.data_im) > 0 and ".pickle" not in files[0]:
            out_fp_no_suffix = "{0}/{1}".format(folderpath, prefix)
            self.logger.debug("Planned to dump {0}".format(out_fp_no_suffix))
            out_fp = dump_result(
                out_fp_no_suffix, self.data_im, self.logger, use_pickle=True
            )
            # TODO: remove out_fp_no_suffix.json and pickle file
            return out_fp is not None
        return True

    def load_data_im_each(self, fp, more=False):
        """
        load tg scan data (im data) from file path `fp`
        @param more: set True to prevent clearing previous self.data_im
        """
        data_im = load_result(fp)
        if not data_im:
            return False
        data_im = _data_im_compression(data_im)
        if not more:
            self.data_im = {}
        # start combining
        for txNode in data_im:
            if txNode not in self.data_im:
                self.data_im[txNode] = data_im[txNode]
                continue
            for token in data_im[txNode]:
                if token in self.data_im[txNode]:
                    msg = "{0} should not be duplicated".format(token)
                    self.logger.error(msg)
                    # TODO: handle this error or skip it?
                    pass
                self.data_im[txNode][token] = data_im[txNode][token]
        return True

    def get_im_data(self):
        return self.data_im


def _data_im_set_rel_im_beam_info(data, res):
    beam_info = res.get("beamInfoList", None)
    if beam_info is None:
        return
    beams = {}
    for beam in beam_info:
        beams[beam["addr"]] = beam["beam"]
    data[KEY.REL_IM_BEAMS] = beams


def _data_im_compression_each_rx(data, new_data):
    rxNodeList = []
    for rxNode in data:
        newList = {}
        counts = {}
        # compatible with the 2018 tg scan status json format
        if not data[rxNode].get("status", 10) == 0:
            continue
        for m in data[rxNode]["routeInfoList"]:
            key = "{0}_{1}".format(m["route"]["tx"], m["route"]["rx"])
            if key in newList:
                counts[key] = counts[key] + 1
                newList[key][KEY.RSSI] = newList[key][KEY.RSSI] + m["rssi"]
                newList[key][KEY.SNR] = newList[key][KEY.SNR] + m["snrEst"]
                newList[key][KEY.POSTSNR] = newList[key][KEY.POSTSNR] + m["postSnr"]
            else:
                counts[key] = 1
                newList[key] = {
                    KEY.RSSI: m["rssi"],
                    KEY.SNR: m["snrEst"],
                    KEY.POSTSNR: m["postSnr"],
                }
        # Average routes
        for key in newList:
            newList[key][KEY.RSSI] = newList[key][KEY.RSSI] / counts[key]
            newList[key][KEY.SNR] = newList[key][KEY.SNR] / counts[key]
            newList[key][KEY.POSTSNR] = newList[key][KEY.POSTSNR] / counts[key]
        if len(newList) > 0:
            if rxNode in new_data:
                print("duplicated rxNode!")
                print(rxNode)
                print(new_data.keys())
            _data_im_set_rel_im_beam_info(newList, data[rxNode])
            new_data[rxNode] = newList
            rxNodeList.append(rxNode)
    return rxNodeList


def _data_im_compression(tmp):
    """
    return data format:
    {
        txNodeName: {
            tokenIdx: {
                'mode': scanMode,
                'type': scanType,
                'txPwrIdx': txPwrIdx,
                'startBwgdIdx': startBwgdIdx,
                'curSuperframeNum': curSuperframeNum,
                'beamInfoList': {
                    txTowardsNode: beamIdx,
                    ...
                },
                'rxNodes': [
                    rxNodeName,
                    ...
                ]
                rxNodeName: {
                    'beamInfoList': {
                        rxFromNode: beamIdx,
                        ...
                    },
                    txIdx_rxIdx(in str format): {
                        'rssi': rssi,
                        'postSNRdB': postSnr,
                        'snrEst': snrEst
                    },
                    ...
                },
                ...
            },
            ...
        },
        ...
    }
    """
    # compressing data (for double packets) if file is not compressed
    newtmp = {}
    # use 'scans' to identify if it's comrpessed or not
    if "scans" not in tmp:
        return tmp
    for token, scan in tmp["scans"].items():
        # Skip if not IM scan
        if scan["type"] != KEY.SCAN_TYPE_IM:
            continue
        txNode = scan["txNode"]
        if txNode not in scan["responses"]:
            continue
        tx_res = scan["responses"][txNode]
        if tx_res.get("status", -1) != 0:
            continue
        newResponse = {}
        newResponse["type"] = scan["type"]
        newResponse["mode"] = scan["mode"]
        newResponse["curSuperframeNum"] = tx_res.get("curSuperframeNum", None)
        newResponse[KEY.TX_POWER_IDX] = tx_res.get("txPwrIndex", 0)
        _data_im_set_rel_im_beam_info(newResponse, tx_res)
        try:
            startBwgdIdx = scan["startBwgdIdx"]
            newResponse["startBwgdIdx"] = startBwgdIdx
        except BaseException:
            pass
        rxNodes = _data_im_compression_each_rx(scan["responses"], newResponse)
        newResponse["rxNodes"] = rxNodes
        if txNode not in newtmp:
            newtmp[txNode] = {}
        newtmp[txNode][token] = newResponse
    return newtmp
