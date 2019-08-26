#!/usr/bin/env python3

import argparse
import json

# built-ins
import os
import sys
import time


# modules
sys.path.append("../")
try:
    from modules.util_mongo_db import MongoDB
    from modules.util_data_loader import Data
    from modules.addon_misc import epoch2readable, update_nested_dict
    from modules.util_optimization import optimize
    from modules.analyzer_topology_opt import get_rx_importance
except BaseException:
    raise


def _overwrite_configs(config_args, args):
    """
    Don't call this function directly
    It handles arguments that overwrite the config file
    """
    if args.get("ow_target_sinr", None) is not None:
        config_args["optimization"]["polarity"]["default_target_sinr"] = args[
            "ow_target_sinr"
        ]
        config_args["optimization"]["pathreplace"]["default_target_sinr"] = args[
            "ow_target_sinr"
        ]
    if args.get("ow_target_sinr_fp", None) is not None:
        config_args["optimization"]["polarity"]["detailed_target_sinr_fp"] = args[
            "ow_target_sinr_fp"
        ]
        config_args["optimization"]["pathreplace"]["detailed_target_sinr_fp"] = args[
            "ow_target_sinr_fp"
        ]
    if args.get("ow_polarity", None) is not None:
        config_args["optimization"]["polarity"]["do_it"] = args["ow_polarity"]
    if args.get("ow_golay", None) is not None:
        config_args["optimization"]["golay"]["do_it"] = args["ow_golay"]
    if args.get("ow_pathreplace", None) is not None:
        config_args["optimization"]["pathreplace"]["do_it"] = args["ow_pathreplace"]
    if args.get("ow_max_count", None) is not None:
        config_args["optimization"]["pathreplace"]["max_num_links"] = args[
            "ow_max_count"
        ]
    if args.get("ow_debug", None) is not None:
        config_args["debug"] = args["ow_debug"]
    if args.get("ow_algorithm", None) is not None:
        config_args["optimization"]["polarity"]["method"] = args["ow_algorithm"]
        config_args["optimization"]["pathreplace"]["method"] = args["ow_algorithm"]
        if args["ow_algorithm"] == "montecarlo":
            config_args["optimization"]["polarity"]["iterations"] = 1000
            config_args["optimization"]["pathreplace"]["iterations"] = 1000


def initialize_param(args):
    """
    initialize parameters
    """
    epoch_time = int(time.time() * 1000)
    args["output_folder"] = "{0}/{1}_optimizer_{2}".format(
        args["outfolder"], args["name"], epoch_time
    )
    args["opt_start_time_epoch_ms"] = epoch_time
    args["opt_start_time_readable"] = epoch2readable(epoch_time / 1000)


def finalize_param(args):
    """
    finalize parameter and store it to the folder
    """
    # get the end time
    epoch = int(time.time() * 1000)
    args["opt_finish_time_epoch_ms"] = epoch
    args["opt_finish_time_readable"] = epoch2readable(epoch / 1000)
    ofp = "{0}/self_optimizer.conf".format(args["output_folder"])
    try:
        with open(ofp, "w") as of:
            json.dump(args, of, indent=2)
    except BaseException as ex:
        print(ex)
        ofp = ""
    return ofp


def optimization_actions(args, myData, overview, rxImportance=None):
    """
    perform optimization upon configs
    """
    fp_prefix = "{}/topology_{}".format(args["output_folder"], args["network_name"])
    myData.topology.dump_topology(fp_prefix + ".json")  # dump ori topology
    # optimize polarity first
    if args["optimization"]["polarity"]["do_it"]:
        topology, ests = optimize("polarity", args, myData, overview, rxImportance)
        if topology is None:
            return False
        fp_prefix += "_polarity"
        args["optimization"]["polarity"]["fp"] = fp_prefix + ".json"
        topology.dump_topology(args["optimization"]["polarity"]["fp"])
        myData.topology = topology  # assign new topology to proceed
    # optimize path substitutes then
    # (even if polarity optimization is not enabled,
    # we will still optimize polarity here due to the link change)
    if args["optimization"]["pathreplace"]["do_it"]:
        topology, ests = optimize("pathreplace", args, myData, overview, rxImportance)
        if topology is None:
            return False
        fp_prefix += "_pathreplace"
        args["optimization"]["pathreplace"]["fp"] = fp_prefix + ".json"
        topology.dump_topology(
            args["optimization"]["pathreplace"]["fp"],
            additional_stuff={"added_links": ests[4], "removed_links": ests[5]},
        )
        myData.topology = topology  # assign new topology to proceed
    # we assign golay in the last step
    # TODO: golay does not support topology changes for now
    if args["optimization"]["golay"]["do_it"]:
        topology, ests = optimize("golay", args, myData, overview, rxImportance)
        if topology is None:
            return False
        fp_prefix += "_golay"
        args["optimization"]["golay"]["fp"] = fp_prefix + ".json"
        topology.dump_topology(args["optimization"]["golay"]["fp"])
        myData.topology = topology  # assign new topology to proceed


def load_data(args):
    """
    load data function for necessary data
    if we do optimize by changing topology, then need ultimately
    raw imscan data is needed for accurate interference prediction
    for now we do not consider it, and leave it as future work
    @param args: dict of arguments
    @return (
        Data() object (if return None, it means failed),
        overview dict,
        sector importance dict (derived from link importance)
    )
    """
    # construct Data() object
    myData = Data(loggerTag="Optimizer", logPathDir=args["output_folder"])
    if not args.get("optimization", {}).get("data_source", "") == "database":
        myData.logger.error("`data_source` only supports database")
        return None, None, None
    # initialize mongodb
    mongodb = MongoDB(loggerTag="OptimizerDB", logPathDir=args["output_folder"])
    # load data from database
    tmps = []
    for fieldName, requiredFlag in [
        ("topology_{}".format(args["name"].lower()), True),
        ("analysis_interference_power_max_nopolarity", True),
        ("overview_labels", False or args["optimization"]["pathreplace"]["do_it"]),
        ("analysis_link_importance", False),
    ]:
        tmp = mongodb.read(fieldName, excludeFields=["test_type", "time"])
        if requiredFlag and not tmp:
            myData.logger.error("cannot find latest {}".format(fieldName))
            # disable mongo object
            mongodb.logger.disable()
            mongodb = None
            return None, None, None
        tmps.append(tmp)
    topo, inrAnalysis, overview, linkImportance = tmps
    # load topology
    myData.load_topology(topo)
    # load inr analysis
    myData.load_interference_analysis(inrAnalysis)
    # disable mongo object
    mongodb.logger.disable()
    mongodb = None
    # return
    return myData, overview, get_rx_importance(linkImportance, myData.topology)


def get_configs(args):
    """
    load config file if specified,
    and then overwrite the options if specified in arguments
    """
    # load base config file (example)
    try:
        config_args = json.load(
            open(
                args.get(
                    "config_base",
                    "{0}/config/nano_base.json".format(
                        os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
                    ),
                )
            )
        )
    except BaseException:
        print("Cannot load the base config file.. exiting..")
        sys.exit(-1)
    # load the config diffs
    if args["config"] is not None and os.path.isfile(args["config"]):
        try:
            diff_args = json.load(open(args["config"], "r"))
            update_nested_dict(config_args, diff_args)
        except BaseException:
            print("Cannot load {0} json file!".format(args["config"]))
    # overwrite from args
    config_args["outfolder"] = args["outfolder"]
    config_args["name"] = args["name"]
    if config_args["parallel_threads_limit"] is None:
        config_args["parallel_threads_limit"] = float("inf")
    _overwrite_configs(config_args, args)
    return config_args


def optimizer_wrapper(args):
    """
    end-to-end wrapper for the optimizer
    """
    # setup parameters
    initialize_param(args)
    # mkdir
    if not os.path.isdir(args["output_folder"]):
        try:
            os.makedirs(args["output_folder"])
        except BaseException:
            raise
    # load data
    myData, overview, rxImportance = load_data(args)
    # perform optimization
    optimization_actions(args, myData, overview, rxImportance)
    # disable myData logger also
    myData.logger.disable()
    # finalize
    finalize_param(args)
    return True


def main():
    """
    Optimization Tool
    """
    parser = argparse.ArgumentParser(description="Optimization Tool")
    parser.add_argument("name", help="network name")
    parser.add_argument(
        "--debug",
        dest="ow_debug",
        action="store_true",
        default=None,
        help="enable debugging mode (overwrite config)",
    )
    # config file for self test
    parser.add_argument(
        "--config",
        action="store",
        default=None,
        help=(
            "self test config file path"
            + "note that any additional args overwrite the config file"
        ),
    )
    parser.add_argument(
        "--outfolder",
        "-o",
        action="store",
        default="/tmp/",
        help="output folder path for optimization results, default is /tmp/",
    )
    # the following arguments, if specified, will
    # overwrite the config file (if loaded)
    # polarity related
    parser.add_argument(
        "--polarity",
        dest="ow_polarity",
        action="store_true",
        default=None,
        help="enable polarity optimization (overwrite config)",
    )
    parser.add_argument(
        "--no-polarity",
        dest="ow_polarity",
        action="store_false",
        default=None,
        help="disable polarity optimization (overwrite config)",
    )
    # path substitute related
    parser.add_argument(
        "--pathreplace",
        dest="ow_pathreplace",
        action="store_true",
        default=None,
        help="enable pathreplace optimization (overwrite config)",
    )
    parser.add_argument(
        "--no-pathreplace",
        dest="ow_pathreplace",
        action="store_false",
        default=None,
        help="disable pathreplace optimization (overwrite config)",
    )
    parser.add_argument(
        "--max-link-count",
        dest="ow_max_count",
        action="store",
        type=int,
        default=None,
        help=("specify max number of links trying to remove (overwrite config)"),
    )
    # shared between polarity and path substitution
    parser.add_argument(
        "--target-sinr",
        "-sinr",
        dest="ow_target_sinr",
        action="store",
        type=int,
        default=None,
        help=("specify minimal sinr (overwrite config)"),
    )
    parser.add_argument(
        "--target-sinr-fp",
        "-sinrfp",
        dest="ow_target_sinr_fp",
        action="store",
        default=None,
        help=("specify filepath for specific sinr setup (overwrite config)"),
    )
    parser.add_argument(
        "--algorithm",
        dest="ow_algorithm",
        action="store",
        default=None,
        help="define algorithm: greedy/montecarlo (overwrite config)",
    )
    # golay related
    parser.add_argument(
        "--golay",
        dest="ow_golay",
        action="store_true",
        default=None,
        help="enable golay optimization (overwrite config)",
    )
    parser.add_argument(
        "--no-golay",
        dest="ow_golay",
        action="store_false",
        default=None,
        help="disable golay optimization (overwrite config)",
    )
    try:
        args = vars(parser.parse_args())
    except BaseException:
        raise
    if not args["outfolder"] and not os.path.isdir(args["outfolder"]):
        print("Output folder does not exist!")
        sys.exit()
    optimizer_wrapper(get_configs(args))


if __name__ == "__main__":
    main()
