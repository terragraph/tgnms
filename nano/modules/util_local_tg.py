#!/usr/bin/env python3

import json
import logging

# built-ins
import os
import subprocess
import time

# modules
import modules.keywords as KEY
from modules.addon_misc import dump_result, load_result
from modules.util_api import E2EAPI, WeatherAPI
from modules.util_logger import EmptyLogger
from modules.util_topology import Topology


class LOCAL_TG:
    """
    Local operations at the NANO VM to obtain TG topology related info
    and get/change TG operational status
    """

    def __init__(
        self,
        params,
        loggerTag="NANO",
        logPathDir=None,
        logFilePostfix=None,
        printout=True,
    ):
        """
        @param params: configuration parameters (json format)
        @param loggerTag: logger identifier
        @param logPathDir: path of where log stays
        @param printout: whether we print out the process, default True
        """
        if logPathDir is None:
            self.logger = EmptyLogger(loggerTag, printout=True)
        elif logPathDir and logFilePostfix is None:
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
        elif logPathDir and logFilePostfix:
            logpath_r = "{0}/".format(logPathDir)
            if not os.path.isdir(logpath_r):
                try:
                    os.makedirs(logpath_r)
                except BaseException:
                    logpath_r = logPathDir
            self.logger = EmptyLogger(
                loggerTag,
                logPath="{0}/{1}_{2}.log".format(logPathDir, loggerTag, logFilePostfix),
                printout=printout,
                printlevel=logging.INFO,
            )
        self.logPathDir = logPathDir
        self.logFilePostfix = logFilePostfix
        # store the parameters of the run in the object
        self.params = params
        # initialize a topology
        self.topology = Topology()
        # link fwParams info from E2E
        self.link_fw_params = {}
        # The token (used for retrieving scan data)
        self.start_token = None
        # the token at the end of the token range, if multiple scans were scheduled
        self.end_token = None
        # scan status of last token
        self.last_token_status = None
        # E2EAPI object
        self.e2e_api = E2EAPI(self.params, self.logger)
        # list of token numbers that have received responses
        self.got_responses = []
        # token number that E2E is currently serving
        self.current_token = None

    def get_e2e_attribute(self, attribute, **kwargs):
        # get attribute info from E2E
        try:
            return self.e2e_api.request(attribute=attribute, **kwargs)
        except Exception as exp:
            self.logger.error(
                "Error in fetching {0} information from E2E API: {1}".format(
                    attribute, exp
                )
            )
            return None

    def get_topology(self, filepath=None, to_mongo_db=False):
        """
        get topology from E2E API

        @param filepath: Unused in this function. Used in REMOTE_TG
        @param to_mongo_db (bool): dump topology to MongoDB
        """
        self.logger.info("Getting topology from E2E API.")

        # fetching topology from API service
        if not self._load_topology_from_e2e_api():
            self.logger.error("Failed to obtain topology from E2E API.")
            return ""

        # get polarity info from E2E and update topology file
        if not self._get_and_set_polarity_from_e2e_api():
            self.logger.error("Failed to get and set topology polarity from E2E API.")

        # get golay info from E2E and update topology file
        if not self._get_and_set_golay_from_e2e_api():
            self.logger.error("Failed to get and set topology golay from E2E API.")

        # dump fetched topology to disk
        if self.logFilePostfix is None:
            topo_fp = "{0}/topology_{1}.json".format(
                self.params["output_folder"], self.params["name"]
            )
        else:
            topo_fp = "{0}/topology_{1}.json".format(
                self.params["output_folder"], self.logFilePostfix
            )
        self.logger.debug("Dumping topology to local {}".format(topo_fp))
        self.topology.dump_topology(topo_fp, to_mongo_db=to_mongo_db)
        return topo_fp

    def _load_topology_from_e2e_api(self):
        """
        fetch the topology status from E2E API service
        """
        self.logger.info("Fetching Topology file from E2E API service.")
        # get topology info from E2E
        try:
            topology_info = self.get_e2e_attribute(attribute="topology")
            if self.topology.load_topology(topology_info):
                # update topology with meta information
                self.logger.info("Updating Topology with meta information.")
                return (
                    self._load_topology_meta(topology_info=topology_info)
                    and self._get_and_parse_ctrl_status_dump()
                )
            else:
                return False
        except Exception as exp:
            self.logger.debug("topology_info = {0}".format(topology_info))
            self.logger.error(
                "Error in fetching Topology from E2E API service: {0}".format(exp)
            )
            return False

    def _load_topology_meta(self, topology_info):
        """
        update Topology with meta information
        """
        if not topology_info:
            return False
        else:
            # update node info
            for node in topology_info["nodes"]:
                self.topology.add_node(node["name"])
                self.topology.set_mac(node["name"], node["mac_addr"])
                self.topology.set_pop(node["name"], node["pop_node"])
                self.topology.set_node_type(node["name"], node["node_type"])
                self.topology.set_status(node["name"], node["status"])
                self.topology.set_primary(node["name"], node["is_primary"])
                self.topology.set_site_name(node["name"], node["site_name"])

            # update link info
            for link in topology_info["links"]:
                if not self.topology.is_link(link["name"]):
                    self.logger.debug("add link {0}".format(link["name"]))
                    self.topology.link[link["name"]] = {"name": link["name"]}
                else:
                    self.logger.debug("update link {0}".format(link["name"]))
                self.topology.set_a_node(link["name"], link["a_node_name"])
                self.topology.set_z_node(link["name"], link["z_node_name"])
                self.topology.set_alive(link["name"], link["is_alive"])
                self.topology.set_link_type(link["name"], link["link_type"])
                self.topology.set_link_attempts(
                    link["name"], int(link["linkup_attempts"])
                )
                # add linked sectors only for wireless links
                if link["link_type"] == KEY.WIRELESS_LINK:
                    self.topology.set_linked_sector(
                        link["a_node_name"], link["z_node_name"]
                    )
                    self.topology.set_linked_sector(
                        link["z_node_name"], link["a_node_name"]
                    )

            # update site info
            for site in topology_info["sites"]:
                if not self.topology.is_site(site["name"]):
                    self.logger.debug("add site {0}".format(site["name"]))
                    self.topology.site[site["name"]] = {"name": site["name"]}
                    # add site do not care about accuracy
                    self.topology.set_location(
                        siteName=site["name"],
                        lat=site["location"]["latitude"],
                        lon=site["location"]["longitude"],
                        altitude=site["location"]["altitude"],
                        accuracy=site["location"]["accuracy"],
                    )
                elif site["location"]["accuracy"] > KEY.LOCATION_ACCURACY_THRESHOLD:
                    # update site if accuracy is less than 1k meter and >0
                    self.logger.debug("update site {0}".format(site["name"]))
                    self.topology.set_location(
                        siteName=site["name"],
                        lat=site["location"]["latitude"],
                        lon=site["location"]["longitude"],
                        altitude=site["location"]["altitude"],
                        accuracy=site["location"]["accuracy"],
                    )
            return True

    def _get_and_parse_ctrl_status_dump(self):
        """
        get inband ip and SW version of all ONLINE nodes
        from CtrlStatusDump using E2E API
        """
        self.logger.info(
            "Fetching inband ipv6 addresses and SW version "
            + "of all nodes from E2E API service."
        )
        ctrl_status_dump_info = self.get_e2e_attribute(
            attribute="ctrl_status_dump", statusReports="*"
        )
        # check if received info is not None
        if not ctrl_status_dump_info:
            return False
        # update inband ip and SW version of all online nodes
        for mac_addr, data in ctrl_status_dump_info["statusReports"].items():
            node_name = self.topology.get_node_from_mac(mac_addr)
            if (
                self.topology.is_node(node_name)
                and not self.topology.get_status(node_name) == "OFFLINE"
            ):
                # update inband ip of the nodes
                self.topology.set_ip(node_name, data["ipv6Address"], inband=True)

                # update SW version of the node
                self.topology.set_sw_version(node_name, data.get("version", None))

        return True

    def _get_and_set_polarity_from_e2e_api(self):
        """
        get polarity from E2E API and update topology
        """
        self.logger.info("Updating polarity values in Topology.")

        # get polarity info from E2E
        polarity_info_dict = self.get_e2e_attribute(
            attribute="polarity_override",
            configPaths=["radioParamsOverride.*.fwParams.polarity"],
        )
        # check validity of the response
        if not polarity_info_dict:
            self.logger.error("polarity_override from E2E API call is empty")
            return False

        self.logger.debug(
            "polarity_override, num of entries in polarity_info_dict is {0}".format(
                len(polarity_info_dict["config"])
            )
        )
        # update polarity in the topology
        try:
            for node_name, node_info in polarity_info_dict["config"].items():
                self.logger.debug(
                    "polarity_override, node {0} with polarity info {1}".format(
                        node_name, node_info
                    )
                )
                node_info = json.loads(node_info)
                # the inner for loop is O(1), as n = 1
                for _mac_addr, radio_params_override in node_info[
                    "radioParamsOverride"
                ].items():
                    self.topology.set_polarity(
                        nodeName=node_name,
                        polarity=radio_params_override["fwParams"]["polarity"],
                    )
                    self.logger.debug(
                        "set polarity {0} for {1}".format(
                            radio_params_override["fwParams"]["polarity"], node_name
                        )
                    )
            self.logger.info("Finished polarity parsing from E2E API visit")
            return True
        except KeyError as keyerr:
            self.logger.error("Error in parsing polarity: {}".format(keyerr))
            return False

    def _get_and_set_golay_from_e2e_api(self):
        """
        get golay from E2E API and update topology
        """
        self.logger.info("Updating golay values in Topology.")
        # get golay info from E2E
        golay_info_dict = self.get_e2e_attribute(
            attribute="golay_override",
            configPaths=[
                "linkParamsOverride.*.fwParams.txGolayIdx",
                "linkParamsOverride.*.fwParams.rxGolayIdx",
            ],
        )

        # check validity of the response
        if not golay_info_dict:
            self.logger.error("golay_override from E2E API call is empty")
            return False

        self.logger.debug(
            "golay_override, num of entries in golay_info_dict is {0}".format(
                len(golay_info_dict["config"])
            )
        )
        # update golay in the topology
        try:
            for node_name, node_info in golay_info_dict["config"].items():
                self.logger.debug(
                    "golay_override, node {0} with golay info {1}".format(
                        node_name, node_info
                    )
                )
                node_info = json.loads(node_info)
                # the inner for loop is O(1), as n = 1
                for _mac_addr, link_params_override in node_info[
                    "linkParamsOverride"
                ].items():
                    self.topology.set_golay(
                        nodeName=node_name,
                        tx_golay_idx=link_params_override["fwParams"]["txGolayIdx"],
                        rx_golay_idx=link_params_override["fwParams"]["rxGolayIdx"],
                    )
                    self.logger.debug(
                        "set tx/rx golay {0}/{1} for {2}".format(
                            link_params_override["fwParams"]["txGolayIdx"],
                            link_params_override["fwParams"]["rxGolayIdx"],
                            node_name,
                        )
                    )
            self.logger.info("Finished golay parsing from E2E API visit")
            return True
        except KeyError as keyerr:
            self.logger.error("Error in parsing golay: {0}".format(keyerr))
            self.logger.info("Using default golay values from Topology.")
            return False

    def fetch_weather_data(self):
        """
        get weather info from weather API
        """
        self.logger.info("Getting weather info from API.")
        try:
            weather_args = self.params.get("weather")
            weather_obj = WeatherAPI(weather_args)
            response = weather_obj.get_weather_data(logger=self.logger)
            return json.loads(response.text)
        except Exception as exp:
            self.logger.error(
                "Error in fetching weather information from weather API: {0}".format(
                    exp
                )
            )

    def update_weather_data_tracking_file(self, current_weather_data):
        """
        update local file which keeps track of weather data
        local file follows the following format:
        {
            "<station name>": [
                {
                    "bklight": 4,
                    "irr": null,
                    "mmmph": null,
                    "nws": "C",
                    "pwi": 10,
                    "rmmph": 0,
                    "smmph": null,
                    "sumrain": 10.85,
                    "sumsnow": 0,
                    "temp": 7.8,
                    "time": "Tue May 14 23:54:42 2019",
                    "ts": 1557870882,
                    "vis10m": 5981,
                    "vis1m": 5952
                }
            ]
        }
        """
        if self.logFilePostfix is None:
            weather_fp = "{0}/weather_{1}.json".format(
                self.params["output_folder"], self.params["name"]
            )
        else:
            weather_fp = "{0}/weather_{1}.json".format(
                self.params["output_folder"], self.logFilePostfix
            )
        try:
            # read previous stored weather data from local json
            local_weather_data = load_result(weather_fp, self.logger)
            weather_station = (
                self.params.get("weather", {}).get("station", {}).get("primary")
            )
            if not local_weather_data:
                # dump to local json file
                dump_result(
                    weather_fp, current_weather_data, logger=self.logger, use_JSON=True
                )
                self.logger.debug(
                    "{0} file is empty, created with {1} entries".format(
                        weather_fp, len(current_weather_data[weather_station])
                    )
                )
                return
            # current_weather_data and local_weather_data dicts
            # shall have the same key"
            if (
                weather_station in local_weather_data
                and weather_station in current_weather_data
            ):
                # append latest weather data to local_weather_data list
                latest_weather_info = current_weather_data.get(weather_station, [])[-1]
                local_weather_data.get(weather_station).append(latest_weather_info)
                self.logger.debug(
                    "Include recent weather data in local file at {0}".format(
                        weather_fp
                    )
                )
                # dump to local json file
                dump_result(weather_fp, local_weather_data, use_JSON=True)
                self.logger.debug(
                    "Updated {0} file with {1} entries".format(
                        weather_fp, len(local_weather_data[weather_station])
                    )
                )
            else:
                self.logger.error(
                    "Failed to update {0} file with recent weather data".format(
                        weather_fp
                    )
                )
        except BaseException as ex:
            self.logger.error(
                "Cannot update {0} file due to {1}".format(weather_fp, ex)
            )

    """
    tg firmware commands
    """

    def tg_set_fwcfg_link_param(self, param_name, node, value):
        """
        set fw cfg link and radio params in run-time
        currently supports:
            txPower  txBeamIndex  rxBeamIndex
            maxTxPower  minTxPower  maxAgcTrackingEnabled
            linkAgc  crsScale  mcs  measSlotEnable
            measSlotOffset  laMaxMcs  laMinMcs  tpcEnable
        """
        # set fw cfg link at run-time
        overrides_value = json.dumps(
            {node: {"linkParamsOverride": {"fwParams": {param_name: value}}}}
        )
        set_response = self.e2e_api.request(
            attribute="set_node_overrides", overrides=overrides_value
        )
        return set_response["success"] if set_response else False

    def tg_set_fwcfg_txpower(self, node, value):
        """
        set default tx power (no matter tpc is enabled or not)
        """
        return self.tg_set_fwcfg_link_param("txPower", node, value)

    def tg_set_fwcfg_tpcenable(self, node, value):
        """
        enable tpc or disable it
        """
        return self.tg_set_fwcfg_link_param("tpcEnable", node, value)

    def tg_get_fwcfg_link_param(self, param_name, node):
        """
        get fwcfg link params in run-time
        """
        if not self.link_fw_params:
            # get linkParamsBase
            link_params_base_fw_params = self.get_e2e_attribute(
                attribute="link_params_base_fw_params",
                configPaths=["linkParamsBase.fwParams.*"],
            )
            if link_params_base_fw_params:
                # update link_fw_params
                for radio, radio_info in link_params_base_fw_params["config"].items():
                    self.link_fw_params[radio] = json.loads(radio_info)[
                        "linkParamsBase"
                    ]

            # get linkParamsOverride
            link_overrides_fw_params = self.get_e2e_attribute(
                attribute="link_overrides_fw_params",
                configPaths=["linkParamsOverride.fwParams.*"],
            )
            # update link_fw_params with override values
            if link_overrides_fw_params:
                for radio, override_info in link_overrides_fw_params["config"].items():
                    if radio in self.link_fw_params:
                        override_params = json.loads(override_info)[
                            "linkParamsOverride"
                        ]["fwParams"]
                        self.link_fw_params[radio]["fwParams"].update(override_params)

        try:
            return self.link_fw_params[node]["fwParams"][param_name]
        except KeyError:
            return None

    def tg_get_fwcfg_tx_power_tpc(self, node):
        """
        get current default tx power and tpc status for node
        """
        return (
            self.tg_get_fwcfg_link_param("txPower", node),
            self.tg_get_fwcfg_link_param("tpcEnable", node),
        )

    def tg_fix_fwcfg_tx_power(self, tx_node, rx_node, power):
        """
        fix the firmware cfg tx power and disable tpc
        @return bool status
        """
        # get current stats
        current_tx_power, current_tpc_status = self.tg_get_fwcfg_tx_power_tpc(tx_node)

        # update tpcEnable if ori_tpc_status is non-zero
        if current_tpc_status and not self.tg_set_fwcfg_tpcenable(tx_node, 0):
            return False

        # update txPower if required
        if current_tx_power != power and not self.tg_set_fwcfg_txpower(tx_node, power):
            return False

        return True

    def restart_systemd_logind(self):
        """
        restart systemd-logind on NANO VM to fix slow login problem
        """
        self.logger.info("Restarting systemd-logind.")
        return self.write(command="sudo systemctl restart systemd-logind")

    def write(self, command):
        """
        execute command on NANO VM
        """
        self.logger.info("Executing the following command: {0}".format(command))
        return True if not subprocess.call(command, shell=True, timeout=300) else False

    """
    tg scan for im measurements
    """

    def tg_scan_reset(self):
        """
        tg scan reset: clean up the scan result
        """
        self.logger.info("Running tg scan reset.")
        reset_response = self.e2e_api.request(attribute="reset_scan")

        if reset_response:
            if reset_response.get("success"):
                self.logger.info("{0}".format(reset_response.get("message")))
                return True
            else:
                self.logger.error(
                    "Failed to reset scan: {0}".format(reset_response.get("message"))
                )
        else:
            self.logger.error("Unable to reset scan.")
        return False

    def tg_scan_waiting(self, check_freq=110):
        """
        use `tg scan status --concise` to check if the scan is finished
        currently this is blocking waiting

        @param check_freq: default check frequency is 110s
                          must be >> scan schedule (30s)
        """

        # get concise scan status
        self.last_token_status = self._tg_scan_status_last()

        while 1:
            if not self.last_token_status:
                self.logger.error("tg scan error has happened!")
                break

            if not self.start_token and not self.end_token:
                self.logger.note("NANO has not started any IM scan yet.")

            self.logger.note("Sleeping for {0}s.".format(check_freq))
            time.sleep(check_freq)
            self.logger.note("Done sleeping.")

            current_last_token_status = self._tg_scan_status_last()
            self.logger.note(
                "NANO start token: {0}; end token: {1}; "
                "E2E is currently serving token number: {2}".format(
                    self.start_token, self.end_token, self.current_token
                )
            )
            self.logger.info(
                "IM scan status before sleeping: {0}\n\n"
                "IM scan status after sleeping: {1}".format(
                    self.last_token_status, current_last_token_status
                )
            )

            # break if the last token has no responses and NANO has not started Scan
            if not current_last_token_status.get("responses") and not self.end_token:
                self.logger.note("No scan responses; scan not started from NANO VM.")
                break
            # break when we get response for the last token and it's same across sleep
            elif (
                current_last_token_status.get("responses")
                and self.last_token_status == current_last_token_status
            ):
                self.logger.note("Finished running IM scan.")
                break
            else:
                self.logger.note("IM scan running on the network has not finished yet.")
                self.last_token_status = current_last_token_status

    def _tg_scan_status_last(self):
        """
        Equivalent of: `tg scan status --concise`

        isConcise: If true, only metadata will be returned
            (without RSSI and SNR measurements)
        """
        self.logger.note("Checking the last scan info. isConcise=True")
        scan_status = self.e2e_api.request(
            attribute="scan_status",
            isConcise=True,
            tokenFrom=self.start_token,
            tokenTo=self.end_token,
        )
        try:
            if scan_status:
                for token, response in scan_status["scans"].items():
                    if response.get("responses"):
                        if int(token) not in self.got_responses:
                            self.got_responses.append(int(token))
                self.current_token = max(self.got_responses)

                # return scan status of the last token
                return (
                    scan_status["scans"][str(self.end_token)]
                    if self.end_token
                    else scan_status["scans"][
                        str(max(int(token) for token in scan_status["scans"]))
                    ]
                )
        except Exception as exp:
            self.logger.error("Unable to get last scan status: {0}".format(exp))
        return None

    def tg_scan_status(
        self,
        remote_folder_path=None,
        local_file_path="/tmp",
        output_folder=None,
        suffix=None,
        to_mongo_db=False,
    ):
        """
        Equivalent of: tg scan status --format json > path_to_file

        @param remote_folder_path: Unused in this function. Used in REMOTE_TG
        @param local_file_path: local folder path
        @param suffix: customized file name tag for the output

        isConcise: If true, only metadata will be returned
            (without RSSI and SNR measurements)
        """
        self.logger.note("Running tg scan status. isConcise=False")
        scan_status = self.e2e_api.request(
            attribute="scan_status",
            isConcise=False,
            tokenFrom=self.start_token,
            tokenTo=self.end_token,
        )

        if scan_status:
            local_fp = (
                "{0}/raw_scan".format(local_file_path)
                if not suffix
                else "{0}/raw_scan_{1}".format(local_file_path, suffix)
            )
            self.logger.info("Writing scan status to {0}".format(local_fp))
            try:
                # dump raw scan data into mongoDB with GridFS
                dump_result(
                    local_fp,
                    scan_status,
                    logger=self.logger,
                    use_JSON=True,
                    to_mongo_db=to_mongo_db,
                    output_folder=output_folder,
                    mongo_logger_name="MongoDB_Scan_Dump",
                    use_gridfs=True,
                )
                return local_fp
            except Exception as exp:
                self.logger.error(
                    "Cannot dump scan status to {0}, due to {1}".format(local_fp, exp)
                )
        self.logger.error("Failed to get scan status.")
        return None

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
        Equivalent of: tg scan start pbf/im

        @param im: if True, set as im scan; otherwise pbf scan
        @param tx_node: set to run on one node as tx (initiator).
            Only single tx is supported.
        @param rx_node: set to run on one or multiple nodes as rx (responder)
        @param scan_mode: default fine, can do coarse and relative also;
            selective not implemented/supported for now
        @param delay: the wait time to do measurements; by default 1
        @param tx_power: tx power index used during the scan, default None (28)
        @return err/ok
        """
        self.logger.note("Running tg scan start.")
        scan_type = KEY.SCAN_TYPE_IM if im else KEY.SCAN_TYPE_PBF
        start_time = int(time.time() + delay)

        if tx_node:
            if rx_node:
                if not isinstance(rx_node, list):
                    rx_node = [rx_node]
            else:
                rx_node = []

            # start scan with txNode and rxNodes
            start_scan = self.e2e_api.request(
                attribute="start_scan",
                scanType=scan_type,
                scanMode=scan_mode,
                startTime=start_time,
                txNode=tx_node,
                rxNodes=rx_node,
                txPwrIndex=tx_power,
            )
        else:
            # start scan without txNode and rxNodes (all nodes)
            start_scan = self.e2e_api.request(
                attribute="start_scan",
                scanType=scan_type,
                scanMode=scan_mode,
                startTime=start_time,
                txPwrIndex=tx_power,
            )

        # validate response
        if start_scan:
            if start_scan["success"]:
                self.logger.note("{0}".format(start_scan.get("message")))
                self.start_token = start_scan.get("token")
                self.end_token = start_scan.get("lastToken")
                self.logger.note(
                    "Start token: {0}; End token: {1}".format(
                        self.start_token, self.end_token
                    )
                )
                return "ok" if (self.start_token and self.end_token) else "err"
            else:
                self.logger.error("{0}".format(start_scan["message"]))
        self.logger.error("Failed to start scan.")
        return "err"

    """
    Temporarily enable (per-module) firmware logging levels before test
    and disable after test
    """

    def tg_enable_logging(self, *args, **kwargs):
        """
        Use E2E API to enable logging. Function doesn't need any input args.
        """
        self.logger.note(
            "Setting FW logging level of all nodes in the network to DEBUG."
        )
        enable_logging = self.e2e_api.request(
            attribute="set_fw_log_config", nodes=[], level=KEY.DEBUG
        )
        return True if enable_logging and enable_logging.get("success") else False

    def tg_disable_logging(self, *args, **kwargs):
        """
        Use E2E API to disable logging. Function doesn't need any input args.
        """
        self.logger.note(
            "Setting FW logging level of all nodes in the network to INFO."
        )
        disable_logging = self.e2e_api.request(
            attribute="set_fw_log_config", nodes=[], level=KEY.INFO
        )
        return True if disable_logging and disable_logging.get("success") else False
