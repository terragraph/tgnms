from __future__ import absolute_import, division, print_function, unicode_literals

import time
import traceback

from paramiko import client
from pssh.pssh_client import ParallelSSHClient


class Validation:
    def __init__(
        self,
        validation_config,
        controller_client,
        nodes_info,
        no_offline_nodes,
        no_down_links,
    ):
        self.nodes_info = nodes_info
        self.node_ips = []
        self.no_offline_nodes = no_offline_nodes
        self.no_down_links = no_down_links
        for node in self.nodes_info.keys():
            if "inband_ip" in self.nodes_info[node].keys():
                self.node_ips.append(self.nodes_info[node]["inband_ip"])
            else:
                self.nodes_info[node]["inband_ip"] = "null"
        self.controller_client = controller_client
        self.timeout = int(validation_config["timeout"])
        self.validation_conds = validation_config["validations"]
        self.conditions_dict = {
            "not contain": lambda args: args[1][0] not in args[0],
            "contain": lambda args: args[1][0] in args[0],
            "equal": (
                lambda args: (
                    (int(args[0]) == (len(self.node_ips) - args[1][1]))
                    if args[2]
                    else (int(args[0]) == (len(self.node_ips) - args[1][0]))
                )
            ),
        }

    def exec_cmd_on_node(self, host, cmd):
        try:
            node_client = client.SSHClient()
            node_client.set_missing_host_key_policy(client.AutoAddPolicy())
            node_client.connect(
                host, username="root", password="facebook", look_for_keys=False
            )
            stdin, stdout, stderr = node_client.exec_command(cmd)
        except Exception as e:
            print(
                "Error: unable to connect to host"
                " {} to run cmd {}: {}".format(host, cmd, e)
            )
            return None
        if stdout:
            output = stdout.read().strip()
            return output.decode()
        else:
            error_log = (
                "unable to execute cmd {} on node {} ,"
                "failed with error: {}".format(cmd, host, stderr)
            )
            print(error_log)
            return None

    def validate_network(self):
        runtime = 0
        start_time = time.time()
        while runtime < self.timeout:
            self.result = {}
            self.result["total_no_of_nodes"] = (
                len(self.nodes_info) - self.no_offline_nodes
            )
            failure_flag = False
            if not self.pop_reachability():
                self.result["test_status"] = "FAIL"
                return self.result
            else:
                self.result["validation_failures"] = []
                for cond in self.validation_conds:
                    if not self.validate_condition(**cond):
                        failure_flag = True
                        print("{} failed".format(cond["name"]))
                    else:
                        print("{} is successful".format(cond["name"]))
            if failure_flag:
                print("WARNING: Network Validation failed trying again ...")
                runtime = time.time() - start_time
            else:
                print("INFO: Network Validation is Successful")
                self.result["test_status"] = "PASS"
                return self.result
        print("ERROR: Network Validation Failed after time out")
        self.result["test_status"] = "FAIL"
        return self.result

    def pop_reachability(self):
        runtime = 0
        success = 0
        self.result["links_down"] = []
        self.result["nodes_offline"] = []
        self.result["no_of_links_down"] = self.no_down_links
        self.result["no_of_offline_nodes"] = 0
        self.result["total_no_of_links"] = 0
        start_time = time.time()
        # Validate all nodes are online before running further validations
        while runtime < self.timeout:
            down_links = []
            # Retreive node status from controller
            stdin, stdout, stderr = self.controller_client.exec_command(
                "sudo chroot /opt/rootfs tg topology ls "
                "| sed -n -e '/MacAddr/,/LinkName/p' | "
                "sed -e '1,2d' | sed '$ d' | sed '$ d'"
            )
            status_info = stdout.readlines()
            unrechable_nodes = []
            # check if nodes are online
            for node_status in status_info:
                if "ONLINE" not in node_status:
                    log = "{} is unreachable".format(node_status.split()[0])
                    print(log)
                    unrechable_nodes.append(node_status.split()[0])
            # retreive link status from controller
            stdin, stdout, stderr = self.controller_client.exec_command(
                "sudo chroot /opt/rootfs tg link ls"
                " | grep link | awk '{print $1\" \"$4}'"
            )
            linkStatus_info = stdout.readlines()
            self.result["total_no_of_links"] = len(linkStatus_info)
            # check if all nodes are online
            for link_status in linkStatus_info:
                if "True" not in link_status:
                    down_links.append(link_status.split()[0])
            if len(unrechable_nodes) > self.no_offline_nodes:
                log = (
                    "WARNING:{}/{} nodes are not "
                    " reachable. trying again ..".format(
                        len(unrechable_nodes), len(self.nodes_info)
                    )
                )
                print(log)
                time.sleep(30)
                runtime = time.time() - start_time
                continue
            print(
                "INFO: All {} nodes are online".format(
                    len(self.nodes_info) - self.no_offline_nodes
                )
            )
            if len(down_links) > self.no_down_links:
                print(
                    "WARNING: {} links are down, "
                    "trying again ...".format(len(down_links))
                )
                runtime = time.time() - start_time
                continue
            else:
                print(
                    "INFO: All {} links"
                    " are alive".format(len(linkStatus_info) - len(down_links))
                )
                success = 1
                break
        if success == 0:
            print(
                "ERROR: Timed out, {}/{} nodes are"
                " offline and {}/{} are not alive!".format(
                    len(unrechable_nodes),
                    len(self.nodes_info),
                    len(down_links),
                    len(linkStatus_info),
                )
            )
            self.result["links_down"] = down_links
            self.result["nodes_offline"] = unrechable_nodes
            self.result["no_of_links_down"] = len(down_links)
            self.result["no_of_offline_nodes"] = len(unrechable_nodes)
            return False
        print("INFO: All Nodes and links in network are up")
        return True

    def validate_condition(self, **kwargs):
        try:
            psshClient = ParallelSSHClient(
                self.node_ips,
                user="root",
                password="facebook",
                timeout=60,
                pool_size=len(self.node_ips),
                allow_agent=False,
            )
            print("running cmd")
            output = psshClient.run_command(kwargs["cmd"])
            print("now")
            # psshClient.join(output)
            while not psshClient.finished(output):
                print("waiting for commands to run ...")
                time.sleep(10)
        except Exception as e:
            print(e)
            traceback.print_exc()
        failure_nodes = []
        try:
            for node_name, info in self.nodes_info.items():
                host = info["inband_ip"]
                if output[host].stdout:
                    node_output = " ".join(list(output[host].stdout))
                    if node_output == "":
                        node_output = self.exec_cmd_on_node(host, kwargs["cmd"])
                        print("node output is empty for {}".format(node_name))
                else:
                    print(
                        "print node output does " "not exsist for {}".format(node_name)
                    )
                    node_output = self.exec_cmd_on_node(host, kwargs["cmd"])
            args = []
            args.append(node_output)
            args.append(kwargs["args"])
            args.append(info["PopNode"])
            print(args)
            print(self.conditions_dict[kwargs["cond"]](args))
            if not self.conditions_dict[kwargs["cond"]](args):
                error_log = "ERROR: {} fails on node {}, output:{}".format(
                    kwargs["cmd"], node_name, node_output
                )
                print(error_log)
                failure_nodes.append(node_name)
                self.result["validation_failures"].append(
                    {
                        "node_name": node_name,
                        "iband_ip": info["inband_ip"],
                        "failure_type": kwargs["cmd"],
                    }
                )
        except UnboundLocalError:
            print(
                "Error: Output could not be " "retreived using pssh, trying again ..."
            )
            return False
        if len(failure_nodes) > 0:
            error_log = "ERROR: {} validation failed on " "{} nodes.".format(
                kwargs["cmd"], len(failure_nodes)
            )
            print(error_log)
            return False
        return True
