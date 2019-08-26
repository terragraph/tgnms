#!/usr/bin/env python3

import collections
import json
import logging

# built-ins
import os
import time

import gevent

# modules
import modules.keywords as KEY
from modules.addon_parser_topology import (
    parse_inband_ip,
    parse_topology_filepath,
    parse_topology_ls,
)
from modules.util.remote.node_operation import REMOTE
from modules.util_logger import EmptyLogger
from modules.util_topology import Topology


class REMOTE_TG(REMOTE):
    """
    It extends REMOTE(SSH) object and reads results of TG commands,
    including "tg topology" for the benefit of updating local topology file,
    and "tg scan" for doing im scan
    """

    def __init__(self, params, loggerTag="CONNECT", logPathDir=None, printout=True):
        """
        @param params: configuration parameters (json format)
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
            logpath = "{0}/log/tg_{1}.log".format(logPathDir, loggerTag)
            if ("config" in logpath) or ("iperf" in logpath):
                self.logger.debug("REMOTE_TG init, logpath={}".format(logpath))
                gevent.sleep(2)
        self.logPathDir = logPathDir
        # for remote login
        self.child = None
        # track current connection
        self.isConnected = []
        # store the parameters of the run in the object
        self.params = params
        # initialize a topology
        self.topology = Topology()

    """
    Topology Related (tg topology)
    """

    def _fetch_inband_ip(self):
        """
        get inband ip of all nodes
        """
        self.logger.info("Parsing `tg status` for inband ip..")
        resp = self.write(
            "{0} status".format(self.params.get("controller", {}).get("tg_cli", "tg"))
        )
        if resp[0] == "err":
            return False
        ips = parse_inband_ip(resp[1:], self.logger)
        for sector in ips:
            # don't get ip if the node if offline, even if it has ip
            if (
                self.topology.is_node(sector)
                and not self.topology.get_status(sector) == "OFFLINE"
            ):
                self.topology.set_ip(sector, ips[sector], inband=True)
        return True

    def _fetch_realtime_topology(self):
        """
        get real-time topology as json format
        """
        self.logger.info("Parsing `tg topology ls`..")
        resp = self.write(
            "{0} topology ls".format(
                self.params.get("controller", {}).get("tg_cli", "tg")
            )
        )
        if resp[0] == "err":
            return False
        # detailed syntax refer to parse_topology_ls in addon
        result = parse_topology_ls(resp[1:], self.logger)
        # update node
        for tmp in result["nodes"]:
            if tmp[0] not in self.topology.get_all_nodes():
                self.logger.debug("add node {0}".format(tmp[0]))
            else:
                self.logger.debug("update node {0}".format(tmp[0]))
            self.topology.add_node(tmp[0])
            self.topology.set_mac(tmp[0], tmp[1])
            self.topology.set_pop(tmp[0], tmp[2])
            self.topology.set_node_type(tmp[0], tmp[3])
            self.topology.set_status(tmp[0], tmp[4])
            self.topology.set_primary(tmp[0], tmp[5])
            self.topology.set_site_name(tmp[0], tmp[6])
        # update link
        for tmp in result["links"]:
            if not self.topology.is_link(tmp[0]):
                self.logger.debug("add link {0}".format(tmp[0]))
                self.topology.link[tmp[0]] = {"name": tmp[0]}
            else:
                self.logger.debug("update link {0}".format(tmp[0]))
            self.topology.set_a_node(tmp[0], tmp[1])
            self.topology.set_z_node(tmp[0], tmp[2])
            self.topology.set_alive(tmp[0], tmp[3])
            self.topology.set_link_type(tmp[0], tmp[4])
            self.topology.set_link_attempts(tmp[0], int(tmp[5]))
            self.topology.set_linked_sector(tmp[1], tmp[2])
            self.topology.set_linked_sector(tmp[2], tmp[1])
        # update site
        for tmp in result["sites"]:
            if not self.topology.is_site(tmp[0]):
                self.logger.debug("add site {0}".format(tmp[0]))
                self.topology.site[tmp[0]] = {"name": tmp[0]}
                # add site do not care about accuracy
                self.topology.set_location(tmp[0], tmp[1], tmp[2], tmp[3], tmp[4])
            elif tmp[4] > KEY.LOCATION_ACCURACY_THRESHOLD:
                # update site if accuracy is less than 1k meter and >0
                self.logger.debug("update site {0}".format(tmp[0]))
                self.topology.set_location(tmp[0], tmp[1], tmp[2], tmp[3], tmp[4])
        return True

    def fetch_fw_config(self, is_backup=False):
        """
        get fw config data (or the backup one)
        """
        fw_cfg_fp = "/etc/e2e_config/fw_cfg.json"
        if is_backup:
            fw_cfg_fp += "_FWConfigModderBak"
        if not self.isfile(fw_cfg_fp):
            self.logger.error("{0} does not exist!".format(fw_cfg_fp))
            return {}
        resp = self.write("cat {0}".format(fw_cfg_fp))
        if resp[0] == "err":
            self.logger.error(resp)
        else:
            # in case last line in file is not newline
            resp[-1] = resp[-1][: (resp[-1].rfind("}") + 1)]
            try:
                return json.loads(
                    "".join(resp), object_pairs_hook=collections.OrderedDict
                )
            except BaseException as ex:
                self.logger.error(ex)
        return {}

    def backup_fw_config(self):
        """
        copy fw_cfg.json as a backup
        """
        self.logger.info("backing up fw_cfg.json..")
        fw_cfg_fp = "/etc/e2e_config/fw_cfg.json"
        resp = self.write("cp {0} {0}_FWConfigModderBak".format(fw_cfg_fp))
        return not resp[0] == "err"

    def recover_fw_config(self):
        """
        restore from fw_cfg.json backup
        """
        self.logger.info("restoring from fw_cfg.json_FWConfigModderBak..")
        fw_cfg_fp = "/etc/e2e_config/fw_cfg.json"
        self.enable_rw_root()
        resp = self.write("cp {0}_FWConfigModderBak {0}".format(fw_cfg_fp))
        return not resp[0] == "err"

    def set_fw_config(self, category, key, new_val, backup=True):
        """
        set fw config
        """
        fw_cfg_fp = "/etc/e2e_config/fw_cfg.json"
        fw_config = self.fetch_fw_config()
        if not fw_config:
            return False
        self.enable_rw_root()
        if backup:
            self.backup_fw_config()
        fw_config[category][key] = new_val
        cmd = "echo '{0}' ".format(json.dumps(fw_config, indent=2))
        cmd += " > {0}".format(fw_cfg_fp)
        resp = self.write(cmd)
        return not resp[0] == "err"

    def get_rootfs_fp(self):
        """
        Fetch the rootfs folder path used by controller
        """
        self.logger.info("Getting rootfs folder path in use")
        tg_services_fp = "/etc/default/tg_services"
        if not self.isfile(tg_services_fp):
            # if above path does not exist, try a different place
            tg_services_fp = "/etc/sysconfig/tg_services"
        resp = self.write("cat {0} | grep E2E_ROOTFS".format(tg_services_fp))
        if len(resp) > 1:
            if "No such file" in resp[1]:
                self.logger.error("weird, {0} not exists".format(tg_services_fp))
                return None
            for line in resp[1:]:
                if "E2E_ROOTFS" == line[:10]:
                    try:
                        return line.split("=")[1].replace('"', "").replace("'", "")
                    except BaseException:
                        self.logger.error("cannot parse line: {0}".format(line))
        self.logger.error("Online fetch failed, controller is running?")
        return None

    def get_custom_rootfs_fp(self, default_fp, sysconfig_fp):
        """
        Fetch the rootfs folder path used by controller
        """
        self.logger.info("Getting rootfs folder path in use")
        tg_services_fp = default_fp
        if not self.isfile(tg_services_fp):
            # if above path does not exist, try a different place
            tg_services_fp = sysconfig_fp
        resp = self.write("cat {0} | grep DATA_DIR".format(tg_services_fp))
        if len(resp) > 1:
            if "No such file" in resp[1]:
                self.logger.error("weird, {0} not exists".format(tg_services_fp))
                return None
            for line in resp[1:]:
                if "DATA_DIR" == line[:8]:
                    try:
                        return (
                            line.split("=")[1]
                            .replace('"', "")
                            .replace("'", "")
                            .replace("data", "")
                        )
                    except BaseException:
                        self.logger.error("cannot parse line: {0}".format(line))
        self.logger.error("Online fetch failed, controller is running?")
        return None

    def get_topology_remote_fp(self):
        """
        Fetch the topology file path currently used by controller
        """
        self.logger.info("Getting topology file in use..")
        ps_fp_syntax1 = "--topology-file"
        ps_fp_syntax2 = "--topology_file"
        ps_fp_syntax3 = "-topology-file"
        ps_fp_syntax4 = "-topology_file"
        new_sys = "ps aux | grep -v grep | grep '\-topology'"
        self.logger.info("Finding topology file location")
        resp = self.write(new_sys)
        if len(resp) < 2 or "invalid" in resp[1]:
            resp = self.write(new_sys.replace("aux", ""))
        if len(resp) < 2:
            self.logger.error("Online fetch failed, controller is running?")
            return None
        return parse_topology_filepath(
            resp[1:],
            [ps_fp_syntax1, ps_fp_syntax2, ps_fp_syntax3, ps_fp_syntax4],
            self.logger,
        )

    def load_topology_from_local_path(self, filepath):
        """
        load the topology file from local file path
        """
        self.logger.info("Loading Topology from {}".format(filepath))
        self.topology.load_topology(filepath)
        self.logger.info("toplogy file location is {}".format(filepath))

    def load_topology_from_remote_path(self, args=None):
        """
        load the topology file from remote file path
        """
        self.logger.info("Fetching Topology file from remote file path.")
        remote_fp = self.get_topology_remote_fp()
        self.logger.debug("remote_fp={}".format(remote_fp))
        if remote_fp is None:
            return False

        if args.get("custom", {}).get("tg_services_remote_path", False):
            rootfs = self.get_custom_rootfs_fp(
                default_fp=args["custom"]["tg_services_remote_path"]["default_fp"],
                sysconfig_fp=args["custom"]["tg_services_remote_path"]["sysconfig_fp"],
            )
        else:
            rootfs = self.get_rootfs_fp()
        self.logger.debug(
            "Load Topology, rootfs = {}, remote_fp = {}".format(rootfs, remote_fp)
        )
        if rootfs is None:
            # guess rootfs
            rootfs = "/opt/rootfs"
        remote_fp = "{0}/{1}".format(rootfs, remote_fp)
        if not self.isfile(remote_fp):
            self.write("sudo cp {0} /tmp/".format(remote_fp))
            remote_fp = "/tmp/{0}".format(remote_fp.split("/")[-1])
            if not self.isfile(remote_fp):
                return False
        self.logger.info("remote_fp={}".format(remote_fp))
        resp = self.write("cat {0}".format(remote_fp))
        if resp[0] == "err":
            self.logger.error(resp)
            return False

        # in case last line in file is not newline
        resp[-1] = resp[-1][: (resp[-1].rfind("}") + 1)]

        # load topoogy from topology file
        if self.topology.load_topology(resp[1:]):
            # update topology from online tg topology ls
            self.logger.info("Updating Topology from `tg topology ls`...")
            # get real-time topology and in-band ip
            return self._fetch_realtime_topology() and self._fetch_inband_ip()
        else:
            return False

    def tg_topology_ls(self):
        """
        tg topology ls
        """
        self.logger.info("Running `tg topology ls`..")
        resp = self.write("{0} topology ls").format(
            self.params.get("controller", {}).get("tg_cli", "tg")
        )
        if resp[0] == "err":
            self.logger.error("error occurs")
        else:
            for item in resp[1:]:
                self.logger.info(item)

    def view_topology_online(self):
        """
        run `tg topology ls`
        """
        self.tg_topology_ls()

    def get_channel_info(self, node, sleep_time=10):
        """
        Find extra info at a single node based on its name
        including current beam direction, current power index, and current snr
        """
        myinfo = {}
        # write r2d2 result
        self.logger.info("Running r2d2 fw_stats.. wait for {0}sec".format(sleep_time))
        self.fw_stats_to_file(sleep_time)
        # just in case r2d2 misses info
        self.enable_logging()
        time.sleep(sleep_time + 1)
        self.disable_logging()
        linked_nodes = self.topology.get_linked_sector(node)
        if not linked_nodes:
            return myinfo
        # in case we have y-street, or point-to-multi-point
        for node_l in linked_nodes:
            self.logger.info(
                "Getting snr, beam, etc. from {0} to {1}".format(node, node_l)
            )
            target_mac = self.topology.get_mac(node_l)
            # get wanted info
            myinfo[node_l] = {}
            for my_key in (
                [KEY.ODS_PERIOD_RX_BEAM, KEY.ODS_PERIOD_TX_BEAM]
                + KEY.ODS_PHY_DATA[:7]
                + [KEY.ODS_STA_TX_PWR]
            ):
                filter_kw = [target_mac, my_key]
                myinfo[node_l][my_key] = self.get_fw_stats(filter_kw)
                # in case r2d2 does not report beam,
                # we manually parse them from kernel log
                if not myinfo[node_l][my_key]:
                    if my_key == KEY.ODS_PERIOD_RX_BEAM:
                        beams = self.get_beam_info_kernel(target_mac)
                        if not beams:
                            continue
                        __tx, rx = beams[-1]
                        myinfo[node_l][my_key] = [(float("nan"), rx)]
                    elif my_key == KEY.ODS_PERIOD_TX_BEAM:
                        beams = self.get_beam_info_kernel(target_mac)
                        if not beams:
                            continue
                        tx, __rx = beams[-1]
                        myinfo[node_l][my_key] = [(float("nan"), tx)]
        return myinfo

    def get_topology(self, filepath, to_mongo_db=False):
        """
        @param filepath: topology file path
                         if set None, will try to find current
                         topology file in use on the remote controller
        """
        self.logger.info("Getting Topology from E2E CLI")

        # load the topology file from local file path if path exists
        if filepath and os.path.isfile(filepath):
            self.load_topology_from_local_path(filepath)
        else:
            self.logger.note(
                "File path is {0}, which does not exist. Don't panic. ".format(filepath)
                + "Fetching Topology file directly from Controller."
            )
            # load the topology file from remote file path
            if not self.load_topology_from_remote_path(args=self.params):
                return ""

        # dump fetched topology to disk
        topo_fp = "{0}/topology_{1}.json".format(
            self.params["output_folder"], self.params["network_name"]
        )
        self.topology.dump_topology(topo_fp, to_mongo_db=to_mongo_db)
        return topo_fp

    def tg_enable_logging(self, logger, args=None):
        """
        use tg cli to enable logging
        """
        if args.get("custom", {}).get("rootfs", False):
            command = "chroot /opt/{0}/rootfs ".format(
                args["network_name"]
            ) + "{0} fw network set_log_config --level debug".format(
                self.params.get("controller", {}).get("tg_cli", "tg")
            )
        else:
            command = "{0} fw network set_log_config --level debug".format(
                self.params.get("controller", {}).get("tg_cli", "tg")
            )
        logger.info("running cli: {0}".format(command))
        return not (self.write(command)[0] == "err")

    def tg_disable_logging(self, logger, args=None):
        """
        use tg cli to enable logging
        """
        if args.get("custom", {}).get("rootfs", False):
            command = "chroot /opt/{0}/rootfs ".format(
                args["network_name"]
            ) + "{0} fw network set_log_config --level info".format(
                self.params.get("controller", {}).get("tg_cli", "tg")
            )
        else:
            command = "{0} fw network set_log_config --level info".format(
                self.params.get("controller", {}).get("tg_cli", "tg")
            )
        logger.info("running cli: {0}".format(command))
        return not (self.write(command)[0] == "err")

    """
    tg scan for im measurements
    """

    def tg_scan_reset(self):
        """
        tg scan reset: clean up the scan result
        """
        self.logger.info("Running tg scan reset.")
        resp = self.write(
            "{0} scan reset".format(
                self.params.get("controller", {}).get("tg_cli", "tg")
            )
        )
        if resp[0] == "err" or len(resp) is 1:
            return False
        self.logger.info(resp[1])
        return True

    def tg_scan_waiting(self, check_freq=110):
        """
        use `tg scan status --concise` to check if the scan is finished
        currently this is blocking waiting

        @param check_freq: default check frequency is 110s
                          must be >> scan schedule (30s)
        """
        prev_status_line = None
        prev_im_scan_count = None
        counter = 0
        # scan: when PBF/RTCAL/CBF/VBS, manual scan takes very long period
        # TODO scan: shall we use 2 hours as the maximum waiting period
        while 1:
            if not prev_status_line:
                prev_status_line, prev_im_scan_count = self._tg_scan_status_last()
                if not prev_status_line:
                    self.logger.error("tg scan error has happened!")
                    break
            time.sleep(check_freq)
            (tmp_line, tmp_count) = self._tg_scan_status_last()
            self.logger.info(
                "Slept {0}s, waiting for scan to finish. ".format(check_freq)
                + "total IM scan = {0}, current status = {1}".format(
                    tmp_count, tmp_line
                )
            )
            # break when we see the same status update - estimate it is done
            if prev_status_line == tmp_line and prev_im_scan_count == tmp_count:
                break
            prev_status_line = tmp_line
            prev_im_scan_count = tmp_count
            counter += 1
        return counter

    def _tg_scan_status_last(self, target_type="IM"):
        """
        get the last scan info from `tg scan status --concise`
        """
        sort_tail = "sort -k 11 | sort -k 17 -n | tail -n 1"
        self.logger.info("Checking the last scan info.")
        last_scan_resp = self.write(
            "{0} scan status --concise | grep {1} | {2}".format(
                self.params.get("controller", {}).get("tg_cli", "tg"),
                target_type,
                sort_tail,
            )
        )
        scan_sum = self.write(
            "{0} scan status --concise | grep {1} | sort -k 14 -n | wc -l".format(
                self.params.get("controller", {}).get("tg_cli", "tg"), target_type
            )
        )
        if last_scan_resp[0] == "err" or scan_sum[0] == "err":
            return (None, None)
        self.logger.debug("last_scan_resp = {0}".format(last_scan_resp))
        self.logger.debug("\n")
        self.logger.debug("scan_sum = {0}".format(scan_sum))
        if len(last_scan_resp) > 1 and len(scan_sum) > 1:
            return (last_scan_resp[1], scan_sum[1])
        return ("Just started; maybe wait a bit more time for the first feedback", None)

    def tg_scan_status(
        self,
        remote_folder_path="/tmp",
        local_file_path=None,
        output_folder=None,
        suffix=None,
        to_mongo_db=False,
    ):
        """
        tg scan status --format json > path_to_file

        @param remote_folder_path: remote folder path
        @param local_file_path: Unused in this function. Used in LOCAL_TG
        @param suffix: customized file name tag for the output
        """
        self.logger.info("Running tg scan status.")
        remote_fp = (
            "{0}/raw_scan.json".format(remote_folder_path)
            if not suffix
            else "{0}/raw_scan_{1}.json".format(remote_folder_path, suffix)
        )
        # to prevent timeout, try 20min waiting time
        resp = self.write(
            "{0} scan status --format json > {1} 2>/dev/null".format(
                self.params.get("controller", {}).get("tg_cli", "tg"), remote_fp
            ),
            timeout=1200,
        )
        if resp[0] == "err" or not self.isfile(remote_fp):
            return None
        # just return the remote file path and do stuff later
        return remote_fp

    def _tg_scan_start_validate(self, resp, im, tx_node, rx_node, scan_mode, delay):
        """
        We extract this out of tg_scan_start. It validates
        the start report and redo the test if failed due to
        unknown rx node.
        """
        for line in resp[1:]:
            if "succeeded" in line:
                return "ok"
            elif "Unknown" in line:
                self.logger.error(line)
                if "tx node" in line:
                    return "tx_err"
                try:
                    rx_node.remove(line.rstrip().split()[-1])
                    return self.tg_scan_start(
                        im=im,
                        tx_node=tx_node,
                        rx_node=rx_node,
                        scan_mode=scan_mode,
                        delay=delay,
                    )
                except BaseException as ex:
                    self.logger.error(ex)
        return "err"

    def tg_scan_start(
        self,
        im=True,
        tx_node=None,
        rx_node=None,
        scan_mode=KEY.SCAN_MODE_FINE,
        delay=1,
        tx_power=None,
    ):
        """
        tg scan start pbf/im

        @param im: if True, set as im scan; otherwise pbf scan
        @param tx_node: set to run on one node as tx (initiator)
        @param rx_node: set to run on one or multiple nodes as rx (responder)
        @param scan_mode: default fine, can do coarse and relative also;
            selective not implemented/supported for now
        @param delay: the wait time to do measurements; by default 1
        @param tx_power: tx power index used during the scan, default None (28)
        @return err/tx_err/ok
        """
        self.logger.info("Running tg scan start.")
        # sanity check
        if (tx_node is None) != (rx_node is None):
            self.logger.error("Specify at least one tx and rx, or both None")
            return "err"
        if isinstance(tx_node, list):
            self.logger.error(
                "Only single tx is supported in tg cli (subject to change)"
            )
            return "err"
        # cmd initialization
        cmd = "{0} scan start ".format(
            self.params.get("controller", {}).get("tg_cli", "tg")
        )
        if im is True:
            cmd += "-t im "
            if scan_mode and scan_mode == KEY.SCAN_MODE_RELATIVE:
                cmd += "-m relative "
        else:
            cmd += "-t pbf "
            if scan_mode == KEY.SCAN_MODE_FINE:
                cmd += "-m fine "
            elif scan_mode == KEY.SCAN_MODE_COARSE:
                cmd += "-m coarse "
            elif scan_mode == KEY.SCAN_MODE_RELATIVE:
                cmd += "-m relative "
            elif scan_mode == KEY.SCAN_MODE_SELECTIVE:
                self.logger.note("TODO: not sure what selective means, unimplemented")
                return "err"
        if tx_node:
            cmd += "-d {0} ".format(delay)
            cmd += "--tx {0} ".format(tx_node)
            if not isinstance(rx_node, list):
                rx_node = [rx_node]
            for item in rx_node:
                cmd += '--rx "{0}" '.format(item)
        if tx_power:
            resp = self.write("{0}--tx_power_index {1}".format(cmd, tx_power))
            if len(resp) > 1 and "no such option" in resp[1]:
                self.logger.error("tx_power_index not supported here")
                self.logger.error("will retry max power")
            else:
                return self._tg_scan_start_validate(
                    resp, im, tx_node, rx_node, scan_mode, delay
                )
        resp = self.write(cmd)
        return self._tg_scan_start_validate(
            resp, im, tx_node, rx_node, scan_mode, delay
        )

    """
    tg firmware commands
    (this only works for >M21)
    """

    def tg_set_fwcfg_link_param(self, param_name, tx_node, rx_node, val):
        """
        set fw cfg link params in run-time
        currently supports:
            txPower  txBeamIndex  rxBeamIndex
            maxTxPower  minTxPower  maxAgcTrackingEnabled
            linkAgc  crsScale  mcs  measSlotEnable
            measSlotOffset  laMaxMcs  laMinMcs  tpcEnable
        """
        resp = self.write(
            "{0} fw node -n {1} set_fw_params {4} {2} -r {3}".format(
                self.params.get("controller", {}).get("tg_cli", "tg"),
                tx_node,
                val,
                rx_node,
                param_name,
            )
        )
        if not resp[0] == "err":
            for each in resp[1:]:
                if "succeeded" in each:
                    return True
        self.logger.debug(resp)
        return False

    def tg_get_fwcfg_link_param(self, param_name, tx_node, rx_node):
        """
        get fwcfg link params in run-time
        """
        resp = self.write(
            "{0} fw node -n {1} get_fw_params linkParams -r {2} | grep {3}".format(
                self.params.get("controller", {}).get("tg_cli", "tg"),
                tx_node,
                rx_node,
                param_name,
            )
        )
        self.logger.debug(resp)
        if not resp[0] == "err":
            try:
                return int(resp[1].split("=")[1])
            except BaseException:
                self.logger.debug("cannot get current {0}".format(param_name))
        return None

    def tg_set_fwcfg_txpower(self, tx_node, rx_node, val):
        """
        set default tx power (no matter tpc is enabled or not)
        """
        return self.tg_set_fwcfg_link_param("txPower", tx_node, rx_node, val)

    def tg_set_fwcfg_tpcenable(self, tx_node, rx_node, val):
        """
        enable tpc or disable it
        """
        return self.tg_set_fwcfg_link_param("tpcEnable", tx_node, rx_node, val)

    def tg_get_fwcfg_tx_power_tpc(self, tx_node, rx_node):
        """
        get current default tx power and tpc status for node
        """
        return (
            self.tg_get_fwcfg_link_param("txPower", tx_node, rx_node),
            self.tg_get_fwcfg_link_param("tpcEnable", tx_node, rx_node),
        )

    def tg_fix_fwcfg_tx_power(self, tx_node, rx_node, power):
        """
        fix the fw cfg tx power and disable tpc
        @return previous setup
        """
        # get original stats
        ori_tx_power, ori_tpc_status = self.tg_get_fwcfg_tx_power_tpc(tx_node, rx_node)

        # update tpcEnable if ori_tpc_status is non-zero
        if ori_tpc_status and not self.tg_set_fwcfg_tpcenable(tx_node, rx_node, 0):
            return False

        # update txPower if required
        if ori_tx_power != power and not self.tg_set_fwcfg_txpower(
            tx_node, rx_node, power
        ):
            return False

        return True
