#!/usr/bin/env python3

import logging
import os
from typing import Dict, List, Optional, Union

from modules.addon_misc import dump_result, load_result
from modules.util_logger import EmptyLogger
from modules.util_topology import Topology


class UpdateTargetsFile:
    def __init__(
        self,
        config_args: Dict,
        topology: Optional[Topology] = None,
        logger_tag: str = "UpdateTargetsFile",
        log_path_dir: Optional[str] = None,
        log_file_postfix: Optional[str] = None,
        printout: bool = True,
    ) -> None:
        """
        @param config_args: configuration parameters
        @param topology: Topology object
        @param logger_tag: logger identifier
        @param log_path_dir: path of where log stays
        @param log_file_postfix: suffix for log file name
        @param printout: whether we print out the process, default True
        """
        # log_path_dir is None
        if not log_path_dir:
            self.logger = EmptyLogger(logger_tag, printout=True)
        # log_path_dir is not None, but log_file_postfix is None
        elif not log_file_postfix:
            logpath_r: str = f"{log_path_dir}/log/"
            if not os.path.isdir(logpath_r):
                try:
                    os.makedirs(logpath_r)
                except BaseException:
                    logpath_r = log_path_dir
            self.logger = EmptyLogger(
                logger_tag,
                logPath=f"{log_path_dir}/log/tg_{logger_tag}.log",
                printout=printout,
                printlevel=logging.INFO,
            )
        # both log_path_dir and log_file_postfix are not None
        else:
            if not os.path.isdir(log_path_dir):
                try:
                    os.makedirs(log_path_dir)
                except BaseException:
                    pass
            self.logger = EmptyLogger(
                logger_tag,
                logPath=f"{log_path_dir}/{logger_tag}_{log_file_postfix}.log",
                printout=printout,
                printlevel=logging.INFO,
            )

        self.config_args: Dict = config_args
        self.topology: Optional[Topology] = topology

    def update_targets_file(self) -> None:
        """
        Update targets.json file which associates inband_ip
        instance with node_name as label.

        targets.json file follows the following format:
        [
           {
               "targets": [ "<IP ADDRESS>" ],
               "labels": { "label": "<NODE NAME>" }
           },
           {
               "targets": [ "<IP ADDRESS>" ],
               "labels": { "label": "<NODE NAME>" }
           }
        ]
        """
        if not self.topology:
            self.logger.error("Empty topology, cannot update ip list")
            return

        node_ip_dict: Dict = self.topology.get_all_nodes_inband_ips(
            withMAC=True, isConnected=True
        )

        # load the local_node_ip_dict from local target file
        target_fp: str = (
            self.config_args.get("api_server_params", {}).get("tmp_folder", "")
            + self.config_args.get("targets", {}).get("folder_name", "")
            + self.config_args.get("targets", {}).get("json_file_name", "")
        )
        local_target_array: Dict = load_result(target_fp, self.logger)
        if not local_target_array:
            # local_target_array is empty
            self.logger.error(f"Target file empty at {target_fp}")
            self._create_local_target_file(node_ip_dict, target_fp)
            self.logger.note(
                f"Created new {target_fp} file with {len(node_ip_dict)} entries"
            )
            return

        self.logger.note(
            f"Loaded {target_fp} file to update the dict with node_name and ip_address"
        )

        # fetch local_node_ip_dict from local_target_array
        local_node_ip_dict: Dict = self._prepare_local_node_ip_dict(local_target_array)
        if not local_node_ip_dict:
            self.logger.error(
                f"local_node_ip_dict is empty, local {target_fp} file not follow format"
            )
            return
        self.logger.debug("Compare two node_ip dicts and update local_node_ip_dict.")
        self.logger.debug(f"Size of current online node_ip_dict: {len(node_ip_dict)}")
        self.logger.debug(f"Size of local_node_ip_dict: {len(local_node_ip_dict)}")

        # merge dicts: update local_node_ip_dict with node_ip_dict
        local_node_ip_dict_copy = local_node_ip_dict.copy()
        local_node_ip_dict_copy.update(node_ip_dict)

        # compare local_node_ip_dict_copy and local_node_ip_dict
        if not local_node_ip_dict_copy == local_node_ip_dict:
            # build target_array and update local targets.json
            self._create_local_target_file(local_node_ip_dict_copy, target_fp)
        else:
            self.logger.debug(
                "local_node_ip_dict includes node_ip_dict, "
                + "no need to update local targets.json"
            )

    def _prepare_local_node_ip_dict(self, local_target_array: Dict) -> Dict:
        """
        prepare local_node_ip dict from local_target_array
        """
        local_node_ip_dict = {}
        for item in local_target_array:
            if "targets" in item and "labels" in item:
                node_name = item.get("labels", {}).get("label")
                targets_list = item.get("targets")
                ip_address = targets_list[0]
                if node_name and ip_address:
                    local_node_ip_dict[node_name] = ip_address
            else:
                self.logger.error(
                    f"In local_target_array, item {item} not "
                    "follow pre-defined format"
                )
        return local_node_ip_dict

    def _create_local_target_file(self, node_ip_dict: Dict, target_fp: str) -> None:
        target_array = []
        try:
            for node_name in node_ip_dict:
                item_dict: Dict[str, Union[List, Dict]] = {
                    "targets": [node_ip_dict.get(node_name)],
                    "labels": {"label": node_name},
                }
                target_array.append(item_dict)
            dump_result(target_fp, target_array, self.logger, use_JSON=True)
            self.logger.debug(
                f"Updated {target_fp} file with {len(target_array)} entries"
            )
        except BaseException as ex:
            self.logger.error(f"Cannot create local target file due to {ex}")
