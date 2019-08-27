#!/usr/bin/env python3

import argparse

# built-ins
import os
import sys


# modules
sys.path.append("../")
try:
    from modules.util_topology import Topology
    from modules.util_golay import Golay
except BaseException:
    raise


def initial_golay_assignment(args):
    # initialize params
    topology_fp = args["topology_fp"]  # file path of topology file
    worst_link = None  # which link to start

    # load initial topology file
    topology = Topology()
    try:
        topology.load_topology(topology_fp)
    except BaseException as ex:
        print(ex)
        sys.exit()

    # initialize Golay() object with this topology
    myGolay = Golay(topology)

    # whether using interference-based graph or simple angle-based graph
    if args["i"]:
        from modules.util_interference import Interfer

        # predict interference
        myInterference = Interfer(topology)
        myInterference.get_interference_from_predicts(
            args["num_iter"], useBoxModel=args["box_model"]
        )
        # derive angle-based connectivity graph
        topology.get_graph_w_link_angle()
        # derive interference-based graph
        topology.get_graph_w_interfer(myInterference, myGolay.logger)
        # print
        topology.print_graph(interference=True)
        # get most-to-least interfered sectors
        interfer_links = myInterference.get_interfer_links()
        myGolay.get_golay_w_interfer(
            interfer_links,
            num_of_golay=args["num"],
            ystreet=(not args["no_ystreet"]),
            weight=args["weight"],
        )
    else:
        # derive connectivity graph
        # (even w/o GPS, stil need connectivity graph to start)
        # format:
        #   {link_name: {(adjacent_link_1, their_angle_difference), ...}, ...}
        topology.get_graph_w_link_angle()
        # print it
        topology.print_graph()
        # get worst link: just use the first one in graph
        worst_link = next(iter(topology.graph))
        # derive initial Golay code assignment (based on angles)
        myGolay.get_golay_w_angle(
            worst_link,
            num_of_golay=args["num"],
            ystreet=(not args["no_ystreet"]),
            accurate_gps=(not args["no_gps"]),
            weight=args["weight"],
        )

    # print the golay assignment
    myGolay.print_golay()

    # apply the new golay assignment to the loaded topology
    myGolay.apply_golay()

    # write to new file
    if args["outfolder"] is not None:
        myGolay.logger.note("Generating new topology config file...")
        folder = topology_fp.rstrip(".json").split("/")[-1]
        topology.dump_topology(
            "{0}/{1}_new_golay.json".format(args["outfolder"], folder)
        )


def main():
    """
    Golay Code Assignment Argparser
    """
    parser = argparse.ArgumentParser(description="Golay Code Assignment Tool")
    parser.add_argument("topology_fp", help="topology file path")
    parser.add_argument(
        "--outfolder", "-o", action="store", default=None, help="output folder path"
    )
    parser.add_argument(
        "--num", action="store", type=int, default=2, help="number of golay code"
    )
    parser.add_argument(
        "--no-ystreet",
        action="store_true",
        default=False,
        help="Whether assuming Y-street",
    )
    parser.add_argument(
        "--no-gps",
        action="store_true",
        default=False,
        help="Whether assuming accurate GPS",
    )
    parser.add_argument(
        "--weight",
        action="store",
        default=10,
        help="Tuning parameter for improving assignment",
    )
    parser.add_argument(
        "-i",
        action="store_true",
        default=False,
        help="Whether based on interference prediction (w/ GPS)",
    )
    parser.add_argument(
        "--num_iter",
        action="store",
        type=int,
        default=5,
        help="Define num of iterations to let predicted INR and TPC converge",
    )
    parser.add_argument(
        "--box_model",
        action="store_true",
        default=False,
        help="Whether use box model to predict or not",
    )
    try:
        args = vars(parser.parse_args())
    except BaseException:
        sys.exit()
    if args["outfolder"] is not None and not os.path.isdir(args["outfolder"]):
        print("Output folder does not exist!")
        sys.exit()
    initial_golay_assignment(args)


if __name__ == "__main__":
    main()
