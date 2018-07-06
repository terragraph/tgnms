#!/usr/bin/env python3

""" Provide function which can read the topology from the api_service and
    process for topology related configurations.
"""

import os
import requests
import json
import sys

sys.path.append(
    os.path.abspath(os.path.join(os.path.dirname(__file__), "..") + "/interface/gen-py")
)
from facebook.gorilla.Topology.ttypes import LinkType


class TopologyHelper(object):
    """
    Helper functions on the network topology.
    """

    def __new__(cls, analytics_config_file="../AnalyticsConfig.json"):
        """Get the network topology from the api_service.

        Args:
        analytics_config_file: Path to the PyAnalytics.

        Return: TopologyHelper object on success.
                None on failure.
        """

        try:
            with open(analytics_config_file) as local_file:
                analytics_config = json.load(local_file)
        except Exception:
            print("Cannot find the configuration file")
            return None

        if "api_service" not in analytics_config:
            print("Cannot find api_service config in the configurations")
            return None
        else:
            instance = super().__new__(cls)
            print("TopologyHelper object created")
            instance._api_service_config = analytics_config["api_service"]
            return instance

    def get_topology_from_api_service(self):
        """Get the network topology from the api_service.

        Return:
        On success, topology_reply. The returned topology from the api_service,
        of type dict, with keys of "name", "config", "names", "nodes", "sites";
        On fail, return None.
        """

        target_domain = "{}:{}".format(
            self._api_service_config["ip"], self._api_service_config["port"]
        )
        if self._api_service_config["proxy"]:
            # Enable proxy
            non_proxy_domain_set = set(os.environ["NO_PROXY"].split(","))
            if target_domain in non_proxy_domain_set:
                non_proxy_domain_set.remove(target_domain)
            os.environ["NO_PROXY"] = ",".join(
                [domain for domain in non_proxy_domain_set]
            )
        else:
            os.environ["NO_PROXY"] = target_domain

        url_to_post = "http://{}:{}/".format(
            self._api_service_config["ip"], self._api_service_config["port"]
        )
        url_to_post += "api/getTopology"
        print("sending :", url_to_post)

        # For topology read requests, nothing in the post body
        request_body = "{}"

        # Post the http requests and get response
        try:
            response = requests.post(url_to_post, data=request_body)
        except OSError:
            print("Cannot send to the server")
            return None

        if not response.ok:
            print("Response status error with code: ", response.status_code)

        topology_string = response.content.decode("utf-8")
        topology_reply = json.JSONDecoder().decode(topology_string)
        return topology_reply

    def obtain_network_dict(self, topology_reply, enforce_wireless=True):
        """Get the configure of the network config, including nodes, links, sites.

        Args:
          enforce_wireless: only consider wireless links.

        Return:
          network_config: dict, have 4 keys:
          node_name_to_mac: dict, from node_name to mac address;
          node_mac_to_name: dict, from node mac address to name;
          link_macs_to_name: dict, from link (source_mac, peer_mac) tuple
                             to link name.
        """

        node_name_to_mac = {
            single_node["name"]: single_node["mac_addr"]
            for single_node in topology_reply["nodes"]
        }
        node_mac_to_name = {
            single_node["mac_addr"]: single_node["name"]
            for single_node in topology_reply["nodes"]
        }
        node_mac_to_site = {
            single_node["mac_addr"]: single_node["site_name"]
            for single_node in topology_reply["nodes"]
        }
        # the dict that map name to macs
        # the macs are tuple of [source_node_mac, peer_node_mac]
        link_macs_to_name = {}
        for single_link in topology_reply["links"]:
            # 1 stands for wireless
            link_type = LinkType()
            if not (
                enforce_wireless
                and link_type._VALUES_TO_NAMES[single_link["link_type"]] != "WIRELESS"
            ):
                link_name = single_link["name"]
                link_macs = (
                    node_name_to_mac[single_link["a_node_name"]],
                    node_name_to_mac[single_link["z_node_name"]],
                )
                link_macs_to_name[link_macs] = link_name

        network_config = {
            "node_mac_to_name": node_mac_to_name,
            "link_macs_to_name": link_macs_to_name,
            "node_mac_to_site": node_mac_to_site,
        }

        return network_config
