from __future__ import absolute_import, division, print_function, unicode_literals

import json
import time

from NetworkTests import NetworkTests, write_data_to_scuba
from validation import Validation


class NetworkIgnition(NetworkTests):
    def __init__(self, **kwargs):
        NetworkTests.__init__(self, **kwargs)
        self.validation_args = kwargs["networkValidation"]
        stdin, stdout, stderr = self.ctrl_client.exec_command(
            "sudo chroot /opt/rootfs tg link ls | grep link-"
        )
        self.initial_linkup_attempts = {}
        links = stdout.readlines()
        for link_info in links:
            link_up_attempts = link_info.split()[5]
            self.initial_linkup_attempts[link_info.split(" ")[0]] = int(
                link_up_attempts
            )

    def test(self, **kwargs):
        print("INFO: Validation network before ignition test is run ...")
        result = []
        if not self.networkValidator.validate_network():
            print("ERROR: Initial network validation fails, " "test cannot be run")
            result["test_status"] = "FAIL"
            return result
        print("INFO:Starting ignition test round {} ...".format(kwargs["round_no"]))
        print("INFO: Performing network wide reboot")
        stdin, stdout, stderr = self.ctrl_client.exec_command(
            "sudo chroot /opt/rootfs tg node reboot --delay 10"
        )
        print(stdout.readlines())
        # wait 'hold_time before validating network
        time.sleep(kwargs["hold_time"])
        ignition_start = time.time()
        self.ignitionValidator = IgnitionValidation(
            self.validation_args,
            self.ctrl_client,
            self.nodes_info,
            len(self.nodes_info) - self.no_online_nodes,
            len(self.links) - self.no_alive_links,
            ignition_start,
            self.initial_linkup_attempts,
        )
        result = self.ignitionValidator.validate_network()
        result["network_ignition_time"] = int(time.time() - ignition_start)
        if result["test_status"] == "FAIL":
            print("ERROR: Network validation fails after networkwide reboot")
            print("ERROR: ignition test fails on round {}".format(kwargs["round_no"]))
            return result
        print("INFO: ignition tests Passes fro round {}".format(kwargs["round_no"]))
        return result


class IgnitionValidation(Validation):
    def __init__(
        self,
        validation_config,
        controller_client,
        nodes_info,
        no_offline_nodes,
        no_down_links,
        start_time,
        initial_linkup_attempts,
    ):
        Validation.__init__(
            self,
            validation_config,
            controller_client,
            nodes_info,
            no_offline_nodes,
            no_down_links,
        )
        self.start_time = start_time
        self.current_node_status = {}
        self.current_link_status = {}
        self.initial_linkup_attempts = initial_linkup_attempts

    def get_linkup_attempts(self, link_name):
        stdin, stdout, stderr = self.controller_client.exec_command(
            "sudo chroot /opt/rootfs tg link ls | grep {}".format(link_name)
        )
        link_info = stdout.readlines()
        link_up_attempts = link_info[0].split()[5]
        return link_up_attempts

    def update_network_status(self):
        now_time = int(time.time())
        node_status = []
        link_status = []
        for node_name in self.current_node_status.keys():
            node_status.append(
                {
                    "time": now_time,
                    "test_tag": "ignition_test",
                    "Node": node_name,
                    "node_status": self.current_node_status[node_name],
                }
            )
        write_data_to_scuba(node_status)

        for link_name in self.current_link_status.keys():
            link_status.append(
                {
                    "time": now_time,
                    "test_tag": "ignition_test",
                    "Link": link_name,
                    "link_status": self.current_link_status[link_name]["status"],
                    "ignition_time": self.current_link_status[link_name][
                        "ignition_time"
                    ],
                }
            )
        write_data_to_scuba(link_status)

    def update_visualizer(self):
        with open("/home/nishita/www/visual_map/linkJsonData.json") as links:
            linkDataJson = json.load(links)
        links = linkDataJson["features"]

        updated_links = []
        for link_info in links:
            if link_info["id"] in self.current_link_status.keys():
                content = (
                    "<ul>\n<li>Ignition time: {}</li>\n<li>Ignition attempts: {}"
                    "</li>\n</ul>\n".format(
                        self.current_link_status[link_info["id"]]["ignition_time"],
                        self.current_link_status[link_info["id"]]["ignition_attempts"],
                    )
                )
                link_info["info"]["content"] = content
                if self.current_link_status[link_info["id"]]["status"] == 1:
                    if (
                        self.current_link_status[link_info["id"]]["ignition_attempts"]
                        < 2
                    ):
                        link_info["properties"]["style"]["color"] = "#4CAF50"
                    elif (
                        1
                        < self.current_link_status[link_info["id"]]["ignition_attempts"]
                        < 6
                    ):
                        link_info["properties"]["style"]["color"] = "#67C8FF"
                    elif (
                        5
                        < self.current_link_status[link_info["id"]]["ignition_attempts"]
                        < 11
                    ):
                        link_info["properties"]["style"]["color"] = "#FFC107"
                    else:
                        link_info["properties"]["style"]["color"] = "#F44336"
                else:
                    link_info["properties"]["style"]["color"] = "#F44336"
                updated_links.append(link_info)
            else:
                updated_links.append(link_info)
        linkDataJson["features"] = updated_links
        with open("../www/linkJsonDataIgnition.json", "w") as outfile:
            json.dump(linkDataJson, outfile)
        linkDataJson_str = "var linkJsonDataIgnition = {};".format(str(linkDataJson))
        with open("../www/linkJsonDataIgnition.js", "w") as text_file:
            text_file.write(linkDataJson_str)

    def pop_reachability(self):
        runtime = 0
        success = 0
        self.link_ignition_info = {}
        self.result["links_down"] = []
        self.result["nodes_offline"] = []
        self.result["no_of_links_down"] = self.no_down_links
        self.result["no_of_offline_nodes"] = 0
        self.result["total_no_of_links"] = 0

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
                node_name = node_status.split()[0]
                if "ONLINE" not in node_status:
                    unrechable_nodes.append(node_status.split()[0])
                    self.current_node_status[node_name] = 0
                else:
                    self.current_node_status[node_name] = 1
            # retreive link status from controller
            stdin, stdout, stderr = self.controller_client.exec_command(
                "sudo chroot /opt/rootfs tg link ls"
                " | grep link | awk '{print $1\" \"$4}'"
            )
            linkStatus_info = stdout.readlines()
            self.result["total_no_of_links"] = len(linkStatus_info)
            # check if all nodes are online
            for link_status in linkStatus_info:
                link_name = link_status.split()[0]
                if link_name not in self.current_link_status.keys():
                    self.current_link_status[link_name] = {}
                    self.current_link_status[link_name]["status"] = 0
                    self.current_link_status[link_name]["ignition_time"] = 0
                    self.current_link_status[link_name]["ignition_attempts"] = 0

                if ("True" in link_status) and (
                    self.current_link_status[link_name]["status"] == 0
                ):
                    self.current_link_status[link_name]["status"] = 1
                    self.current_link_status[link_name]["ignition_time"] = (
                        time.time() - self.start_time
                    )
                    current_linkup_attempts = int(self.get_linkup_attempts(link_name))
                    self.current_link_status[link_name]["ignition_attempts"] = (
                        current_linkup_attempts
                        - self.initial_linkup_attempts[link_name]
                    )

            if (len(unrechable_nodes) > self.no_offline_nodes) or (
                len(down_links) > self.no_down_links
            ):
                log = "INFO:{}/{} nodes are not " " reachable. trying again ..".format(
                    len(unrechable_nodes), len(self.nodes_info)
                )
                print(log)
                print(
                    "WARNING: {} links are down, "
                    "trying again ...".format(len(down_links))
                )
                runtime = time.time() - self.start_time
                continue
            print(
                "INFO: All {} nodes are online".format(
                    len(self.nodes_info) - self.no_offline_nodes
                )
            )
            print(
                "INFO: All {} links"
                " are alive".format(len(linkStatus_info) - len(down_links))
            )
            success = 1
            break
        if success == 0:
            # retreive link status from controller
            stdin, stdout, stderr = self.controller_client.exec_command(
                "sudo chroot /opt/rootfs tg link ls"
                " | grep link | awk '{print $1\" \"$4}'"
            )
            linkStatus_info = stdout.readlines()
            # check if all nodes are online
            for link_status in linkStatus_info:
                link_name = link_status.split()[0]
                if "True" not in link_status:
                    down_links.append(link_name)
                    self.current_link_status[link_name]["status"] = 0
                    self.current_link_status[link_name]["ignition_time"] = "NA"
                    self.current_link_status[link_name]["ignition_attempts"] = (
                        int(self.get_linkup_attempts(link_name))
                        - self.initial_linkup_attempts[link_name]
                    )

        self.update_visualizer()
        # self.update_network_status()

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
