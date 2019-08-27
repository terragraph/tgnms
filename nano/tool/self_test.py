#!/usr/bin/env python3

import argparse
import json

# built-ins
import os
import shutil
import subprocess
import sys
import tarfile
import time


# modules
sys.path.append("../")
try:
    import modules.keywords as KEY
    from gevent.monkey import patch_thread
    from modules.addon_misc import epoch2readable, update_nested_dict
    from modules.addon_terminal_color import colorString
    from modules.util.remote.base import spawn_new_login
    from modules.util_availability import AVAILABILITY
    from modules.util_local_tg import LOCAL_TG
    from modules.util.remote.controller_operation import REMOTE_TG
    from tool.analyzer import analyzer_wrapper, do_single_analysis
    from tool.comparator import compare_wrapper
    from tool.geogen import geogen_wrapper
except BaseException:
    raise


def _overwrite_configs_phy(config_args, args):
    # alignment
    if args["ow_alignment"] is not None:
        config_args["tests"]["alignment"]["do_it"] = args["ow_alignment"]
    # im scan
    if args["ow_imscan"] is not None:
        config_args["tests"]["im_scan"]["do_it"] = args["ow_imscan"]
        config_args["tests"]["im_scan"]["tx_power_index"] = args["ow_tx_pwr_idx"]
        config_args["tests"]["im_scan"]["scan_mode"] = args["ow_scan_mode"]
        config_args["analysis"]["interference_polarity"] = args[
            "ow_interference_polarity"
        ]
    # monitoring r2d2
    if args["ow_monitoring_r2d2"] is not None:
        config_args["tests"]["monitoring_r2d2"]["do_it"] = args["ow_monitoring_r2d2"]


def _overwrite_configs_net_multihop(config_args, args):
    # multihop related
    if args["ow_iperf_multihop"] is not None:
        config_args["tests"]["iperf_multihop"]["do_it"] = args["ow_iperf_multihop"]
    if args["ow_iperf_multihop_direction"] is not None:
        config_args["tests"]["iperf_multihop"]["direction"] = args[
            "ow_iperf_multihop_direction"
        ]
    if args["ow_iperf_multihop_server_location"] is not None:
        config_args["tests"]["iperf_multihop"]["server_location"] = args[
            "ow_iperf_multihop_server_location"
        ]
    if args["ow_iperf_multihop_rate"] is not None:
        config_args["tests"]["iperf_multihop"]["rate"] = args["ow_iperf_multihop_rate"]
    if args["ow_iperf_multihop_type"] is not None:
        config_args["tests"]["iperf_multihop"]["type"] = args["ow_iperf_multihop_type"]
    if args["ow_iperf_multihop_congest_ctrl"] is not None:
        config_args["tests"]["iperf_multihop"]["congest_ctrl_algo"] = args[
            "ow_iperf_multihop_congest_ctrl"
        ]
    if args["ow_iperf_multihop_popip"] is not None:
        config_args["tests"]["iperf_multihop"]["pop_ip"] = args[
            "ow_iperf_multihop_popip"
        ]
    if args["ow_iperf_multihop_duration"] is not None:
        config_args["tests"]["iperf_multihop"]["duration"] = int(
            args["ow_iperf_multihop_duration"]
        )
    if args["ow_iperf_multihop_sessions"] is not None:
        config_args["tests"]["iperf_multihop"]["sessions"] = args[
            "ow_iperf_multihop_sessions"
        ]
    # supports two options "cn_only" which includes all CN nodes
    #   and "dn_site" which covers one node at each DN site
    if args["ow_iperf_multihop_option"] is not None:
        config_args["tests"]["iperf_multihop"]["option"] = args[
            "ow_iperf_multihop_option"
        ]


def _overwrite_configs_net_iperf_p2p(config_args, args):
    # iperf p2p related
    if args["ow_iperf_p2p"] is not None:
        config_args["tests"]["iperf_p2p"]["do_it"] = args["ow_iperf_p2p"]
    if args["ow_iperf_p2p_layer"] is not None:
        config_args["tests"]["iperf_p2p"]["layer"] = args["ow_iperf_p2p_layer"]
    if args["ow_iperf_p2p_rate"] is not None:
        config_args["tests"]["iperf_p2p"]["rate"] = args["ow_iperf_p2p_rate"]
    if args["ow_iperf_p2p_type"] is not None:
        config_args["tests"]["iperf_p2p"]["type"] = args["ow_iperf_p2p_type"]
    if args["ow_iperf_p2p_duration"] is not None:
        config_args["tests"]["iperf_p2p"]["duration"] = int(
            args["ow_iperf_p2p_duration"]
        )
    if args["ow_iperf_p2p_sessions"] is not None:
        config_args["tests"]["iperf_p2p"]["sessions"] = args["ow_iperf_p2p_sessions"]
    if args["ow_iperf_p2p_tx"] is not None:
        config_args["tests"]["iperf_p2p"]["tx"] = args["ow_iperf_p2p_tx"]
    # fix power index
    if args["ow_iperf_p2p_fixpwridx"] is not None:
        txpwridx = int(args["ow_iperf_p2p_fixpwridx"])
        if txpwridx > KEY.MAX_PWR_IDX or txpwridx < 0:
            print("Power index is set too high/low")
            exit(1)
        config_args["tests"]["iperf_p2p"]["fixpower"] = txpwridx


def _overwrite_configs_net_iperf_p2mp(config_args, args):
    # iperf p2mp related overwrites
    if args["ow_iperf_p2mp"] is not None:
        config_args["tests"]["iperf_p2mp"]["do_it"] = args["ow_iperf_p2mp"]
    if args["ow_iperf_p2mp_layer"] is not None:
        config_args["tests"]["iperf_p2mp"]["layer"] = args["ow_iperf_p2mp_layer"]
    if args["ow_iperf_p2mp_rate"] is not None:
        config_args["tests"]["iperf_p2mp"]["rate"] = args["ow_iperf_p2mp_rate"]
    if args["ow_iperf_p2mp_direction"] is not None:
        config_args["tests"]["iperf_p2mp"]["direction"] = args[
            "ow_iperf_p2mp_direction"
        ]
    if args["ow_iperf_p2mp_duration"] is not None:
        config_args["tests"]["iperf_p2mp"]["duration"] = int(
            args["ow_iperf_p2mp_duration"]
        )
    if args["ow_iperf_p2mp_sessions"] is not None:
        config_args["tests"]["iperf_p2mp"]["sessions"] = args["ow_iperf_p2mp_sessions"]
    if args["ow_iperf_p2mp_tx"] is not None:
        config_args["tests"]["iperf_p2mp"]["tx"] = args["ow_iperf_p2mp_tx"]
    # fix power index
    if args["ow_iperf_p2mp_fixpwridx"] is not None:
        txpwridx = int(args["ow_iperf_p2mp_fixpwridx"])
        if txpwridx > KEY.MAX_PWR_IDX or txpwridx < 0:
            print("Power index is set too high/low")
            exit(1)
        config_args["tests"]["iperf_p2mp"]["fixpower"] = txpwridx


def _overwrite_configs_net(config_args, args):
    # ping related
    if args["ow_ping_p2p"] is not None:
        config_args["tests"]["ping_p2p"]["do_it"] = args["ow_ping_p2p"]
        if args["ow_ping_p2p_layer"] is not None:
            config_args["tests"]["ping_p2p"]["layer"] = args["ow_ping_p2p_layer"]
    # others
    _overwrite_configs_net_iperf_p2p(config_args, args)
    _overwrite_configs_net_iperf_p2mp(config_args, args)
    _overwrite_configs_net_multihop(config_args, args)


def _overwrite_configs(config_args, args):
    """
    Don't call this function directly
    It handles arguments that overwrite the config file
    """
    if args["ow_topology"] is not None:
        config_args["controller"]["topology_local_fp"] = args["ow_topology"]
    if args["ow_parallel"] is not None:
        config_args["parallel"] = args["ow_parallel"]
    if args["ow_var_traffic_ld"] is not None:
        config_args["variable_traffic_loading"] = args["ow_var_traffic_ld"]
    if args["ow_emails"] is not None:
        config_args["global_email_lists"] = args["ow_emails"]
        config_args["enable_per_test_emailing"] = False
    if args["ow_email_extra"] is not None:
        # add extra people to the email list
        config_args["global_email_lists"] += args["ow_email_extra"]
        config_args["enable_per_test_emailing"] = False
    _overwrite_configs_phy(config_args, args)
    _overwrite_configs_net(config_args, args)


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
    config_args["outfolder"] = args["outfolder"]
    config_args["name"] = args["name"]
    if config_args["parallel_threads_limit"] is None:
        config_args["parallel_threads_limit"] = float("inf")
    _overwrite_configs(config_args, args)
    return config_args


def finalize_param(args):
    """
    finalize parameter and store it to the folder
    """
    # get the end time
    epoch = int(time.time() * 1000)
    args["test_finish_time_epoch_ms"] = epoch
    args["test_finish_time_readable"] = epoch2readable(epoch / 1000)
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
    epoch_time = int(time.time() * 1000)
    args["output_folder"] = "{0}/{1}_self_test_{2}".format(
        args["outfolder"], args["name"], epoch_time
    )
    args["test_start_time_epoch_ms"] = epoch_time
    args["test_start_time_readable"] = epoch2readable(epoch_time / 1000)


def show_finishing_msg_each(msgName, fp):
    if fp:
        print(
            colorString("{0:24}".format("* " + msgName + " path:"), color="darkcyan")
            + colorString("{0}".format(fp), underline=True, color="black")
        )
        if not (os.path.isdir(fp) or os.path.isfile(fp)):
            print(colorString("{0:24} File/folder not exists!".format(""), color="red"))
        print("")


def show_finishing_msg(args):
    title = (
        "\n{0}\n".format("=" * 82)
        + "{0} Self Test Has Finished.. {0}\n".format("=" * 28)
        + "{0}\n".format("=" * 82)
    )
    print(colorString(title, color="darkcyan"))
    show_finishing_msg_each("im scan", args["tests"]["im_scan"].get("fp", ""))
    show_finishing_msg_each("ping test", args["tests"]["ping_p2p"].get("fp", ""))
    show_finishing_msg_each("iperf test", args["tests"]["iperf_p2p"].get("fp", ""))
    show_finishing_msg_each(
        "sector availability", args["tests"]["ping_sa"].get("fp", "")
    )
    show_finishing_msg_each(
        "multihop test", args["tests"]["iperf_multihop"].get("fp", "")
    )
    show_finishing_msg_each(
        "multihop cpe test", args["tests"]["iperf_multihop"].get("cpefp", "")
    )
    print(
        colorString("{0:24}".format("* log path:"), color="black")
        + colorString(
            "{0}/log".format(args["output_folder"]), underline=True, color="black"
        )
    )
    print("")
    print(colorString("{0}".format("=" * 82), color="darkcyan"))


def post_analysis(args, ofp):
    """
    analyze (and visualize) tests
    """
    # suit need of analyzer/geogen parameters
    args["config"] = ofp
    # check if per test analysis is done, if yes
    if args["perform_analysis"] and not args["perform_analysis_immediate"]:
        args["do_single_analysis"] = False
        # run analyzer
        return analyzer_wrapper(args)

    # otherwise, we do not need to re-analyze everything, just go for
    # comparator and geoJSON generation
    # suit need of comparator parameters
    args["update_overview"] = True
    args["update_30daysum"] = True
    args["input_folder"] = args["output_folder"]
    # if we are not testing multihop, run comparator with --update-overview
    if (
        # multihop overview is not ready, bypass the overview action for now
        not args["tests"]["iperf_multihop"]["do_it"]
    ):
        compare_wrapper(args)
    if args["gen_geojson"]:
        geogen_wrapper(args)
    return True


def passive_monitoring_tests(__vm, args):
    """
    do batch of passive monitoring tests
    """
    # do im scan
    if args["tests"]["im_scan"]["do_it"]:
        args["tests"]["im_scan"]["fp"] = CMD.im_scan_wrapper(
            __vm,
            targets=args["tests"]["im_scan"]["tx"],
            tx_power=args["tests"]["im_scan"]["tx_power_index"],
            scan_mode=args["tests"]["im_scan"]["scan_mode"],
            to_mongo_db=args["tests"]["im_scan"]["write_raw_data_to_mongo_db"],
        )
        if args["perform_analysis_immediate"]:
            do_single_analysis("interference", args)
            if args["tests"]["im_scan"]["scan_mode"] == KEY.SCAN_MODE_FINE:
                do_single_analysis("connectivity", args)
                do_single_analysis("reciprocal_im", args)
    # do monitor
    if args["tests"]["monitoring_r2d2"]["do_it"]:
        args["tests"]["monitoring_r2d2"]["fp"], __ = CMD.monitor_wrapper(
            __vm,
            targets=args["tests"]["monitoring_r2d2"]["tx"],
            parallel=args["parallel"],
            pnum=args["parallel_threads_limit"],
            duration=args["tests"]["monitoring_r2d2"]["duration"],
        )
        if args["perform_analysis_immediate"]:
            do_single_analysis("monitoring_r2d2", args)


def active_probing_tests(__vm, args):
    """
    do batch of active probing tests
    """
    # do ping p2p
    if args["tests"]["ping_p2p"]["do_it"]:
        args["tests"]["ping_p2p"]["fp"], __ = CMD.ping_test_wrapper(
            __vm,
            targets=args["tests"]["ping_p2p"]["tx"],
            parallel=args["parallel"],
            pnum=args["parallel_threads_limit"],
            layer=args["tests"]["ping_p2p"]["layer"],
            duration=args["tests"]["ping_p2p"]["duration"],
        )
        if args["perform_analysis_immediate"]:
            do_single_analysis("ping_p2p", args)

    # do ping sector availability
    if args["tests"]["ping_sa"]["do_it"]:
        my_pssh = AVAILABILITY()
        if args["parallel"]:
            args["tests"]["ping_sa"]["fp"], __ = my_pssh.sector_availability(
                __vm,
                "ping6",
                args,
                duration=args["tests"]["ping_sa"]["duration"],
                pop_ip=args["tests"]["ping_sa"]["pop_ip"],
            )
        else:
            args["tests"]["ping_sa"]["fp"], __ = my_pssh.sector_availability_sequential(
                __vm,
                args,
                duration=args["tests"]["ping_sa"]["duration"],
                pop_ip=args["tests"]["ping_sa"]["pop_ip"],
            )
        if args["perform_analysis_immediate"]:
            do_single_analysis("sector_availability", args)

    # do iperf p2p
    if args["tests"]["iperf_p2p"]["do_it"]:
        # iperf on link layer (terra0, terra1, etc.)
        args["tests"]["iperf_p2p"]["fp"], __ = CMD.iperf_p2p_test_wrapper(
            __vm,
            targets=args["tests"]["iperf_p2p"]["tx"],
            parallel=args["parallel"],
            variable_traffic_loading=args["variable_traffic_loading"],
            pnum=args["parallel_threads_limit"],
            iperf_layer=args["tests"]["iperf_p2p"]["layer"],
            duration=args["tests"]["iperf_p2p"]["duration"],
            traffictype=args["tests"]["iperf_p2p"]["type"],
            fixpoweridx=args["tests"]["iperf_p2p"].get("fixpower", None),
        )
        if args["perform_analysis_immediate"]:
            do_single_analysis("iperf_p2p", args)

    # do iperf p2mp
    if args["tests"]["iperf_p2mp"]["do_it"]:
        # P2MP scheduling allocation fairness analysis
        CMD.iperf_p2mp_test_wrapper(__vm, args)

    # do iperf multihop
    if args["tests"]["iperf_multihop"]["do_it"]:
        (
            args["tests"]["iperf_multihop"]["fp"],
            multihop_results,
        ) = CMD.multihop_test_wrapper(
            __vm,
            targets=args["tests"]["iperf_multihop"]["sector"],
            parallel=args["parallel"],
            duration=args["tests"]["iperf_multihop"]["duration"],
            pnum=args["parallel_threads_limit"],
            traffictype=args["tests"]["iperf_multihop"]["type"],
            direction=args["tests"]["iperf_multihop"]["direction"],
        )
        if args["perform_analysis_immediate"]:
            do_single_analysis("multihop", args)


def self_test_action(__vm, args):
    """
    do self test and get result file path
    """
    # get config file before test
    if args["tests"]["fetching_fw_config"]["do_it"]:
        CMD.fetch_fw_config_all(
            __vm, parallel=args["parallel"], pnum=args["parallel_threads_limit"]
        )
    # perform passive monitoring tests
    passive_monitoring_tests(__vm, args)
    # perform active probing tests
    active_probing_tests(__vm, args)
    # get config file after test
    if args["tests"]["fetching_fw_config"]["do_it"]:
        CMD.fetch_fw_config_all(
            __vm, parallel=args["parallel"], pnum=args["parallel_threads_limit"]
        )


def use_my_server(args):
    # get and return LOCAL_TG object
    return LOCAL_TG(args, loggerTag="NANO", logPathDir=args["output_folder"])


def use_my_controller(args):
    # login to the Controller and return object
    my_controller = spawn_new_login(
        args, loggerTag="CONTROLLER", destination="controller"
    )
    if not my_controller:
        print("ERROR: Unable to login to Controller.")
        return False
    else:
        my_controller.logger.info("Logged onto Controller.")
    return my_controller


def self_test_initialization(args):
    """
    initialization for tests (for `self_test_wrapper`)
    """
    # setup parameters
    initialize_param(args)
    # mkdir
    if not os.path.isdir(args["output_folder"]):
        try:
            os.makedirs(args["output_folder"])
        except BaseException:
            raise
    # Before everything, restart sshd to prevent excessive failure cases
    # this is a quick hack and should be addressed in production later
    restart_cmd = "sudo systemctl restart systemd-logind; sudo systemctl restart sshd"
    p = subprocess.Popen(
        restart_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, shell=True
    )
    p.communicate()

    # get either NANO VM or Controller object based on user config
    __vm = (
        use_my_server(args)
        if args.get("controller", {}).get("use_e2e_api", True)
        else use_my_controller(args)
    )
    if not __vm:
        return False

    # load topology
    topo_fp = __vm.get_topology(
        filepath=args["controller"]["topology_local_fp"], to_mongo_db=True
    )

    # if E2E API is down, fall-back to TG CLI
    if not topo_fp:
        __vm.logger.error("Unable to load topology. Retrying using to TG CLI.")
        __vm.logger.disable()

        # get Controller object
        __vm = use_my_controller(args)

        # load topology using TG CLI
        topo_fp = __vm.get_topology(
            filepath=args["controller"]["topology_local_fp"], to_mongo_db=True
        )
        if not topo_fp:
            __vm.logger.error("Cannot load topology correctly.")
            __vm.close_all()
            return False
    else:
        __vm.logger.info("Successfully loaded topology!")

    args["controller"]["topology_local_fp"] = topo_fp
    __vm.logger.debug("Config used to run this test: {0}".format(args))

    return __vm


def self_test_wrapper(args):
    """
    end-to-end wrapper for self test
    """
    global CMD
    try:
        if args.get("gevent_monkey_patch_thread", False):
            patch_thread()
        # always import threading after patch, if needed the patch
        import modules.util.remote.cmd as CMD
    except BaseException as ex:
        print("Failed to patch thread for {0}: {1}".format(args["network_name"], ex))
        print("Will stop doing self tests!")
        return False

    # initialize args and controller login for tests
    __vm = self_test_initialization(args)
    if not __vm:
        return False

    # get extra info for alignment analysis
    if args["tests"]["alignment"]["do_it"] or args["tests"]["im_scan"]["do_it"]:
        # alignment analysis shall use parallel mode to gather result
        args["tests"]["alignment"]["fp"] = CMD.fetch_phy_layer_info(
            __vm, parallel=True, pnum="inf"
        )
    if args["tests"]["alignment"]["do_it"] and args["perform_analysis_immediate"]:
        do_single_analysis("box_alignment", args)

    # start self tests
    self_test_action(__vm, args)

    # finished self tests
    if isinstance(__vm, REMOTE_TG):
        __vm.close_all()
    show_finishing_msg(args)
    ofp = finalize_param(args)

    # perform analysis
    # TODO: skipping for p2mp test. clean-up
    if not args["tests"]["iperf_p2mp"]["do_it"]:
        post_analysis(args, ofp)
    else:
        __vm.logger.info("Skipping P2MP Post Analysis.")

    if args["tar"]:
        with tarfile.open(
            "{0}/{1}.tar.gz".format(args["outfolder"], int(time.time() * 1000)), "w:gz"
        ) as tar:
            tar.add(
                args["output_folder"], arcname=os.path.basename(args["output_folder"])
            )
        if args["tar_remove_folder"]:
            shutil.rmtree(args["output_folder"])

    return True


def main():
    """
    Self Test Argparser
    """
    parser = argparse.ArgumentParser(
        description="Self Test Tool (for Alive Links Only)"
    )
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
    parser.add_argument(
        "--outfolder",
        "-o",
        action="store",
        default="/tmp",
        help="output folder path, default is /tmp/",
    )
    # the following arguments, if specified, will
    # overwrite the config file (if loaded)
    # only a limited number of things can be overwrited here
    parser.add_argument(
        "--topology",
        "-tp",
        dest="ow_topology",
        action="store",
        default=None,
        help="define local file path for topology (overwrite config)",
    )
    # alignment related
    parser.add_argument(
        "--alignment",
        dest="ow_alignment",
        action="store_true",
        default=None,
        help="enable alignment test (overwrite config)",
    )
    parser.add_argument(
        "--no-alignment",
        dest="ow_alignment",
        action="store_false",
        default=None,
        help="disable alignment test (overwrite config)",
    )
    # ping related
    parser.add_argument(
        "--ping",
        dest="ow_ping_p2p",
        action="store_true",
        default=None,
        help="enable p2p ping test (overwrite config)",
    )
    parser.add_argument(
        "--no-ping",
        dest="ow_ping_p2p",
        action="store_false",
        default=None,
        help="disable p2p ping test (overwrite config)",
    )
    parser.add_argument(
        "--ping-layer",
        dest="ow_ping_p2p_layer",
        action="store",
        default=None,
        help="p2p ping test layer: link or network (overwrite config)",
    )
    # iperf related
    parser.add_argument(
        "--iperf",
        dest="ow_iperf_p2p",
        action="store_true",
        default=None,
        help="enable p2p iperf test (overwrite config)",
    )
    parser.add_argument(
        "--no-iperf",
        dest="ow_iperf_p2p",
        action="store_false",
        default=None,
        help="disable p2p iperf test (overwrite config)",
    )
    parser.add_argument(
        "--iperf-layer",
        dest="ow_iperf_p2p_layer",
        action="store",
        default=None,
        help="p2p iperf test layer: link or network (overwrite config)",
    )
    parser.add_argument(
        "--iperf-duration",
        dest="ow_iperf_p2p_duration",
        action="store",
        default=None,
        type=int,
        help="p2p iperf test duration in seconds (overwirte config)",
    )
    parser.add_argument(
        "--iperf-rate",
        dest="ow_iperf_p2p_rate",
        action="store",
        default=None,
        help="p2p iperf test data rate (overwrite config)",
    )
    parser.add_argument(
        "--iperf-type",
        dest="ow_iperf_p2p_type",
        action="store",
        nargs="+",
        default=None,
        help="p2p iperf traffic type (overwrite config)",
    )
    parser.add_argument(
        "--iperf-sessions",
        dest="ow_iperf_p2p_sessions",
        action="store",
        default=None,
        help="config number of p2p iperf sessions",
    )
    parser.add_argument(
        "--iperf-tx",
        dest="ow_iperf_p2p_tx",
        action="store",
        nargs="+",
        default=None,
        help="p2p iperf test with specified TXs (overwirte config)",
    )
    parser.add_argument(
        "--iperf-fixpower",
        dest="ow_iperf_p2p_fixpwridx",
        action="store",
        default=None,
        type=int,
        help="p2p iperf test with specified fixed power idx (overwirte config)",
    )
    # p2mp related arguments
    parser.add_argument(
        "--p2mp",
        dest="ow_iperf_p2mp",
        action="store_true",
        default=None,
        help="enable p2mp iperf test (overwrite config)",
    )
    parser.add_argument(
        "--no-p2mp",
        dest="ow_iperf_p2mp",
        action="store_false",
        default=None,
        help="disable p2mp iperf test (overwrite config)",
    )
    parser.add_argument(
        "--p2mp-iperf-layer",
        dest="ow_iperf_p2mp_layer",
        action="store",
        default=None,
        help="p2mp iperf test layer: link or network (overwrite config)",
    )
    parser.add_argument(
        "--p2mp-iperf-duration",
        dest="ow_iperf_p2mp_duration",
        action="store",
        default=None,
        type=int,
        help="p2mp iperf test duration in seconds (overwirte config)",
    )
    parser.add_argument(
        "--p2mp-iperf-rate",
        dest="ow_iperf_p2mp_rate",
        action="store",
        default=None,
        help="p2mp iperf test data rate (overwrite config)",
    )
    parser.add_argument(
        "--p2mp-iperf-direction",
        dest="ow_iperf_p2mp_direction",
        action="store",
        default=1,
        type=int,
        help="p2mp iperf traffic direction. BIDIRECTIONAL = 1 "
        + "or DN_TO_PEER = 2 or PEER_TO_DN = 3 (overwrite config)",
    )
    parser.add_argument(
        "--p2mp-iperf-sessions",
        dest="ow_iperf_p2mp_sessions",
        action="store",
        default=None,
        help="config number of p2mp iperf sessions",
    )
    parser.add_argument(
        "--p2mp-iperf-tx",
        dest="ow_iperf_p2mp_tx",
        action="store",
        nargs="+",
        default=None,
        help="p2mp iperf test with specified TXs (overwirte config)",
    )
    parser.add_argument(
        "--p2mp-iperf-fixpower",
        dest="ow_iperf_p2mp_fixpwridx",
        action="store",
        default=None,
        type=int,
        help="p2mp iperf test with specified fixed power idx (overwirte config)",
    )
    # monitor related
    parser.add_argument(
        "--monitor",
        dest="ow_monitoring_r2d2",
        action="store_true",
        default=None,
        help="enable monitor test (overwrite config)",
    )
    parser.add_argument(
        "--no-monitor",
        dest="ow_monitoring_r2d2",
        action="store_false",
        default=None,
        help="disable monitor test (overwrite config)",
    )
    # multihop related
    parser.add_argument(
        "--multihop",
        dest="ow_iperf_multihop",
        action="store_true",
        default=None,
        help="enable multihop iperf test (overwrite config)",
    )
    parser.add_argument(
        "--multihop-duration",
        dest="ow_iperf_multihop_duration",
        action="store",
        default=None,
        type=int,
        help="multihop iperf duration in seconds (overwrite config)",
    )
    parser.add_argument(
        "--multihop-rate",
        dest="ow_iperf_multihop_rate",
        action="store",
        default=None,
        help="multihop iperf data rate (overwrite config)",
    )
    parser.add_argument(
        "--multihop-type",
        dest="ow_iperf_multihop_type",
        action="store",
        nargs="+",
        default=None,
        help="multihop iperf traffic type (overwrite config)",
    )
    parser.add_argument(
        "--multihop-tcpcongestctrl",
        dest="ow_iperf_multihop_congest_ctrl",
        action="store",
        default="reno",
        help="multihop iperf traffic congestion control algorithm (overwrite config)",
    )
    parser.add_argument(
        "--multihop-popip",
        dest="ow_iperf_multihop_popip",
        action="store",
        default=None,
        help="multihop PoP IP address (overwrite config)",
    )
    parser.add_argument(
        "--multihop-sessions",
        dest="ow_iperf_multihop_sessions",
        action="store",
        default=None,
        help="config number of sequential multihop sessions",
    )
    parser.add_argument(
        "--multihop-option",
        dest="ow_iperf_multihop_option",
        action="store",
        default=None,
        help=(
            "multihop test/analysis option "
            + "choices are cn_only (picks only CN node) "
            + "and dn_site (picks one node per DN site)"
        ),
    )
    parser.add_argument(
        "--no-multihop",
        dest="ow_iperf_multihop",
        action="store_false",
        default=None,
        help="disable multihop iperf test (overwrite config)",
    )
    parser.add_argument(
        "--multihop-direction",
        dest="ow_iperf_multihop_direction",
        action="store",
        default=None,
        help=(
            "multihop iperf test direction (overwrite config)"
            + "choices are northbound, southbound, bidirection"
        ),
    )
    parser.add_argument(
        "--multihop-server-location",
        dest="ow_iperf_multihop_server_location",
        action="store",
        default=None,
        help="multihop iperf server config (overwrite config)",
    )
    # im scans
    parser.add_argument(
        "--im",
        dest="ow_imscan",
        action="store_true",
        default=None,
        help="enable im scan (overwrite config)",
    )
    parser.add_argument(
        "--no-im",
        dest="ow_imscan",
        action="store_false",
        default=None,
        help="disable im scan (overwrite config)",
    )
    parser.add_argument(
        "--scan-mode",
        dest="ow_scan_mode",
        action="store",
        default=KEY.SCAN_MODE_FINE,
        type=int,
        help=(
            "scan mode if IM scan enabled (overwrite config) "
            + "COARSE=1, FINE=2, SELECTIVE=3, RELATIVE=4"
        ),
    )
    parser.add_argument(
        "--interference-polarity",
        dest="ow_interference_polarity",
        action="store_true",
        default=None,
        help=(
            "enable interf. analysis w. \
            different polarity considerations (overwrite config)"
        ),
    )
    parser.add_argument(
        "--tx-power-index",
        "-tpi",
        dest="ow_tx_pwr_idx",
        action="store",
        type=int,
        default=KEY.MAX_PWR_IDX,
        help=(
            "if IM scan enabled, specify tx power index"
            + "(default {0}, overwrite config)".format(KEY.MAX_PWR_IDX)
        ),
    )
    # misc
    parser.add_argument(
        "--parallel",
        dest="ow_parallel",
        action="store_true",
        default=None,
        help="enable parallel mode (overwrite config)",
    )
    parser.add_argument(
        "--sequential",
        dest="ow_parallel",
        action="store_false",
        default=None,
        help="disable parallel mode (overwrite config)",
    )
    parser.add_argument(
        "--variable_traffic_loading",
        dest="ow_var_traffic_ld",
        action="store_true",
        default=None,
        help="enable Variable traffic loading based on DOF in P2MP configuration",
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
        "--email_extra",
        dest="ow_email_extra",
        action="store",
        nargs="+",
        default=None,
        help="email results to extra people (input from UI)",
    )
    try:
        args = vars(parser.parse_args())
    except BaseException:
        raise
    if args["outfolder"] is not None and not os.path.isdir(args["outfolder"]):
        print("Output folder does not exist!")
        sys.exit()
    self_test_wrapper(get_configs(args))


if __name__ == "__main__":
    main()
