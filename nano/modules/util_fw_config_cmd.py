#!/usr/bin/env python3

# built-ins
import os
import threading
import time

from modules.addon_misc import convert2Bool, dump_result

# modules
from modules.util_logger import EmptyLogger


# backward compatible to Python2
try:
    from builtins import input

    raw_input = input
except ImportError:
    input = raw_input


# global param
MULTI_THREAD_LOCK = threading.Lock()


class FWConfigModder(object):
    """
    FW Config modification module to check and change fw_config.json in nodes
    """

    def __init__(self, logPathDir, connected_nodes, fw_configs):
        self.logPathDir = logPathDir
        logpath_r = "{0}/log/".format(logPathDir)
        if not os.path.isdir(logpath_r):
            try:
                os.makedirs(logpath_r)
            except BaseException:
                logpath_r = logPathDir
        self.logger = EmptyLogger(
            "ConfigModder",
            logPath="{0}/log/tg_ModLog_{1}.log".format(logPathDir, int(time.time())),
            printout=True,
        )
        self.connected_nodes = connected_nodes
        self.fw_configs = fw_configs
        self.first_set = {}
        for node in self.connected_nodes:
            self.first_set[node] = True
        self.supported_config_keys = derive_supported_keys(fw_configs)
        self.mod_history = {}  # only mod changes are stored

    def _show_each(self, node, param):
        if not param:
            fw_config = self.connected_nodes[node].fetch_fw_config()
            print_config(fw_config)
        else:
            fw_config = self.connected_nodes[node].fetch_fw_config()
            for category in self.supported_config_keys[param[0]]:
                if category not in fw_config or param[0] not in fw_config[category]:
                    self.logger.error("{0} does not have it".format(node))
                    self._show_each(node, [])
                else:
                    self.logger.debug(
                        "in {0}, currently {1} -> {2} is {3}".format(
                            node, category, param[0], fw_config[category][param[0]]
                        )
                    )

    def show_config(self, args):
        if not args:
            self.logger.note("must specify `all` or a node name:")
            self.logger.info(", ".join(self.connected_nodes.keys()))
            return
        elif not args[0] == "all" and args[0] not in self.connected_nodes:
            self.logger.error("{0} not recognized".format(args[0]))
            self.logger.info(", ".join(self.connected_nodes.keys()))
            return
        elif args[0] == "all" and not args[1:]:
            self.logger.error("For all, must specify a param name:")
            self.logger.info(", ".join(self.supported_config_keys.keys()))
            return
        elif len(args) > 1 and args[1] not in self.supported_config_keys:
            self.logger.error("{0} not recognized".format(args[1]))
            self.logger.info(", ".join(self.supported_config_keys.keys()))
            return
        threads = []
        for node in self.connected_nodes:
            if not args[0] == "all" and not node == args[0]:
                continue
            my_thread = threading.Thread(target=self._show_each, args=(node, args[1:]))
            threads.append(my_thread)
            my_thread.start()
        [t.join() for t in threads]

    def _restore_each(self, node):
        self.logger.info("restoring on {0}..".format(node))
        if self.connected_nodes[node].recover_fw_config():
            self.logger.note("{0} succeeded".format(node))
            # clear mod history as everything is restored
            MULTI_THREAD_LOCK.acquire()
            del self.mod_history[node]
            MULTI_THREAD_LOCK.release()
        else:
            self.logger.error("{0} failed".format(node))

    def restore_config(self, args):
        if not args or not (args[0] == "all" or args[0] in self.connected_nodes):
            self.logger.note("must specify `all` or a node name:")
            self.logger.info(", ".join(self.connected_nodes.keys()))
            return
        resp = input("Confirm restore for {0}? [y/N] ".format(args[0]))
        if convert2Bool(resp):
            threads = []
            for node in self.connected_nodes:
                if not args[0] == "all" and not node == args[0]:
                    continue
                my_thread = threading.Thread(target=self._restore_each, args=(node,))
                threads.append(my_thread)
                my_thread.start()
            [t.join() for t in threads]

    def _set_val_each(self, node, category, key, new_val):
        self.show_config([node, key])
        self.logger.info("changing on {0}..".format(node))
        if self.connected_nodes[node].set_fw_config(
            category, key, new_val, backup=self.first_set[node]
        ):
            self.logger.note("{0} succeeded".format(node))
        else:
            self.logger.error("{0} failed".format(node))
        MULTI_THREAD_LOCK.acquire()
        if node not in self.mod_history:
            self.mod_history[node] = []
        self.mod_history[node].append((int(time.time() * 1000), category, key, new_val))
        self.first_set[node] = False
        MULTI_THREAD_LOCK.release()
        self.show_config([node, key])

    def _set_val(self, target, category, key, new_val):
        threads = []
        for node in self.connected_nodes:
            if not target == "all" and not node == target:
                continue
            my_thread = threading.Thread(
                target=self._set_val_each, args=(node, category, key, new_val)
            )
            threads.append(my_thread)
            my_thread.start()
        [t.join() for t in threads]

    def _restart_each(self, node, restart_cmd, sleepT=10):
        self.logger.info("Restarting {0} {1}".format(node, restart_cmd))
        if restart_cmd == "minion" and not self.connected_nodes[node].restart_minion(
            sleepT=sleepT
        ):
            self.logger.error("Failed to restart {0}".format(node))
            return
        elif restart_cmd == "reboot" and not self.connected_nodes[node].reboot(
            sleepT=sleepT
        ):
            self.logger.error("Failed to reboot {0}".format(node))
            return
        self.connected_nodes[node].close_all()

    def restart(self, args):
        supported_restart_cmd = ["minion", "reboot"]
        if not args or not (args[0] == "all" or args[0] in self.connected_nodes):
            self.logger.note("must specify `all` or a node name:")
            self.logger.info(", ".join(self.connected_nodes.keys()))
            return
        if len(args) < 2 or args[1] not in supported_restart_cmd:
            self.logger.note("must specify one of following:")
            self.logger.info(", ".join(supported_restart_cmd))
            return
        threads = []
        for node in self.connected_nodes:
            if not args[0] == "all" and not node == args[0]:
                continue
            my_thread = threading.Thread(
                target=self._restart_each, args=(node, args[1])
            )
            threads.append(my_thread)
            my_thread.start()
        [t.join() for t in threads]
        # remove everyone if everyone is restarted
        if args[0] == "all":
            del self.connected_nodes[:]
            self.logger.note(
                "Please exit and wait patiently for all nodes coming back."
            )
        # otherwise only remove the one we restarted
        else:
            del self.connected_nodes[args[0]]

    def set_config(self, args):
        if not args or not (args[0] == "all" or args[0] in self.connected_nodes):
            self.logger.note("must specify `all` or a node name:")
            self.logger.info(", ".join(self.connected_nodes.keys()))
            return
        if len(args) < 2 or args[1] not in self.supported_config_keys:
            self.logger.note("must specify one of key names to change:")
            self.logger.info(", ".join(self.supported_config_keys.keys()))
            return
        categories = self.supported_config_keys[args[1]]
        category = categories[0]
        if len(categories) > 1:
            for i in range(len(categories)):
                self.logger.info("{0}: {1}".format(i, categories[i]))
            try:
                val = int(input("Which one to change >> "))
            except BaseException as ex:
                self.logger.error(ex)
                return
            if val not in range(len(categories)):
                self.logger.note("Input index out of range. Stopped")
                return
            category = categories[i]
        try:
            if len(args) < 3:
                new_val = int(
                    input("Change {0} -> {1} to >> ".format(category, args[1]))
                )
            else:
                new_val = int(args[2])
            resp = input(
                "Make ({0} -> {1}) {2} for {3}? [y/N] ".format(
                    category, args[1], new_val, args[0]
                )
            )
            if convert2Bool(resp):
                self._set_val(args[0], category, args[1], new_val)
        except BaseException as ex:
            self.logger.error(ex)

    def _run_remote_cmd_each(self, node, command):
        self.logger.info("running cmd `{0}` on {1}".format(command, node))
        resp = self.connected_nodes[node].write(command)
        if resp[0] == "err":
            return
        print("\n".join(resp[1:]))

    def run_remote_cmd(self, args):
        if not args:
            self.logger.note("must specify `all` or a node name:")
            self.logger.info(", ".join(self.connected_nodes.keys()))
            return
        elif not args[0] == "all" and args[0] not in self.connected_nodes:
            self.logger.error("{0} not recognized".format(args[0]))
            self.logger.info(", ".join(self.connected_nodes.keys()))
            return
        elif not args[1:]:
            self.logger.error("Must specify what command to run")
            return
        resp = input(
            "Confirm to run `{0}` for {1}? [y/N] ".format(" ".join(args[1:]), args[0])
        )
        if convert2Bool(resp):
            threads = []
            for node in self.connected_nodes:
                if not args[0] == "all" and not node == args[0]:
                    continue
                my_thread = threading.Thread(
                    target=self._run_remote_cmd_each, args=(node, " ".join(args[1:]))
                )
                threads.append(my_thread)
                my_thread.start()
            [t.join() for t in threads]

    def _run_cmd(self, cmd, args):
        if cmd == "show":
            self.show_config(args)
        elif cmd == "set":
            self.set_config(args)
        elif cmd == "restore":
            self.restore_config(args)
        elif cmd == "cmd":
            self.run_remote_cmd(args)
        elif cmd == "restart":
            self.restart(args)
        elif cmd == "params":
            print(", ".join(self.supported_config_keys.keys()))
        elif cmd in self.supported_config_keys:
            print("{0} means {1}".format(cmd, explain(cmd)))
        else:
            self.logger.error("`{0}` not recognized".format(cmd))
            show_help()

    def run(self, cmd):
        if not cmd:
            return
        self.logger.debug(cmd)
        if cmd.lower() == "help" or cmd.lower() == "h":
            show_help()
            return
        tmp = cmd.split()
        command = tmp[0]
        args = tmp[1:]
        self._run_cmd(command, args)

    def dump_mod_history(self):
        out_fp_no_suffix = "{0}/fw_config_mod_history".format(self.logPathDir)
        dump_result(out_fp_no_suffix, self.mod_history, use_pickle=True)


def derive_supported_keys(fw_configs):
    supported_keys = {}
    for node in fw_configs:
        fw_config = fw_configs[node]
        for category in fw_config:
            for key in fw_config[category]:
                if key not in supported_keys:
                    supported_keys[key] = []
                if category not in supported_keys[key]:
                    supported_keys[key].append(category)
    return supported_keys


def show_help():
    print("Help Menu")
    print("Supported commands:")
    print("* show <node_name> [param_name]")
    print("** can also do `show all <param_name>`")
    print("* set <node_name> <param_name> [val]")
    print("** can also do `set all <param_name>`")
    print("* recover <node_name, all>")
    print("* restart <node_name, all> <minion, reboot>")
    print("* cmd <node_name> command")
    print("** can also do `cmd all command`")
    print("** e.g., `cmd all ls -lah`")
    print("* params - print out supported parameters in fw_config")


def print_config(fw_config):
    if not fw_config or fw_config is None:
        print("N/A")
        return
    for category in fw_config:
        print("- {0}".format(category))
        for key in fw_config[category]:
            words = "|- {0} : {1}".format(key, fw_config[category][key])
            if not explain(key) == "N/A":
                words += " // meaning: {0}".format(explain(key))
            print(words)


def explain(key_name):
    if key_name == "antCodeBook":
        return "which antenna codebook to use"
    elif key_name == "txPower":
        return "transmit power index (between 0 and 28)"
    else:
        return "N/A"
