#!/usr/bin/env python3

# import time
# import tarfile
import argparse

# built-ins
import os
import sys


# modules
sys.path.append("../")
try:
    from modules.util_data_loader import Data
    from visualizer.util_geoJSON_gen import MapGen
except BaseException:
    raise


def _find_file(file_list, keyword, exclude_kw="", include_kw=""):
    """
    Find file with keyword in it in the file_list
    """
    for f in file_list:
        if keyword in f:
            if (not exclude_kw or exclude_kw not in f) and (
                not include_kw or include_kw in f
            ):
                return f
    return ""


def redefine_args(args):
    files = [x for x in os.listdir(args["folder"])]
    if not args["extra"] and _find_file(files, "_extra"):
        args["extra"] = "{0}/{1}".format(args["folder"], _find_file(files, "_extra"))
    if not args["topology"] and _find_file(files, "topo", exclude_kw="extra"):
        args["topology"] = "{0}/{1}".format(
            args["folder"], _find_file(files, "topo", exclude_kw="extra")
        )
    if not args["ping"] and _find_file(files, "ping", include_kw="analysis"):
        args["ping"] = "{0}/{1}".format(
            args["folder"], _find_file(files, "ping", include_kw="analysis")
        )
    if not args["tcp"] and _find_file(
        files, "iperf_link_layer", include_kw="TCP", exclude_kw="foliage"
    ):
        args["tcp"] = "{0}/{1}".format(
            args["folder"],
            _find_file(
                files, "iperf_link_layer", include_kw="TCP", exclude_kw="foliage"
            ),
        )
    if not args["foliage"] and _find_file(files, "iperf", include_kw="UDP_foliage"):
        args["foliage"] = "{0}/{1}".format(
            args["folder"], _find_file(files, "iperf", include_kw="UDP_foliage")
        )
    if not args["udp"] and _find_file(
        files, "iperf_link_layer", include_kw="UDP", exclude_kw="foliage"
    ):
        args["udp"] = "{0}/{1}".format(
            args["folder"],
            _find_file(
                files, "iperf_link_layer", include_kw="UDP", exclude_kw="foliage"
            ),
        )
    if not args["interference"] and _find_file(
        files, "interference_result_analysis", exclude_kw="no_polarity"
    ):
        args["interference"] = "{0}/{1}".format(
            args["folder"], _find_file(files, "interference_result_analysis")
        )
    if not args["routes"] and _find_file(files, "micro_macro"):
        args["routes"] = "{0}/{1}".format(
            args["folder"], _find_file(files, "micro_macro")
        )
    if not args["multihop"] and _find_file(
        files, "multihop", include_kw="analysis.json", exclude_kw=""
    ):
        args["multihop"] = "{0}/{1}".format(
            args["folder"],
            _find_file(files, "multihop", include_kw="json", exclude_kw=""),
        )


def visualize(args, myData):
    output_path = "{0}/visual_map/".format(args["output_folder"])
    if not os.path.isdir(output_path):
        try:
            os.makedirs(output_path)
        except BaseException:
            myData.logger.error("Cannot create folder {0}!".format(output_path))
            return
    myMap = MapGen(
        myData=myData,
        outpath=output_path,
        extraInfoFlag=args["extra_info_flag"],
        loggerTag="MapGen",
        args=args,
    )
    myMap.gen_html()


def load_data(args):
    myData = Data(loggerTag="DATA", logPathDir=args["output_folder"])
    myData.load_topology(args["controller"]["topology_local_fp"])
    status = os.path.isfile(args["tests"]["alignment"]["fp"])
    if status:
        status = myData.load_topology_extra(args["tests"]["alignment"]["fp"])
    args["extra_info_flag"] = status
    for key in args["analysis"]:
        if "_fp" in key:
            fieldname = key.replace("_fp", "")

            if fieldname == "ping_p2p":
                myData.load_ping_analysis(args["analysis"][key])
            elif fieldname == "iperf_p2p":
                myData.load_iperf_analysis(args["analysis"][key], udp=False)
                myData.load_iperf_analysis(args["analysis"][key], udp=True)
    return myData


def visualizer_wrapper(args):
    # load data
    myData = load_data(args)
    # visualize
    visualize(args, myData)


def main():
    """
    Visualizer Tool
    """
    parser = argparse.ArgumentParser(description="Visualizer Tool")
    parser.add_argument("name", help="network name")
    parser.add_argument(
        "--folder",
        "-f",
        action="store",
        default="/tmp/",
        help="folder path for analysis data/result, default is /tmp/",
    )
    parser.add_argument(
        "--topology",
        "-tp",
        action="store",
        default="",
        help=(
            "file path for topology; "
            + "(beta) if not set, will try to find it from -f"
        ),
    )
    parser.add_argument(
        "--extra",
        action="store",
        default="",
        help=(
            "file path for extra phy topology file; "
            + "(beta) if not set, will try to find it from -f"
        ),
    )
    parser.add_argument(
        "--ping",
        action="store",
        default="",
        help=(
            "file path for analysis result of ping test; "
            + "(beta) if not set, will try to find it from -f"
        ),
    )
    parser.add_argument(
        "--tcp",
        action="store",
        default="",
        help=(
            "file path for analysis result of iperf tcp test; "
            + "(beta) if not set, will try to find it from -f"
        ),
    )
    parser.add_argument(
        "--udp",
        action="store",
        default="",
        help=(
            "file path for analysis result of iperf udp test; "
            + "(beta) if not set, will try to find it from -f"
        ),
    )
    parser.add_argument(
        "--foliage",
        action="store",
        default="",
        help=(
            "file path for analysis result of foliage test (TCP-based); "
            + "(beta) if not set, will try to find it from -f"
        ),
    )
    parser.add_argument(
        "--interference",
        "-i",
        action="store",
        default="",
        help=(
            "file path for analysis result of interference; "
            + "(beta) if not set, will try to find it from -f"
        ),
    )
    parser.add_argument(
        "--routes",
        action="store",
        default="",
        help=(
            "file path for micro macro route results;"
            + "(beta) if not set, will try to find it from -f"
        ),
    )
    parser.add_argument(
        "--multihop",
        action="store",
        default="",
        help=(
            "file path for multihop results;"
            + "(beta) if not set, will try to find it from -f"
        ),
    )
    parser.add_argument(
        "--email",
        "-e",
        action="store",
        nargs="+",
        default=[],
        help="email visualization link to whom(s)",
    )
    parser.add_argument(
        "--cc", action="store", nargs="+", default=[], help="cc results to whom(s)"
    )
    parser.add_argument(
        "--controller",
        action="store_true",
        default=False,
        help=("Whether are we running this on controller;"),
    )
    try:
        args = vars(parser.parse_args())
    except BaseException:
        sys.exit()
    if args["folder"] is not None and not os.path.isdir(args["folder"]):
        print("Folder does not exist!")
        sys.exit()
    visualizer_wrapper(args)


if __name__ == "__main__":
    main()
