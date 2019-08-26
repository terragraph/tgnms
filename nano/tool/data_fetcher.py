#!/usr/bin/env python3

import argparse

# built-ins
import os
import sys
import tarfile
import time


# modules
sys.path.append("../")
try:
    from modules.util_topology import Topology
except BaseException:
    raise


def get_data_from_scuba(args):
    try:
        from modules.util_data_collector_scuba import ScubaQuery
    except BaseException as ex:
        print(ex)
        return False
    topology = Topology()
    if not topology.load_topology(args["topology"]):
        print("topology not exists")
        return False
    myScuba = ScubaQuery(topology)
    myScuba.getQueryKeys(
        stapkt=(not args["no_stapkt"]),
        beams=(not args["no_beams"]),
        phy=(not args["no_phy"]),
        phy_data=(not args["no_phy_data"]),
        link=(not args["no_link"]),
    )
    myScuba.networkName = args["name"]
    # get all data
    myScuba.getScubaQueryTopology(
        startT=args["start"],
        endT=args["end"],
        targets=args["targets"],
        pnum=args["pnum"],
    )

    out_fp = myScuba.dump_data(
        "{0}/{1}_scuba_data_{2}".format(
            args["outfolder"], args["name"], int(time.time() * 1000)
        )
    )
    if out_fp is not None and args["tar"]:
        with tarfile.open(
            "{0}/{1}.tar.gz".format(args["outfolder"], int(time.time() * 1000)), "w:gz"
        ) as tar:
            tar.add(out_fp, arcname=os.path.basename(out_fp))
            os.remove(out_fp)
    return True


def get_data_from_ods(args):
    try:
        from modules.util_data_collector_ods import ODS
    except BaseException as ex:
        print(ex)
        return False
    topology = Topology()
    if not topology.load_topology(args["topology"]):
        print("topology not exists")
        return False
    myODS = ODS(topology)
    # get all data
    myODS.change_keys_to_fetch(
        stapkt=(not args["no_stapkt"]),
        beams=(not args["no_beams"]),
        phy=(not args["no_phy"]),
        phy_data=(not args["no_phy_data"]),
        link=(not args["no_link"]),
    )
    if myODS.fetch_all(
        startT=args["start"],
        endT=args["end"],
        targets=args["targets"],
        pnum=args["pnum"],
    ):
        out_fp = myODS.dump_data(
            "{0}/{1}_ods_data_{2}".format(
                args["outfolder"], args["name"], int(time.time() * 1000)
            )
        )
        if out_fp is not None and args["tar"]:
            with tarfile.open(
                "{0}/{1}.tar.gz".format(args["outfolder"], int(time.time() * 1000)),
                "w:gz",
            ) as tar:
                tar.add(out_fp, arcname=os.path.basename(out_fp))
                os.remove(out_fp)
    return True


def get_data(args):
    if args["ods"]:
        get_data_from_ods(args)
    if args["scuba"]:
        get_data_from_scuba(args)


def main():
    """
    ODS/Scuba Data Fetcher
    """
    parser = argparse.ArgumentParser(description="ODS/Scuba Data Fecther")
    parser.add_argument("name", help="network name")
    parser.add_argument("topology", help="topology file path")
    parser.add_argument(
        "--outfolder",
        "-o",
        action="store",
        default="/tmp/",
        help="output folder path, default is /tmp/",
    )
    parser.add_argument(
        "--targets",
        action="store",
        nargs="+",
        default=None,
        help="if set, specify node name(s) to fetch data; "
        + "otherwise fetch all nodes data",
    )
    parser.add_argument(
        "--start", action="store", default="-1 day", help="start time; default `-1 day`"
    )
    parser.add_argument(
        "--end", action="store", default="now", help="end time; default `now`"
    )
    parser.add_argument(
        "--pnum",
        action="store",
        type=int,
        default=20,
        help="number of parallel processes; default 20; do NOT set too high",
    )
    parser.add_argument(
        "--tar",
        action="store_true",
        default=False,
        help="tar the result folder and remove the folder to save space",
    )
    parser.add_argument("--ods", action="store_true", default=False, help="Query ODS")
    parser.add_argument(
        "--scuba", action="store_true", default=False, help="Query Scuba"
    )
    parser.add_argument(
        "--no_stapkt", action="store_true", default=False, help="Do NOT get stapkt"
    )
    parser.add_argument(
        "--no_beams", action="store_true", default=False, help="Do NOT get beams"
    )
    parser.add_argument(
        "--no_phy", action="store_true", default=False, help="Do NOT get phy"
    )
    parser.add_argument(
        "--no_phy_data", action="store_true", default=False, help="Do NOT get phy_data"
    )
    parser.add_argument(
        "--no_link", action="store_true", default=False, help="Do NOT get link"
    )
    try:
        args = vars(parser.parse_args())
    except BaseException:
        sys.exit()
    if args["outfolder"] is not None and not os.path.isdir(args["outfolder"]):
        print("Output folder does not exist!")
        sys.exit()
    get_data(args)


if __name__ == "__main__":
    main()
