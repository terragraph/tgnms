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
    import modules.keywords as KEY
    from modules.util_data_loader import Data
    from modules.util_geojson import get_geojson
    from modules.util_math import sinr_to_mcs_thrpt
    from modules.addon_misc import dump_result, epoch2readable, update_nested_dict
except BaseException:
    raise


def _overwrite_configs(config_args, args):
    """
    Don't call this function directly
    It handles arguments that overwrite the config file
    """
    # store original `output_folder` as `input_folder`
    config_args["input_folder"] = config_args.get("output_folder", "/tmp/")
    if args["ow_output_folder"] is not None:
        config_args["output_folder"] = args["ow_output_folder"]
    if args["ow_topology_fp"] is not None:
        config_args["controller"]["topology_local_fp"] = args["ow_topology_fp"]
    if args["ow_nodatabase"] is not None:
        config_args["write_analysis_to_mongo_db"] = False
    if args.get("ow_predict", None) is not None:
        config_args["predict_performance_from_topology"] = True
        if args.get("ow_predict_box", False):
            config_args["predict_performance_from_topology_w_box"] = True


def get_configs(args):
    """
    load config file if specified,
    and then overwrite the options if specified in arguments
    """
    # load base config file (example)
    try:
        config_args = json.load(
            open(
                "{0}/config/nano_base.json".format(
                    os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
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
    _overwrite_configs(config_args, args)
    return config_args


def finalize_param(args):
    """
    finalize parameter and store it to the folder
    """
    # get the end time
    epoch = int(time.time() * 1000)
    args["mapgen_finish_time_epoch_ms"] = epoch
    args["mapgen_finish_time_readable"] = epoch2readable(epoch / 1000)
    ofp = "{0}/self_test.conf".format(args["output_folder"])
    try:
        with open(ofp, "w") as of:
            json.dump(args, of, indent=2)
    except BaseException as ex:
        print(ex)
        ofp = ""
    return ofp


def initialize_param(args):
    """
    initialize parameters
    """
    epoch = int(time.time() * 1000)
    args["mapgen_start_time_epoch_ms"] = epoch
    args["mapgen_start_time_readable"] = epoch2readable(epoch / 1000)


def generate_for_interference(args, myData):
    """
    generate visualization-related content for interference
    """
    # check if the field exists before proceed
    if not args.get("analysis", None):
        return
    myData.logger.note("Generating geoJSON for interference..")
    for power in [
        "idle",
        "max",
        "active",
        "idle_nopolarity",
        "max_nopolarity",
        "active_nopolarity",
    ]:
        key = "interference_{0}_fp".format(power)
        if key not in args["analysis"] or not os.path.isfile(args["analysis"][key]):
            continue
        # load interference analysis file
        result = json.load(open(args["analysis"][key]))
        # get geoJSON
        geoJSON = get_geojson("interference", result, myData.topology, myData.logger)
        # dump geoJSON to folder
        out_fp_no_suffix = "{0}/geojson_{1}".format(
            args["output_folder"], key.replace("_fp", "")
        )
        dump_result(
            out_fp_no_suffix,
            geoJSON,
            myData.logger,
            use_JSON=True,
            to_mongo_db=args["write_analysis_to_mongo_db"],
        )


def generate_for_multihop(args, myData):
    """
    generate visualization-related content for multihop
    """
    # check if the field exists before proceed
    if not args.get("analysis", None):
        return
    myData.logger.note("Generating geoJSON for multihop..")
    key = "multihop_fp"
    test_type_key = "multihop"
    if key not in args["analysis"] or not os.path.isfile(args["analysis"][key]):
        return
    # load multihop ananlysis files
    result = json.load(open(args["analysis"][key]))
    # get traffic type for multihop test
    try:
        multihop_args = {}
        # assume only one traffic type in a multihop test
        multihop_args["traffic_type"] = args["tests"]["iperf_multihop"]["type"][0]
        multihop_args["target_rate"] = args["tests"]["iperf_multihop"]["rate"]
        multihop_args["direction"] = args["tests"]["iperf_multihop"]["direction"]
        multihop_args["congest_ctrl_algo"] = args["tests"]["iperf_multihop"][
            "congest_ctrl_algo"
        ]
    except KeyError as e:
        myData.logger.error("Keyerror {0}".format(e))
        return
    # get geoJSON
    geoJson = get_geojson(
        test_type_key, result, myData.topology, myData.logger, multihop_args
    )
    if multihop_args["traffic_type"] == "tcp":
        myData.logger.info(
            "Generate multihop tcp geoJson, test_name = {0}, network_name = {1}".format(
                test_type_key, args["network_name"]
            )
            + ", congest_ctrl_algo = {0}".format(multihop_args["congest_ctrl_algo"])
        )
        ## TCP congestion control related geoJson collection name
        out_fp_no_suffix = "{0}/geojson_{1}_{2}_{3}".format(
            args["output_folder"],
            test_type_key,
            multihop_args["traffic_type"],
            multihop_args["congest_ctrl_algo"],
        )
    else:
        out_fp_no_suffix = "{0}/geojson_{1}_{2}".format(
            args["output_folder"], test_type_key, multihop_args["traffic_type"]
        )
    dump_result(
        out_fp_no_suffix,
        geoJson,
        myData.logger,
        use_JSON=True,
        to_mongo_db=args["write_analysis_to_mongo_db"],
    )


def generate_for_connectivity(args, myData):
    """
    generate visualization-related content for connectivity graph
    """
    # check if the field exists before proceed
    if not args.get("analysis", None):
        return
    myData.logger.note("Generating geoJSON for connectivity..")
    key = "connectivity_fp"
    if key not in args["analysis"] or not os.path.isfile(args["analysis"][key]):
        return
    # load interference analysis file
    result = json.load(open(args["analysis"][key]))
    # get geoJSON
    geoJSON = get_geojson("connectivity", result, myData.topology, myData.logger)
    # dump geoJSON to folder
    out_fp_no_suffix = "{0}/geojson_{1}_targetSNR_{2}dB".format(
        args["output_folder"],
        key.replace("_fp", ""),
        args["analysis"]["connectivity_target_snr"],
    )
    dump_result(
        out_fp_no_suffix,
        geoJSON,
        myData.logger,
        use_JSON=True,
        to_mongo_db=args["write_analysis_to_mongo_db"],
    )


def generate_for_topology(args, myData):
    """
    generate visualization-related content to view topology
    """
    myData.logger.note("Generating geoJSON for topology..")
    # get geoJSON
    geoJSONs = get_geojson("topology", {}, myData.topology, myData.logger)
    # dump geoJSON to folder
    for key in ["site", "node", "link"]:
        geoJSON = geoJSONs.get(key, {})
        myData.logger.info("geoJSON ready for {0}".format(key))
        if not geoJSON:
            continue
        out_fp_no_suffix = "{0}/geojson_topology_{1}".format(args["output_folder"], key)
        dump_result(
            out_fp_no_suffix,
            geoJSON,
            myData.logger,
            use_JSON=True,
            to_mongo_db=args["write_analysis_to_mongo_db"],
        )


def generate_for_iperf_p2p(args, myData):
    """
    generate visualization-related content to view link healthiness
    """
    # check if the field exists before proceed
    if not args.get("analysis", None):
        return
    myData.logger.note("Generating geoJSON for iperf_p2p..")
    key = "iperf_p2p_fp"
    if not os.path.isfile(args["analysis"].get(key, "")):
        return
    result = json.load(open(args["analysis"][key]))
    # update with box alignment if it exists
    boxresult = {}
    if os.path.isfile(args["analysis"].get("box_alignment_fp", "")):
        boxresult = json.load(open(args["analysis"]["box_alignment_fp"]))
    # enable "weather_iperf_p2p" in fieldname for new collections in MongoDB
    # 1. args["name"] is network/test name in the form of
    #   "network_test" - "network_iperf-p2p"
    # 2. args["network_name"] is only the network name in the form of "network"
    iperf_test_name = args["name"]
    # to obtain test_type: "network_iperf-p2p" -> "iperf_p2p"
    test_type = iperf_test_name.replace("-", "_").replace(
        args["network_name"] + "_", ""
    )
    myData.logger.debug(
        "Generate iperf geoJson, iperf_test_name = {0}, network_name = {1}".format(
            args["name"], args["network_name"]
        )
        + ", test_type = {0}".format(test_type)
    )
    # get geoJSON for different traffic types
    for method in result:
        update_nested_dict(result[method], boxresult)
        # test_type_key is "iperf_p2p"
        test_type_key = key.replace("_fp", "")
        geoJSON = get_geojson(
            "{0}_{1}".format(test_type_key, method),
            result[method],
            myData.topology,
            myData.logger,
        )
        # overwrite when test_type is "weather_iperf_p2p" instead of "iperf_p2p"
        #   for weather_iperf_p2p to dump to correct MongoDB collection
        if test_type_key in test_type:
            test_type_key = test_type
        # dump geoJSON to folder
        out_fp_no_suffix = "{0}/geojson_{1}_{2}".format(
            args["output_folder"], test_type_key, method
        )
        dump_result(
            out_fp_no_suffix,
            geoJSON,
            myData.logger,
            use_JSON=True,
            to_mongo_db=args["write_analysis_to_mongo_db"],
        )


def generate_for_overview(args, myData):
    """
    generate geoJSON for overview
    """
    overview_snapshot = "{0}/{1}.json".format(
        args.get("input_folder", "/tmp"), KEY.DB_OVERVIEW
    )
    overview_30day = "{0}/{1}_30.json".format(
        args.get("input_folder", "/tmp"), KEY.DB_OVERVIEW_DAYS
    )
    if not (os.path.isfile(overview_snapshot) and os.path.isfile(overview_30day)):
        return
    myData.logger.note("Generating geoJSON for overview..")
    # load overviews
    snapshot = json.load(open(overview_snapshot, "r"))
    daysum = json.load(open(overview_30day, "r"))
    # get geoJSON
    geoJSON = get_geojson(
        "overview", (snapshot, daysum), myData.topology, myData.logger
    )
    # dump geoJSON to folder
    out_fp_no_suffix = "{0}/geojson_{1}".format(args["output_folder"], KEY.DB_OVERVIEW)
    dump_result(
        out_fp_no_suffix,
        geoJSON,
        myData.logger,
        use_JSON=True,
        to_mongo_db=args["write_analysis_to_mongo_db"],
    )


def do_prediction(args, myData):
    """
    here we take topology (myData.topology) and perform prediction on tpc
    and further predict potential performance of the links
    finally we set myData with predicted topology_extra.json
    """
    try:
        from modules.util_interference import Interfer
    except BaseException:
        myData.logger.error("cannot import interfer module for prediction")
        return
    # predict power based on interference
    myInterference = Interfer(
        myData.topology, loggerTag="Interference", logPathDir=args["output_folder"]
    )
    myInterference.get_interference_from_predicts(
        3,  # number of iterations, use 3 by default
        useBoxModel=args.get("predict_performance_from_topology_w_box", False),
    )
    # format into topology_extra and write out
    topology_extra = {}
    # output estimated MCS values
    loggedMCSdist = {}
    # output estimated SINR values
    loggedSINRdist = {}
    for txNode in myData.topology.get_all_nodes(isConnected=True):
        rxNodes = myData.topology.get_linked_sector(txNode)
        # predicts format [txPowerDB, txPowerIdx, sinr, rssi]
        predicts = myInterference.estimated_pwr.get(txNode, [])
        if txNode not in topology_extra:
            topology_extra[txNode] = {}
            # output estimated MCS values
            loggedMCSdist[txNode] = {}
            # output estimated SINR values
            loggedSINRdist[txNode] = {}
        estTxPowerIdx = float("nan")
        estSINR = float("nan")
        if predicts:
            estTxPowerIdx = predicts[1]
            estSINR = predicts[2]
            estRSSI = predicts[3]
            estMCS, estThroughput = sinr_to_mcs_thrpt(estSINR)
        for rxNode in rxNodes:
            if rxNode not in topology_extra[txNode]:
                topology_extra[txNode][rxNode] = {}
            tmpHolder = topology_extra[txNode][rxNode]
            tmpHolder["{0}.{1}".format(KEY.ODS_PHY_DATA_PRE, KEY.ODS_SNR)] = estSINR
            tmpHolder["{0}.{1}".format(KEY.ODS_PHY_DATA_PRE, KEY.ODS_RSSI)] = estRSSI
            tmpHolder[KEY.ODS_PERIOD_TX_BEAM] = 0
            tmpHolder[KEY.ODS_PERIOD_RX_BEAM] = 0
            tmpHolder[KEY.ODS_STA_TX_PWR] = estTxPowerIdx
            tmpHolder["{0}.{1}".format(KEY.ODS_PHY_DATA_PRE, KEY.ODS_RX_MCS)] = estMCS
            tmpHolder[KEY.IPERF_DETAILS + "_est"] = estThroughput
            myData.logger.info("MCS for {0}->{1} is {2}".format(txNode, rxNode, estMCS))
            # output estimated MCS values
            loggedMCSdist[txNode][rxNode] = estMCS
            myData.logger.info(
                "SINR for {0}->{1} is {2}".format(txNode, rxNode, estSINR)
            )
            # output estimated SINR values
            loggedSINRdist[txNode][rxNode] = estSINR
    # output estimated MCS values
    myData.logger.debug(
        "Estimated MCS Distribution profile = {0}".format(loggedMCSdist)
    )
    out_fp_no_suffix1 = "{0}/MCSdist_est".format(args["output_folder"])
    dump_result(
        out_fp_no_suffix1,
        loggedMCSdist,
        myData.logger,
        use_JSON=True,
        to_mongo_db=False,
    )
    # output estimated SINR values
    myData.logger.debug(
        "Estimated SINR Distribution profile = {0}".format(loggedSINRdist)
    )
    out_fp_no_suffix2 = "{0}/SINRdist_est".format(args["output_folder"])
    dump_result(
        out_fp_no_suffix2,
        loggedSINRdist,
        myData.logger,
        use_JSON=True,
        to_mongo_db=False,
    )
    # dump topology extra json to folder
    out_fp_no_suffix = "{0}/topology_extra_est".format(args["output_folder"])
    dump_result(
        out_fp_no_suffix,
        topology_extra,
        myData.logger,
        use_JSON=True,
        to_mongo_db=False,
    )
    myData.load_topology_extra(out_fp_no_suffix + ".json")


def do_geogen(args, myData):
    if myData is None:
        return
    # do prediction for topology first if requested
    if args.get("predict_performance_from_topology", False):
        do_prediction(args, myData)
    generate_for_topology(args, myData)
    generate_for_iperf_p2p(args, myData)
    generate_for_interference(args, myData)
    generate_for_multihop(args, myData)
    generate_for_connectivity(args, myData)
    generate_for_overview(args, myData)
    myData.logger.disable()
    myData = None


def load_data(args):
    """
    load necessary data for map generation
    """
    myData = Data(loggerTag="DATA_MapGen", logPathDir=args["output_folder"])
    # load topology
    if os.path.isfile(args["controller"]["topology_local_fp"]):
        myData.load_topology(args["controller"]["topology_local_fp"])
    else:
        myData.logger.error("Must have topology file to begin with!")
        sys.exit(-1)
    # load alignment
    if os.path.isfile(args["tests"]["alignment"]["fp"]):
        myData.load_topology_extra(args["tests"]["alignment"]["fp"])
    else:
        myData.logger.error("Shall have topology extra to have more info!")
    return myData


def geogen_wrapper(args):
    """
    end-to-end wrapper for map generator
    """
    # setup parameters
    initialize_param(args)
    # mkdir if it does not exist
    if not os.path.isdir(args["output_folder"]):
        try:
            os.makedirs(args["output_folder"])
        except BaseException:
            raise
    # generate geojson for all data and dump to database
    do_geogen(args, load_data(args))
    # finalize time and store it
    finalize_param(args)


def main():
    """
    Map Content Generator for Visualization
    """
    parser = argparse.ArgumentParser(description="Map Generator")
    parser.add_argument("name", help="network/test name")
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
    # the following arguments, if specified, will
    # overwrite the config file (if loaded)
    # only a limited number of things can be overwrited here
    parser.add_argument(
        "--outfolder",
        "-o",
        dest="ow_output_folder",
        action="store",
        default=None,
        help="output folder path for analysis results (overwrite configs)",
    )
    parser.add_argument(
        "--topology",
        "-tp",
        dest="ow_topology_fp",
        action="store",
        default=None,
        help="topology json path (overwrite configs)",
    )
    parser.add_argument(
        "--no-database",
        dest="ow_nodatabase",
        action="store_true",
        default=None,
        help="disable write to database function (overwrite configs)",
    )
    parser.add_argument(
        "--predict",
        dest="ow_predict",
        action="store_true",
        default=None,
        help="predict the performance from topology (overwrite configs)",
    )
    parser.add_argument(
        "--box-model",
        dest="ow_predict_box",
        action="store_true",
        default=None,
        help="if predict, whether use box model",
    )
    try:
        args = vars(parser.parse_args())
    except BaseException:
        sys.exit()
    geogen_wrapper(get_configs(args))


if __name__ == "__main__":
    main()
