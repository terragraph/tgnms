#!/usr/bin/env python3

from base import app, get_config_args
from modules.addon_misc import dump_result, load_result
from modules.util_local_tg import LOCAL_TG


def perform_topology_fetch(ptr, args, topo_update_interval=900):
    """
    perform periodic topology fetch and local storage
    @param ptr: state-machine state pointer
        - relative value w.r.t. app.config["time_gap"]
    @param topo_update_interval: topology update interval
        - default value is 15 mins (900 seconds)
    """
    if ptr is not None and isinstance(ptr, int):
        if not topo_update_interval % app.config["time_gap"] == 0:
            msg = "topo_update_interval must be divisible by time_gap"
            app.logger.error(
                msg
                + "ptr = {0}, not perform topology update, ".format(ptr)
                + "due to weird value in {0}".format(topo_update_interval)
            )
            return
        relative_time_elapsed = ptr % (topo_update_interval // app.config["time_gap"])
        if relative_time_elapsed == 0:
            topology = _get_current_topology(ptr, args)
            _update_targets_file(topology)
        else:
            msg = "not perform topology update"
            next_update_time = topo_update_interval // app.config["time_gap"]
            app.logger.debug(
                "ptr = {0}, relative_time_elapsed = {1}, ".format(
                    ptr, relative_time_elapsed
                )
                + "next_update_time = {0}, {1}".format(next_update_time, msg)
            )
    else:
        msg = "ptr is not integer, fail to obtain topology update"
        app.logger.error("ptr = {0}, {1}, ".format(ptr, msg))


def _get_current_topology(ptr, args):
    app.logger.info(
        "ptr = {0}, go ahead with topology update, ".format(ptr)
        + "output_folder = {0}".format(args["output_folder"])
    )
    # therefore, can not assign in args preparation _prepare_args_for_topology_fetch
    args["output_file_postfix"] = "{0}".format(args["name"])
    return _fetch_e2e_topology(args)


def _update_targets_file(topology):
    """
    update targets.json file which associates inband_ip instance with node_name as label
    targets.json file follows the following format:
    [
       {
           "targets": ["2001:470:f0:1134::1"],
           "labels": { "label":"11L266.CN" }
       },
       {
           "targets": ["2001:470:f0:1180::1"],
           "labels": { "label":"11L263.1" }
       }
    ]
    """
    if not topology:
        app.logger.error("Empty topology, can not update ip list")
        return
    node_ip_dict = topology.get_all_nodes_inband_ips(withMAC=True, isConnected=True)

    # load the local_node_ip_dict from local target file
    target_fp = app.config["target_folder"] + app.config["target_json_file_name"]
    local_target_array = load_result(target_fp, app.logger)
    if not local_target_array:
        # local_target_array is empty
        app.logger.error("Target file empty at {0}".format(target_fp))
        _create_local_target_file(node_ip_dict, target_fp)
        app.logger.note(
            "Created new {0} file with {1} entries".format(target_fp, len(node_ip_dict))
        )
        return

    app.logger.note(
        "Loaded {0} file to update the dict with node_name and ip_address".format(
            target_fp
        )
    )

    # fetch local_node_ip_dict from local_target_array
    local_node_ip_dict = _prepare_local_node_ip_dict(local_target_array)
    if not local_node_ip_dict:
        app.logger.error(
            "local_node_ip_dict is empty, local {0} file not follow format".format(
                target_fp
            )
        )
        return
    app.logger.debug(
        "Compare two node_ip dict. and update local_node_ip_dict, "
        + "current online node_ip_dict has size of {0}, ".format(len(node_ip_dict))
        + "and local_node_ip_dict has size of {0}".format(len(local_node_ip_dict))
    )
    # merge dicts: update local_node_ip_dict with node_ip_dict
    local_node_ip_dict_copy = local_node_ip_dict.copy()
    local_node_ip_dict_copy.update(node_ip_dict)

    # compare local_node_ip_dict_copy and local_node_ip_dict
    if not local_node_ip_dict_copy == local_node_ip_dict:
        # build target_array and update local targets.json
        _create_local_target_file(local_node_ip_dict_copy, target_fp)
    else:
        app.logger.debug(
            "local_node_ip_dict includes node_ip_dict, "
            + "no need to update local targets.json"
        )


def _fetch_e2e_topology(args):
    my_server = LOCAL_TG(
        args,
        loggerTag="topo_fetch",
        logPathDir=args["output_folder"],
        logFilePostfix=args["output_file_postfix"],
    )
    to_mongo_db = args.get("store_in_db", True)
    # obtain topology from E2E API call, store in MongoDB
    topo_fp = my_server.get_topology(to_mongo_db=to_mongo_db)
    topology = my_server.topology
    my_server.logger.disable()
    my_server = None
    if not topo_fp:
        app.logger.error("Failed to obtain topology from E2E API")
        return None
    app.logger.info("Succeeded to obtain topology from E2E API")
    return topology


def _prepare_local_node_ip_dict(local_target_array):
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
            app.logger.error(
                "In local_target_array, item {0} not follow pre-defined format".format(
                    item
                )
            )
    return local_node_ip_dict


def _create_local_target_file(node_ip_dict, target_fp):
    """
    create targets.json file follows the following format:
    [
       {
           "targets": ["2001:470:f0:1134::1"],
           "labels": { "label":"11L266.CN" }
       }
    ]
    """
    target_array = []
    try:
        for node_name in node_ip_dict:
            item_dict = {}
            item_dict["targets"] = []
            item_dict["targets"].append(node_ip_dict.get(node_name))
            item_dict["labels"] = {}
            item_dict["labels"]["label"] = node_name
            target_array.append(item_dict)
        dump_result(target_fp, target_array, app.logger, use_JSON=True)
        app.logger.debug(
            "Updated {0} file with {1} entries".format(target_fp, len(target_array))
        )
    except BaseException as ex:
        app.logger.error("Cannot create local target file due to {0}".format(ex))


def prepare_args_for_topology_fetch():
    output_folder = "{0}/topology_update/".format(app.config["tmp_folder"])
    config_file = "{0}/config/{1}.json".format(
        app.config["fp"], app.config["network_name"]
    )
    args = {
        "name": app.config["network_name"],
        "output_folder": output_folder,
        "store_in_db": True,
    }
    app.logger.debug(
        "Prepare args for topology fetch, config = {0}, output_folder = {1}".format(
            config_file, args["output_folder"]
        )
    )
    # get base config args + config file args + custom args
    return get_config_args(config_file=config_file, overwrite_args=args)
