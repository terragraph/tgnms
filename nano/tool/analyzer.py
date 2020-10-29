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
    from modules.util_email import email_results
    from modules.util_data_loader import Data
    from modules.analyzer_health_check import analyze, print_analysis
    from modules.addon_parser_health_check import convert_to_html
    from modules.addon_misc import dump_result, epoch2readable
    from modules.addon_misc import get_emails, update_nested_dict
except BaseException:
    raise


def _overwrite_configs(config_args, args):
    """
    Don't call this function directly
    It handles arguments that overwrite the config file
    """
    if args["ow_output_folder"] is not None:
        config_args["output_folder"] = args["ow_output_folder"]
    if args["ow_topology_fp"] is not None:
        config_args["controller"]["topology_local_fp"] = args["ow_topology_fp"]
    if args["ow_emails"] is not None:
        config_args["global_email_lists"] = args["ow_emails"]
        config_args["enable_per_test_emailing"] = False


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
    config_args["do_single_analysis"] = args["do_single_analysis"]
    _overwrite_configs(config_args, args)
    return config_args


def finalize_param(args):
    """
    finalize parameter and store it to the folder
    """
    # get the end time
    epoch = int(time.time() * 1000)
    args["analysis_finish_time_epoch_ms"] = epoch
    args["analysis_finish_time_readable"] = epoch2readable(epoch / 1000)
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
    args["analysis_start_time_epoch_ms"] = epoch
    args["analysis_start_time_readable"] = epoch2readable(epoch / 1000)


def analysis_multihop(args, myData):
    """
    @param args: require email list, multihop file path, and name of network
    @param myData: Data() object
    """
    # check if email is enabled
    emails = get_emails(args, field="iperf_multihop")
    results = {}
    contents = ""
    server_ip = ""
    server_location = args["tests"]["iperf_multihop"]["server_location"]
    if server_location == "vm":
        server_ip = args["server"]["ip"]
    elif server_location == "pop":
        # topology object is only initialized via topology.load_topology(fp)
        # TODO: pop node needs to be the same one used to generate traffic
        # pick the pop node from the topology object - 1st element
        pop_nodes = myData.topology.get_pop_nodes()
        if len(pop_nodes) > 0:
            server_ip = myData.topology.get_ip(pop_nodes[0])
            myData.logger.info("pop node is {}".format(pop_nodes[0]))
        else:
            myData.logger.error("pop_nodes list is empty!")
            raise BaseException
    else:
        myData.logger(
            "In multihop analysis, server_location {} is unknown!".format(
                server_location
            )
        )
    # perform analysis
    for traffic in args["tests"]["iperf_multihop"]["type"]:
        multihopResult, linkImportanceResult = analyze(
            "iperf_multihop",
            myData,
            misc=(traffic, args["tests"]["iperf_multihop"]["rate"], server_ip),
        )
        results[traffic] = multihopResult
        # generate email contents
        if emails:
            content = convert_to_html(
                "iperf_multihop",
                multihopResult,
                myData.logger,
                misc=[myData.topology, traffic, args],
            )
            contents += content
            direction = args["tests"]["iperf_multihop"]["direction"]
            test_name = (
                "Multihop {0} - rate: {1}bps".format(
                    direction, args["tests"]["iperf_multihop"]["rate"]
                )
                + "duration: {0}s, sessions: {1}, special option: {2}".format(
                    args["tests"]["iperf_multihop"]["duration"],
                    args["tests"]["iperf_multihop"]["sessions"],
                    args["tests"]["iperf_multihop"]["option"],
                )
                + ", traffic: {0} (server_location: {1})".format(
                    traffic, args["tests"]["iperf_multihop"]["server_location"]
                )
            )
            email_results(
                args, emails, cc_list=[], content=content, test_name=test_name
            )
            # link importance analysis
            test_name = test_name.replace("Multihop", "Link Importance from Multihop")
            content = convert_to_html(
                "link_importance", linkImportanceResult, myData.logger
            )
            email_results(
                args, emails, cc_list=[], content=content, test_name=test_name
            )
    # dump multihop performance analysis result to file
    out_fp_no_suffix = "{0}/analysis_multihop".format(args["output_folder"])
    fp = dump_result(
        out_fp_no_suffix,
        multihopResult,
        logger=myData.logger,
        use_JSON=True,
        to_mongo_db=args["write_analysis_to_mongo_db"],
    )
    args["analysis"]["multihop_fp"] = fp
    # dump link importance analysis result to file
    out_fp_no_suffix = "{0}/analysis_link_importance".format(args["output_folder"])
    # analysis_link_importance will be the new collection name in MongoDB
    dump_result(
        out_fp_no_suffix,
        linkImportanceResult,
        logger=myData.logger,
        use_JSON=True,
        # when "sessions" is all, we dump link importance result to mongoDB
        to_mongo_db=(
            args["write_analysis_to_mongo_db"]
            and args["tests"]["iperf_multihop"]["sessions"] == "all"
        ),
    )
    return multihopResult


def analysis_sector_availability(args, myData):
    """
    @param args: require email list, ping file path, and name of network
    @param myData: Data() object
    """
    # check if email is enabled
    emails = get_emails(args, field="ping_sa")
    # perform analysis
    result = analyze("ping_sa", myData)
    # generate email contents
    if emails:
        content = convert_to_html("ping_sa", result, myData.logger, misc=args)
        email_results(
            args,
            emails,
            cc_list=[],
            content=content,
            test_name=(
                "Terra-Availability-{0}Layer - Duration: {1}s".format(
                    args["tests"]["ping_sa"]["layer"],
                    args["tests"]["ping_sa"]["duration"],
                )
            ),
        )
    # print to screen
    print_analysis("ping_sa", result)
    # dump analysis result to file
    out_fp_no_suffix = "{0}/analysis_sector_availability".format(args["output_folder"])
    fp = dump_result(
        out_fp_no_suffix,
        result,
        logger=myData.logger,
        use_JSON=True,
        to_mongo_db=args["write_analysis_to_mongo_db"],
    )
    args["analysis"]["sector_availability_fp"] = fp
    return result, content


def analysis_ping(args, myData):
    """
    @param args: require email list, ping file path, and name of network
    @param myData: Data() object
    """
    # check if email is enabled
    emails = get_emails(args, field="ping_p2p")
    # perform analysis
    result = analyze("ping_p2p", myData)
    # generate email contents
    if emails:
        content = convert_to_html("ping_p2p", result, myData.logger, misc=args)
        email_results(
            args,
            emails,
            cc_list=[],
            content=content,
            test_name=(
                "Terra-Ping-{0}Layer - Duration: {1}s".format(
                    args["tests"]["ping_p2p"]["layer"],
                    args["tests"]["ping_p2p"]["duration"],
                )
            ),
        )
    # dump analysis result to file
    out_fp_no_suffix = "{0}/analysis_ping".format(args["output_folder"])
    fp = dump_result(
        out_fp_no_suffix,
        result,
        logger=myData.logger,
        use_JSON=True,
        to_mongo_db=args["write_analysis_to_mongo_db"],
    )
    args["analysis"]["ping_p2p_fp"] = fp
    return result, content


def dump_network_summary(root_fp, results, logger):
    # TODO: the way subject to change
    for traffic in results:
        mcs_fp = "{0}/www/mcsHistogram{1}.json".format(root_fp, traffic)
        with open(mcs_fp, "w") as of:
            json.dump(results[traffic]["mcs_hist"], of, indent=2)
            logger.info("mcs hist written to {0}".format(mcs_fp))
        link_fp = "{0}/www/linkHealthSummary{1}.json".format(root_fp, traffic)
        with open(link_fp, "w") as of:
            json.dump(results[traffic]["link_health_summary"], of, indent=2)
            logger.info("link health written to {0}".format(link_fp))


def get_operational_power(args, topology, logger):
    """
    get the operational power from the previous latest overview
    """
    # first get overview
    try:
        from modules.util_mongo_db import MongoDB

        mongodb = MongoDB()
        # get latest overview for summarized connectivity
        overview = mongodb.read(KEY.DB_OVERVIEW)
        if not overview:
            logger.error("cannot load `{}` from database".format(KEY.DB_OVERVIEW))
            return
        overview.pop("test_type", None)  # prevent extra field
        overview.pop("time", None)  # prevent extra field
        mongodb.logger.disable()
        mongodb = None
    except BaseException:
        logger.error("cannot load MongoDB")
        return
    # then derive the power index table
    opPowerDict = {}
    txPwrAvgKey = KEY.ODS_STA_TX_PWR.replace(KEY.ODS_STA_PRE + ".", "") + "_avg"
    for link in overview:
        aNode = topology.get_a_node(link)
        zNode = topology.get_z_node(link)
        if aNode not in opPowerDict:
            opPowerDict[aNode] = {}
        if zNode not in opPowerDict:
            opPowerDict[zNode] = {}
        opPowerDict[aNode][zNode] = overview[link][KEY.A2Z].get(
            txPwrAvgKey, float("nan")
        )
        opPowerDict[zNode][aNode] = overview[link][KEY.Z2A].get(
            txPwrAvgKey, float("nan")
        )
    # dump to file
    out_fp_no_suffix = "{0}/txpower_operational".format(args["output_folder"])
    fp = dump_result(out_fp_no_suffix, opPowerDict, logger, use_JSON=True)
    args["analysis"]["txpower_operational_fp"] = fp


def analysis_iperf(args, myData, p2mp_params=None):
    """
    @param args: require email list, iperf file path, and name of network
    @param myData: Data() object
    """
    iperf_type = "iperf_p2p" if not p2mp_params else "iperf_p2mp"

    # check if email is enabled
    emails = get_emails(args, field=iperf_type)
    results = {}
    contents = ""
    traffic_direction_map = {
        KEY.BIDIRECTIONAL: "P2MP BIDIRECTIONAL ",
        KEY.DN_TO_PEER: "P2MP DN_TO_PEER ",
        KEY.PEER_TO_DN: "P2MP PEER_TO_DN ",
    }
    email_traffic_direction = (
        traffic_direction_map[args["tests"][iperf_type]["direction"]]
        if p2mp_params
        else ""
    )

    # perform analysis for tcp/udp if specified
    for traffic in args["tests"][iperf_type]["type"]:
        # only sjc can report dashboard link, pass in this info with misc[2]
        result = analyze(
            iperf_type,
            myData,
            misc=(
                traffic,
                args,
                p2mp_params["time_slot_links"] if p2mp_params else None,
            ),
        )

        # log into results
        results[traffic] = result

        # generate email contents
        if emails:
            content = convert_to_html(
                iperf_type, result, myData.logger, misc=[myData.topology, traffic, args]
            )
            contents += content
            email_results(
                args,
                emails,
                cc_list=[],
                content=content,
                test_name=(
                    "{0}Terra-{1} - Rate: {2}bps Duration: {3}s".format(
                        email_traffic_direction,
                        traffic.upper(),
                        args["tests"][iperf_type]["rate"],
                        args["tests"][iperf_type]["duration"],
                    )
                ),
            )

    # dump analysis result to file
    if not p2mp_params:
        output_folder = args["output_folder"]
        file_name = "analysis_iperf"
    else:
        output_folder = p2mp_params.get("time_slot_file_path", args["output_folder"])
        file_name = "analysis_p2mp_iperf"

        # aggregate p2mp results
        try:
            p2mp_params["aggregator_obj"].update_aggregated_data(results)
        except Exception as err:
            myData.logger.error("Failed aggregate data: {0}".format(err))

    out_fp_no_suffix = "{0}/{1}".format(output_folder, file_name)

    # if it is fine-grained fix power analysis, we add a suffix
    if args["tests"][iperf_type].get("fixpower", None) is not None:
        out_fp_no_suffix += "_fixpwr"
    fp = dump_result(
        out_fp_no_suffix,
        results,
        myData.logger,
        use_JSON=True,
        to_mongo_db=args["write_analysis_to_mongo_db"] if not p2mp_params else False,
    )
    args["analysis"]["iperf_p2p_fp"] = fp
    return results, contents


def analysis_monitor(args, myData):
    """
    analyze monitoring r2d2 results
    @param args: require email list, file path, and name of network
    @param myData: Data() object
    """
    # check if email is enabled
    emails = get_emails(args, field="monitoring_r2d2")
    # perform analysis for link status, foliage, and basic interference
    results = analyze("monitoring", myData)
    # generate email contents
    content = ""
    if emails:
        content = convert_to_html(
            "monitoring", results, myData.logger, misc=[myData.topology, args]
        )
        email_results(
            args,
            emails,
            cc_list=[],
            content=content,
            test_name=(
                "Link Monitoring - Duration: {0}s".format(
                    args["tests"]["monitoring_r2d2"]["duration"]
                )
            ),
        )
    # dump analysis result to file
    out_fp_no_suffix = "{0}/analysis_monitoring".format(args["output_folder"])
    fp = dump_result(
        out_fp_no_suffix,
        results,
        myData.logger,
        use_JSON=True,
        to_mongo_db=args["write_analysis_to_mongo_db"],
    )
    args["analysis"]["monitoring_fp"] = fp
    return results, content


def analysis_reciprocal_im(args, myData):
    """
    use IM scan results for reciprocal analysis
    """
    # check if im scan data is using operational power or a fixed power
    # if not fixed, we cannot test reciprocal here
    if args["tests"]["im_scan"]["tx_power_index"] is None:
        myData.logger.error(
            "Please confirm if IM scans are done using max power, "
            + "otherwise reciprocal analysis can be biased"
        )
    # check if email is enabled
    emails = get_emails(args, field="im_scan")
    # perform analysis
    result = analyze("reciprocal_im", myData)
    # generate email contents
    content = ""
    if emails:
        content = convert_to_html("reciprocal_im", result, myData.logger)
        email_results(args, emails, cc_list=[], content=content, test_name="Reciprocal")
    # dump analysis result to file
    out_fp_no_suffix = "{0}/analysis_reciprocal_im".format(args["output_folder"])
    fp = dump_result(
        out_fp_no_suffix,
        result,
        myData.logger,
        use_JSON=True,
        to_mongo_db=args["write_analysis_to_mongo_db"],
    )
    args["analysis"]["reciprocal_im_fp"] = fp
    return result, content


def analysis_interference(args, myData, power="max"):
    """
    leverage Interfer module to do interference computations
    @param args: require email list, im_scan file path, outfolder
    @param myData: Data() object
    @param power: set to "max"/"idle"/filepath to specify what txPowerIdx we consider
    """
    try:
        from modules.util_interference import Interfer
    except BaseException:
        myData.logger.error("Interference module is failed to load!")
        return ({}, "")
    # check if email is enabled
    emails = get_emails(args, field="im_scan")
    # load im scan data
    myInterfer = Interfer(
        myData.topology, loggerTag="Interference", logPathDir=args["output_folder"]
    )
    # extract interference data from im scan
    myInterfer.get_interference_from_data(
        myData.get_im_data(),
        out_fp=args["output_folder"],
        scanMode=args.get("tests", {}).get("im_scan", {}).get("scan_mode"),
    )
    # derive pair-wise sectors who create interference to each other
    if power == "idle":
        sector_inrs = myInterfer.get_interfer_sectors(use_max_power=False)
        test_name = "Interference (without traffic)"
    elif os.path.isfile(power):
        # TODO: loading from json is subject to change
        myData.logger.info("Analyze interference with probing traffic")
        try:
            txpower_operational = json.load(open(power, "r"))
        except BaseException:
            myData.logger.error("Cannot load txpower file {0}".format(power))
            return ({}, "")
        power = "active"
        myInterfer.get_interference_w_customized_power(txpower_operational)
        sector_inrs = myInterfer.get_interfer_sectors(use_custom_power=True)
        test_name = "Interference (with probing traffic)"
    elif power == "max":
        myData.logger.info("Analyze interference with max power")
        sector_inrs = myInterfer.get_interfer_sectors(use_max_power=True)
        test_name = "Interference (worst-case, txPwrIdx={0})".format(KEY.MAX_PWR_IDX)
    else:
        myData.logger.error("power is: {0} ({1})".format(power, os.path.isfile(power)))
        return ({}, "")
    # analyze interference with and without polarity assignment and ignore same pole
    result = analyze("interference", myData, (sector_inrs, True))
    if args["analysis"]["interference_polarity"]:
        result_no_polarity = analyze("interference", myData, ((sector_inrs, False)))
        result_no_polarity_ignore_same_pole = analyze(
            "interference", myData, (sector_inrs, False, True)
        )
    # generate email contents
    content = ""  # here we only report the result with polarity
    if emails:
        content = convert_to_html("interference", result, myData.logger)
        email_results(args, emails, cc_list=[], content=content, test_name=test_name)
        if args["analysis"]["interference_polarity"]:
            content_no_polarity = convert_to_html(
                "interference", result_no_polarity, myData.logger
            )
            content_no_polarity_ignore_same_pole = convert_to_html(
                "interference", result_no_polarity_ignore_same_pole, myData.logger
            )
            email_results(
                args,
                emails,
                cc_list=[],
                content=content_no_polarity,
                test_name=(test_name + " without polarity"),
            )
            email_results(
                args,
                emails,
                cc_list=[],
                content=content_no_polarity_ignore_same_pole,
                test_name=(test_name + " without polarity, ignoring same pole"),
            )
    # print to screen (only interference with polarity case)
    print_analysis("interference", result)
    ## dump analysis result to file
    out_fp_no_suffix = "{0}/analysis_interference_power_{1}".format(
        args["output_folder"], power
    )
    fp = dump_result(
        out_fp_no_suffix,
        result,
        myData.logger,
        use_JSON=True,
        to_mongo_db=args["write_analysis_to_mongo_db"],
    )
    args["analysis"]["interference_{0}_fp".format(power)] = fp
    if args["analysis"]["interference_polarity"]:
        fp = dump_result(
            out_fp_no_suffix + "_nopolarity",
            result_no_polarity,
            myData.logger,
            use_JSON=True,
            to_mongo_db=args["write_analysis_to_mongo_db"],
        )
        args["analysis"]["interference_{0}_nopolarity_fp".format(power)] = fp
        fp = dump_result(
            out_fp_no_suffix + "_nopolarity_nocolocation",
            result_no_polarity_ignore_same_pole,
            myData.logger,
            use_JSON=True,
        )
        args["analysis"][
            "interference_{0}_nopolarity_nocolocation_fp".format(power)
        ] = fp
    if args["analysis"]["interference_polarity"]:
        return {"w_polarity": result, "wo_polarity": result_no_polarity}, content
    else:
        return {"w_polarity": result}, content


def analysis_connectivity(args, myData):
    """
    analyze connectivity
    """
    # check if email is enabled
    emails = get_emails(args, field="im_scan")
    # perform analysis
    result = analyze(
        "connectivity", myData, misc=args["analysis"]["connectivity_target_snr"]
    )
    # generate email contents
    content = ""
    if emails:
        content = convert_to_html("connectivity", result, myData.logger)
        email_results(
            args, emails, cc_list=[], content=content, test_name="Connectivity"
        )
    # print to screen
    print_analysis("connectivity", result)
    # dump analysis result to file
    out_fp_no_suffix = "{0}/analysis_connectivity_targetSNR_{1}dB".format(
        args["output_folder"], args["analysis"]["connectivity_target_snr"]
    )
    fp = dump_result(
        out_fp_no_suffix,
        result,
        myData.logger,
        use_JSON=True,
        to_mongo_db=args["write_analysis_to_mongo_db"],
    )
    args["analysis"]["connectivity_fp"] = fp
    return result, content


def analysis_box_misalignment(args, myData):
    """
    analyze box misalignment
    """
    # check if email is enabled
    emails = get_emails(args, field="alignment")
    # perform analysis
    result = analyze("box_alignment", myData)
    # generate email contents
    content = ""
    if emails:
        content = convert_to_html("box_alignment", result, myData.logger)
        email_results(
            args, emails, cc_list=[], content=content, test_name="Box Alignment"
        )
    # dump analysis result to file
    out_fp_no_suffix = "{0}/analysis_box_misalignment".format(args["output_folder"])
    fp = dump_result(
        out_fp_no_suffix,
        result,
        myData.logger,
        use_JSON=True,
        to_mongo_db=args["write_analysis_to_mongo_db"],
    )
    args["analysis"]["box_alignment_fp"] = fp
    return result, content


def _find_file(file_list, keyword, exclude_kw=""):
    """
    Find file with keyword in it in the file_list
    """
    for f in file_list:
        if keyword in f:
            if not exclude_kw or exclude_kw not in f:
                return f
    return ""


def do_single_analysis(analysisname, args, misc=None):
    """
    perform single analysis for perform_analysis_immediate in self test

    TODO: refine logic here to speed up data loading if we only want to do
          one analysis..
    """
    myData = load_data(args, noDisabling=True)
    myData.logger.debug("Start {0} analysis".format(analysisname))
    if analysisname == "iperf_p2p" and args["analysis"]["iperf_p2p"]:
        analysis_iperf(args, myData)
    if analysisname == "iperf_p2mp" and args["analysis"]["iperf_p2mp"]:
        analysis_iperf(args, myData, p2mp_params=misc)
    elif analysisname == "ping_p2p" and args["analysis"]["ping_p2p"]:
        analysis_ping(args, myData)
    elif (
        analysisname == "sector_availability"
        and args["analysis"]["sector_availability"]
    ):
        analysis_sector_availability(args, myData)
    elif analysisname == "multihop" and args["analysis"]["multihop"]:
        analysis_multihop(args, myData)
    elif analysisname == "box_alignment" and args["analysis"]["box_alignment"]:
        analysis_box_misalignment(args, myData)
    elif analysisname == "interference" and args["analysis"]["interference"]:
        analysis_interference(args, myData, power="max")
        analysis_interference(args, myData, power="idle")
        # try to get operational power information
        # to perform operational power analysis
        get_operational_power(args, myData.topology, myData.logger)
        if args["analysis"].get("txpower_operational_fp", ""):
            analysis_interference(
                args, myData, power=args["analysis"]["txpower_operational_fp"]
            )
    elif analysisname == "monitoring" and args["analysis"]["monitoring"]:
        analysis_monitor(args, myData)
    elif analysisname == "connectivity" and args["analysis"]["connectivity"]:
        analysis_connectivity(args, myData)
    elif analysisname == "reciprocal_im" and args["analysis"].get(
        "reciprocal_im", False
    ):
        analysis_reciprocal_im(args, myData)
    else:
        myData.logger.error("{0} not recognized/performed".format(analysisname))
    myData.logger.disable()
    myData = None


def do_active_probing_analysis(args, myData):
    """
    do batch of active probing related analysis
    """
    active_probing_dict = {}
    if args["analysis"]["iperf_p2p"]:
        iperf_dict, __iperf_content = analysis_iperf(args, myData)
        active_probing_dict["iperf_p2p"] = iperf_dict
    if args["analysis"]["ping_p2p"]:
        ping_dict, __ping_content = analysis_ping(args, myData)
        active_probing_dict["ping_p2p"] = ping_dict
    if args["analysis"]["sector_availability"]:
        sa_dict, __sa_content = analysis_sector_availability(args, myData)
        active_probing_dict["sector_availability"] = sa_dict
    if args["analysis"]["multihop"]:
        mh_dict, __mh_content = analysis_multihop(args, myData)
        active_probing_dict["multihop"] = mh_dict
    return active_probing_dict


def do_passive_monitoring_analysis(args, myData):
    """
    do batch of passive monitoring related analysis
    """
    passive_monitoring_dict = {}
    if args["analysis"]["box_alignment"]:
        ba_dict, __ba_content = analysis_box_misalignment(args, myData)
        passive_monitoring_dict["box_alignment"] = ba_dict
    if args["analysis"].get("reciprocal_im", False):
        reci_dict, __reci_content = analysis_reciprocal_im(args, myData)
        passive_monitoring_dict["reciprocal_im"] = reci_dict
    if args["analysis"]["interference"]:
        m_dict, __m_content = analysis_interference(args, myData, power="max")
        i_dict, __i_content = analysis_interference(args, myData, power="idle")
        o_dict = {}
        # try to get operational power information
        # to perform operational power analysis
        get_operational_power(args, myData.topology, myData.logger)
        if args["analysis"].get("txpower_operational_fp", ""):
            o_dict, o_content = analysis_interference(
                args, myData, power=args["analysis"]["txpower_operational_fp"]
            )
        passive_monitoring_dict["interference"] = {
            "use_max_pwr": m_dict,
            "use_cur_pwr_est": i_dict,
            "use_customized_pwr_est": o_dict,
        }
    if args["analysis"]["monitoring"]:
        mo_dict, __mo_content = analysis_monitor(args, myData)
        passive_monitoring_dict["monitoring"] = mo_dict
    return passive_monitoring_dict


def do_analysis(args, myData):
    if myData is None:
        return
    # analyze connectivity graph
    if args["analysis"]["connectivity"]:
        connect_dict, __connect_content = analysis_connectivity(args, myData)
    # analyze things related to active probing tests
    do_active_probing_analysis(args, myData)
    # analyze things related to passive monitoring tests
    do_passive_monitoring_analysis(args, myData)
    myData.logger.disable()
    myData = None


def load_data_check(args, myData, fieldname, analysisname, skipAssign=False):
    """
    check the fieldname to load the data to correct location
    """
    status = os.path.isfile(args["tests"][fieldname]["fp"]) or os.path.isdir(
        args["tests"][fieldname]["fp"]
    )
    myData.logger.debug(
        "Trying to find {0} fp at {1}, for {2}".format(
            analysisname, args["tests"][fieldname]["fp"], fieldname
        )
    )
    if status:
        if fieldname == "alignment":
            status = myData.load_topology_extra(args["tests"][fieldname]["fp"])
        elif fieldname == "im_scan":
            status = myData.load_data_im_all(args["tests"][fieldname]["fp"])
        elif fieldname in ["monitoring_r2d2", "iperf_p2p", "iperf_p2mp"]:
            status = myData.load_data(args["tests"][fieldname]["fp"])
        elif fieldname == "ping_p2p":
            status = myData.load_ping_data(args["tests"][fieldname]["fp"])
        elif fieldname == "ping_sa":
            status = myData.load_ping_data(args["tests"][fieldname]["fp"])
        elif fieldname == "iperf_multihop":
            status = myData.load_data(args["tests"][fieldname]["fp"])
            myData.logger.info(
                "Successfully loaded multihop data from {}".format(
                    args["tests"][fieldname]["fp"]
                )
            )
        else:
            status = False
    if not status:
        myData.logger.error(
            "Cannot find required {0} fp at {1}!".format(
                analysisname, args["tests"][fieldname]["fp"]
            )
        )
        if not skipAssign:
            myData.logger.error("Disabling {0} analysis".format(analysisname))
            if isinstance(analysisname, list):
                for each in analysisname:
                    args["analysis"][each] = False
            else:
                args["analysis"][analysisname] = False


def load_data(args, noDisabling=False):
    """
    load necessary data for analysis
    """
    myData = Data(loggerTag="DATA", logPathDir=args["output_folder"])
    if args["analysis"]["data_from_database"]:
        # TODO: loading data from database
        print("Sorry, this is currently not supported yet")
        return None
    if os.path.isfile(args["controller"]["topology_local_fp"]):
        myData.load_topology(args["controller"]["topology_local_fp"])
    else:
        myData.logger.error("Must have topology file to begin with!")
        sys.exit(-1)
    # load required data to proceed
    if args["analysis"]["box_alignment"] or args["analysis"]["interference"]:
        load_data_check(
            args,
            myData,
            "alignment",
            ["box_alignment", "interference"],
            skipAssign=noDisabling,
        )
    if (
        args["analysis"]["interference"]
        or args["analysis"]["connectivity"]
        or args["analysis"].get("reciprocal_im", False)
    ):
        load_data_check(
            args,
            myData,
            "im_scan",
            ["interference", "connectivity", "reciprocal_im"],
            skipAssign=noDisabling,
        )
    if args["analysis"]["monitoring"]:
        load_data_check(
            args, myData, "monitoring_r2d2", "monitoring", skipAssign=noDisabling
        )
    if args["analysis"]["iperf_p2p"]:
        load_data_check(args, myData, "iperf_p2p", "iperf_p2p", skipAssign=noDisabling)
    if args["analysis"]["iperf_p2mp"]:
        load_data_check(
            args, myData, "iperf_p2mp", "iperf_p2mp", skipAssign=noDisabling
        )
    if args["analysis"]["ping_p2p"]:
        load_data_check(args, myData, "ping_p2p", "ping_p2p", skipAssign=noDisabling)
    if args["analysis"]["multihop"]:
        load_data_check(
            args, myData, "iperf_multihop", "multihop", skipAssign=noDisabling
        )
        # For multihop routing analysis,
        # we shall incorporate special sector-to-sector cable configuration.
        # The special wired link is not included in the topology file
        if args.get("custom", {}).get("special_wired_connectivity"):
            myData.topology.special_wired_connectivity = args.get("custom", {}).get(
                "special_wired_connectivity"
            )
    if args["analysis"]["sector_availability"]:
        load_data_check(
            args, myData, "ping_sa", "sector_availability", skipAssign=noDisabling
        )
    return myData


def post_update_overview(args, ofp):
    """
    update the overview after analysis
    """
    try:
        from tool_comparator import compare_wrapper
    except BaseException as ex:
        print("Failed to import tool_comparator for compare_wrapper", ex)
        return False

    # suit need of tool_comparator parameters
    args["update_overview"] = True
    # TODO: update_7daysum also
    args["update_30daysum"] = True
    # run tool_comparator with --update-overview
    compare_wrapper(args)


def post_generate_geoJSON(args, ofp):
    """
    do the geoJSON generation
    """
    try:
        from tool_geogen import geogen_wrapper
    except BaseException as ex:
        print("Failed to import tool_geogen for geogen_wrapper", ex)
        return False

    if not args["gen_geojson"]:
        return
    # suit need of tool_geogen parameters
    args["config"] = ofp
    # run tool_geogen
    geogen_wrapper(args)


def analyzer_wrapper(args):
    """
    end-to-end wrapper for the analyzer
    """
    # setup parameters
    initialize_param(args)
    # mkdir if it does not exist
    if not os.path.isdir(args["output_folder"]):
        try:
            os.makedirs(args["output_folder"])
        except BaseException:
            raise
    # do analysis with loaded data
    if args["do_single_analysis"]:
        do_single_analysis(args["do_single_analysis"], args)
    else:
        do_analysis(args, load_data(args))
    # finalize time and store it
    ofp = finalize_param(args)
    # update the overview
    post_update_overview(args, ofp)
    # generate geoJSON and related files for visualization
    post_generate_geoJSON(args, ofp)
    return True


def main():
    """
    Analyzer Argparser
    It supports run-time analysis with self_test.py
    and post analysis that runs individually
    """
    parser = argparse.ArgumentParser(description="Analyzer Tool")
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
        "--email",
        "-e",
        dest="ow_emails",
        action="store",
        nargs="+",
        default=None,
        help="email results to whom (overwrite config)",
    )
    parser.add_argument(
        "--single-analysis",
        "-one",
        dest="do_single_analysis",
        action="store",
        default="",
        help="perform single analysis (overwrite config)",
    )
    try:
        args = vars(parser.parse_args())
    except BaseException:
        sys.exit()
    analyzer_wrapper(get_configs(args))


if __name__ == "__main__":
    main()
