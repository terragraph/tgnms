#!/usr/bin/env python3

import argparse

# built-ins
import os
import shutil
import sys
import tarfile
import threading
import time


# modules
sys.path.append("../")
try:
    import modules.util.remote.cmd as CMD
    from modules.addon_terminal_color import colorString
    from modules.util.remote.base import spawn_new_login
    from modules.util_fw_config_cmd import FWConfigModder, show_help
    from tool.self_test import finalize_param, get_param
except BaseException:
    raise

# backward compatible to Python2
try:
    from builtins import input

    raw_input = input
except ImportError:
    input = raw_input

# global param
MULTI_THREAD_LOCK = threading.Lock()


def connect_to_each_node(__c, node, node_ip, connections):
    # login this node
    print("connect_to_each_node")
    config_obj = spawn_new_login(
        __c.params, loggerTag="{0}.config".format(node), printout=False
    )
    if config_obj is not None:
        try:
            # login to the desired node and continue
            if config_obj.connect(
                node_ip,
                username=config_obj.params["username"],
                password=config_obj.params["password"],
                authkey=config_obj.params["authkey"],
            ):
                MULTI_THREAD_LOCK.acquire()
                connections[node] = config_obj
                MULTI_THREAD_LOCK.release()
                return
        except BaseException as ex:
            __c.logger.error(ex)
        config_obj.close_all()
        config_obj.logger.off()
    else:
        config_obj.logger.error("Problem to login for {0}!".format(node))
    connections[node] = None


def close_each_node(config_obj):
    try:
        config_obj.close_all()
        config_obj.logger.off()
    except BaseException as ex:
        config_obj.logger.error(ex)


def close_all_nodes(__c, connections):
    __c.logger.note("Exiting all nodes..")
    threads = []
    for node in connections:
        if connections[node] is None:
            continue
        my_thread = threading.Thread(target=close_each_node, args=(connections[node],))
        threads.append(my_thread)
        my_thread.start()
    [t.join() for t in threads]


def connect_to_all_nodes(__c, args):
    connected_nodes = {}
    threads = []
    for node in __c.topology.get_all_nodes(withMAC=True, withIP=True):
        # get node inband ip
        node_ip = __c.topology.get_ip(node, inband=True)
        if node_ip is None:
            connected_nodes[node] = None
            continue
        if len(threads) > args["pnum"]:
            for t in threads:
                t.join()
            del threads[:]
        my_thread = threading.Thread(
            target=connect_to_each_node, args=(__c, node, node_ip, connected_nodes)
        )
        threads.append(my_thread)
        my_thread.start()
    for t in threads:
        t.join()
    del threads[:]
    return connected_nodes


def validate_connections(__c, connections):
    nodes_not_connected = []
    nodes_connected = []
    for node in connections:
        if connections[node] is None:
            nodes_not_connected.append(node)
        else:
            nodes_connected.append(node)
    __c.logger.debug(
        "{0} are not connected".format(", ".join(sorted(nodes_not_connected)))
    )
    __c.logger.debug("{0} are connected".format(", ".join(sorted(nodes_connected))))
    # clean up those failed connected
    for node in nodes_not_connected:
        del connections[node]


def interactive_shell(__c, connected_nodes, fw_configs, args_to_run=""):
    print("type `help` to see available commands")
    print(
        colorString(
            "a total of {0} nodes are connected".format(len(connected_nodes)),
            color="blue",
        )
    )
    print(", ".join(connected_nodes.keys()))
    myModder = FWConfigModder(
        logPathDir=__c.params["output_folder"],
        connected_nodes=connected_nodes,
        fw_configs=fw_configs,
    )
    if args_to_run:
        myModder.run(args_to_run)
    else:
        while 1:
            try:
                cmd = input("CMD >> ")
                if cmd.lower() == "quit" or cmd.lower() == "exit":
                    break
                myModder.run(cmd)
                if "restart all" in cmd:
                    break
            except (KeyboardInterrupt, EOFError):
                break
            except BaseException as ex:
                __c.logger.error(ex)
    myModder.dump_mod_history()


def config_mod_action(__c, args):
    print(colorString("Preloading fw_config..", color="darkcyan"))
    # get all fw_config first
    __outfp, fw_config_results = CMD.fetch_fw_config_all(
        __c, parallel=True, pnum=args["pnum"]
    )
    print(colorString("Connecting nodes..", color="darkcyan"))
    # log into all nodes
    __c.logger.info("Getting into all nodes..")
    connected_nodes = connect_to_all_nodes(__c, args)
    validate_connections(__c, connected_nodes)
    interactive_shell(__c, connected_nodes, fw_config_results, args["run"])
    # exit all nodes
    if connected_nodes:
        close_all_nodes(__c, connected_nodes)
        if not args["run"]:
            # get all fw_config in the end
            __outfp, fw_config_results = CMD.fetch_fw_config_all(
                __c, parallel=True, pnum=args["pnum"]
            )


def config_mod_wrapper(args):
    """
    end-to-end wrapper for config mod
    """
    if args["run"] == "help":
        show_help()
        return True
    # setup parameters
    myParams = get_param(args, tool="config_mod")
    if not myParams:
        return False
    # mkdir
    if not os.path.isdir(myParams["output_folder"]):
        try:
            os.makedirs(myParams["output_folder"])
        except BaseException:
            raise
    # login
    myController = spawn_new_login(
        myParams,
        loggerTag="CONTROLLER",
        printout=args["verbose"],
        destination="controller",
    )
    if myController is None:
        print("Err: no login spawned")
        return False
    # get topology
    status = myController.get_topology(args["topology"])
    if not status:
        myController.logger.error("cannot load topology correctly")
        myController.close_all()
        return False
    # start config mod
    config_mod_action(myController, args)
    # close all
    myController.close_all()
    finalize_param(myParams, args, tool="config_mod")
    if args["tar"]:
        with tarfile.open(
            "{0}/{1}.tar.gz".format(args["outfolder"], int(time.time() * 1000)), "w:gz"
        ) as tar:
            tar.add(
                myParams["output_folder"],
                arcname=os.path.basename(myParams["output_folder"]),
            )
            shutil.rmtree(myParams["output_folder"])
    return True


def main():
    """
    Config Mod Argparser
    """
    parser = argparse.ArgumentParser(description="Config Modification Tool")
    parser.add_argument("name", help="network name")
    parser.add_argument(
        "--topology",
        "-tp",
        action="store",
        default=None,
        help=(
            "topology file path, "
            + "if not set, will automatically fetch it from controller"
        ),
    )
    parser.add_argument(
        "--outfolder",
        "-o",
        action="store",
        default="/tmp/",
        help="log folder path, default is /tmp/",
    )
    parser.add_argument(
        "--devserver",
        action="store_true",
        default=False,
        help="run the script on devserver",
    )
    parser.add_argument(
        "--controller",
        action="store_true",
        default=False,
        help=(
            "run the script on controller "
            + "(make sure you can run `ssh localhost` there)"
        ),
    )
    parser.add_argument(
        "--tar",
        action="store_true",
        default=False,
        help="tar the result folder and remove the folder to save space",
    )
    parser.add_argument(
        "--pnum",
        action="store",
        type=int,
        default=float("inf"),
        help="number of parallel processes; default infinity",
    )
    parser.add_argument(
        "--run",
        action="store",
        default="",
        help=(
            "type `--run help` to see available commands;"
            + "if not set, go into interactive mode"
        ),
    )
    parser.add_argument(
        "--verbose",
        "-v",
        action="store_true",
        default=False,
        help="enable verbose mode",
    )
    try:
        args = vars(parser.parse_args())
    except BaseException:
        sys.exit()
    if args["outfolder"] is not None and not os.path.isdir(args["outfolder"]):
        print("Output folder does not exist!")
        sys.exit()
    config_mod_wrapper(args)


if __name__ == "__main__":
    main()
