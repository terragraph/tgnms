from __future__ import absolute_import, division, print_function, unicode_literals

import sys
import time
import traceback

import requests
from paramiko import client
from validation import Validation


def write_data_to_scuba(results):
    """
    write data to scuba graph.facebook.com/scribe_logs
    """
    print("Writing data to scuba")
    now_time = int(time.time())
    data = "["
    count = 0
    for result in results:
        normalize_data = {}
        normalize_data["normal"] = {}
        normalize_data["int"] = {}
        normalize_data["int"]["time"] = now_time
        print(result)
        for key, value in result.items():
            if type(value) is str:
                print(value)
                table = str.maketrans(dict.fromkeys("[]\",'"))
                normalize_data["normal"][key] = (value.translate(table)).strip("\n")
            elif type(value) in (dict, list):
                print(value)
                table = str.maketrans(dict.fromkeys("[]\",'"))
                normalize_data["normal"][key] = str(value).translate(table)
            elif type(value) is int:
                normalize_data["int"][key] = value
        normalize_data = str(normalize_data).replace("'", '\\"')
        node_data = (
            '{{"message":"{}","category":'
            '"perfpipe_terragraph_network_analyzer"}}'.format(normalize_data)
        )
        if not count:
            data += node_data
            count = 1
        else:
            data = data + "," + node_data
    data = data + "]"
    print(data)
    payload = (
        ("access_token", "1006525856036161|926a09b493836a08e9d91093a5ca9f23"),
        ("logs", data),
    )
    r = requests.post("https://graph.facebook.com/scribe_logs", data=payload)
    print(r.json())


class NetworkTests:
    def __init__(self, **kwargs):
        try:
            self.links = []
            self.ctrl_client = None
            self.time_out = kwargs["time_out"]
            self.controller = kwargs["controller"]
            self.test_setup = kwargs["test_setup"]
            self.nodes_info = {}
            self.no_online_nodes = 0
            self.no_alive_links = 0
            self.software_version = ""
            self.initialize_setup()
            self.networkValidator = Validation(
                kwargs["networkValidation"],
                self.ctrl_client,
                self.nodes_info,
                len(self.nodes_info) - self.no_online_nodes,
                len(self.links) - self.no_alive_links,
            )

        except KeyError as e:
            print("Error:test parameters are not defined" " correctly: {}".format(e))
            traceback.print_exc(file=sys.stdout)
            sys.exit(1)

    def initialize_setup(self):
        self.ctrl_client = client.SSHClient()
        self.ctrl_client.set_missing_host_key_policy(client.AutoAddPolicy())
        self.ctrl_client.connect(
            self.controller["ip"],
            username=self.controller["username"],
            password=self.controller["password"],
            look_for_keys=False,
        )
        self.get_nodes_info()
        self.get_link_info()
        self.get_software_version()

    def get_nodes_info(self):
        print("INFO: getting node info from controller")
        # retrieve all nodes and node_info in the topology from controller
        stdin, stdout, stderr = self.ctrl_client.exec_command(
            "sudo chroot /opt/rootfs tg topology ls | sed -n -e "
            "'/MacAddr/,/LinkName/p' | sed -e '1,2d' | "
            "sed '$ d' | sed '$ d'"
        )
        data = stdout.readlines()
        for line in data:
            node_info = line.split()
            node = {}
            if "ONLINE" in node_info[4]:
                self.no_online_nodes += 1
            node["MacAddr"] = node_info[1]
            if "True" in node_info[2]:
                print(node_info)
                node["PopNode"] = True
            else:
                node["PopNode"] = False
            node["status"] = node_info[4]
            node["NodeType"] = node_info[3]
            node["IsPrimary"] = node_info[5]
            node["SiteName"] = node_info[6]
            self.nodes_info[node_info[0]] = node

        print(
            "INFO: Only {}/{} nodes are online".format(
                self.no_online_nodes, len(self.nodes_info)
            )
        )
        # get inband ips of all nodes from controller
        stdin, stdout, stderr = self.ctrl_client.exec_command(
            "sudo chroot /opt/rootfs tg status | sed -e '1,3d'"
        )
        data = stdout.readlines()
        for line in data:
            node_name = line.split()[0]
            if node_name in self.nodes_info.keys():
                self.nodes_info[node_name]["inband_ip"] = line.split()[1]

    def get_link_info(self):
        # Get all links and their info from controller
        stdin, stdout, stderr = self.ctrl_client.exec_command(
            "sudo chroot /opt/rootfs tg link ls | grep link"
        )
        links = stdout.readlines()
        for link_info in links:
            link = {}
            link_info = link_info.split()
            link["name"] = link_info[0]
            link["initiator"] = link_info[1]
            link["responder"] = link_info[2]
            link["status"] = link_info[3]
            self.links.append(link)
            if "True" in link_info[3]:
                self.no_alive_links += 1
        print("{}/{} links are alive".format(self.no_alive_links, len(self.links)))

    def get_software_version(self):
        # get all software versions on nodes
        stdin, stdout, stderr = self.ctrl_client.exec_command(
            "sudo chroot /opt/rootfs tg status | "
            "awk '{print $7$8$9$19$11$12$13$14}' | grep RELEASE| sort -u"
        )
        output = stdout.readlines()
        software_ver = {}
        for line in output:
            if line not in software_ver.keys():
                software_ver[line] = 1
            else:
                software_ver[line] += 1
        max_value = max(software_ver.values())
        for version, no_of in software_ver.items():
            if no_of == max_value:
                self.software_version = version

    def test(self, **kwargs):
        # Run specified test
        pass

    def run_test(self, **kwargs):
        result = {
            "test_tag": kwargs["test_type"],
            "test_setup": self.test_setup,
            "test_status": "",
            "software_version": self.software_version,
        }
        validation_result = self.networkValidator.validate_network()
        if validation_result["test_status"] == "FAIL":
            print("ERROR: network validation fails test cannot be running")
            print(
                "ERROR: {} nodes are offline and {}"
                " links are down".format(
                    validation_result["no_of_links_down"],
                    validation_result["no_of_offline_nodes"],
                )
            )
            result["no_of_links_down"] = validation_result["no_of_links_down"]
            result["no_of_offline_nodes"] = validation_result["no_of_offline_nodes"]
            sys.exit(1)
        result.update(self.test(**kwargs))
        if result["test_status"] == "FAIL":
            sys.exit()
