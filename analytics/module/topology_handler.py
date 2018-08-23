#!/usr/bin/env python3

""" Provide function which can read the topology from the api_service and
    process for topology related configurations.
"""

import os
import requests
import json
import sys
import logging

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from module.mysql_db_access import MySqlDbAccess

sys.path.append(
    os.path.abspath(os.path.join(os.path.dirname(__file__), "..") + "/interface/gen-py")
)
from facebook.gorilla.Topology.ttypes import LinkType


class TopologyHelper(object):
    """
    Helper functions on the network topology.
    """

    def __new__(cls, topology_name="tower G"):
        """Get the network topology from the api_service.

        Args:
        topology_name: name of the topology of interest, like "tower G".

        Return: TopologyHelper object on success.
                None on failure.
        """

        api_service_config = {}
        try:
            mysql_db_access = MySqlDbAccess()
            if mysql_db_access is None:
                raise ValueError("Cannot create MySqlDbAccess object")

            api_service_config = mysql_db_access.read_api_service_setting()
            if topology_name not in api_service_config:
                raise ValueError(
                    "Cannot find the API service config for ", topology_name
                )
        except BaseException as err:
            logging.error(
                "Failed to get the api_service setting. " + "Error: {}".format(err.args)
            )
            logging.error(
                "The found api service setting is {}".format(api_service_config)
            )
            return None

        instance = super().__new__(cls)
        logging.info("TopologyHelper object created")
        instance._api_service_config = {}
        instance._api_service_config["hostname"] = api_service_config[topology_name][
            "api_ip"
        ]
        instance._api_service_config["port"] = api_service_config[topology_name][
            "api_port"
        ]
        return instance

    def get_topology_from_api_service(self):
        """Get the network topology from the api_service.

        Return:
        On success, topology_reply. The returned topology from the api_service,
        of type dict, with keys of "name", "config", "names", "nodes", "sites";
        On fail, return None.
        """

        target_domain = "{}:{}".format(
            self._api_service_config["hostname"], self._api_service_config["port"]
        )

        # Proxy should not be used in current design
        os.environ["NO_PROXY"] = target_domain

        url_to_post = "http://[{}]:{}/".format(
            self._api_service_config["hostname"], self._api_service_config["port"]
        )
        url_to_post += "api/getTopology"
        logging.debug("sending :", url_to_post)

        # For topology read requests, nothing in the post body
        request_body = "{}"

        # Post the http requests and get response
        try:
            response = requests.post(url_to_post, data=request_body, timeout=1)
        except OSError:
            logging.error("Cannot send to the server")
            return None

        if not response.ok:
            logging.error("Response status error with code: ", response.status_code)

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

        node_mac_to_golay = {
            node["mac_addr"]: node["golay_idx"]
            for node in topology_reply["nodes"]
            if "golay_idx" in node
        }
        node_mac_to_polarity = {
            node["mac_addr"]: node["polarity"]
            for node in topology_reply["nodes"]
            if "polarity" in node
        }

        # the dict that map name to macs
        # the macs are tuple of [source_node_mac, peer_node_mac]
        link_macs_to_name = {}
        for single_link in topology_reply["links"]:
            link_type = LinkType()
            if not (
                enforce_wireless and single_link["link_type"] != link_type.WIRELESS
            ):
                link_name = single_link["name"]
                link_macs = (
                    node_name_to_mac[single_link["a_node_name"]],
                    node_name_to_mac[single_link["z_node_name"]],
                )
                link_macs_to_name[link_macs] = link_name

        network_config = {
            "node_mac_to_name": node_mac_to_name,
            "node_name_to_mac": node_name_to_mac,
            "link_macs_to_name": link_macs_to_name,
            "node_mac_to_site": node_mac_to_site,
            "node_mac_to_polarity": node_mac_to_polarity,
            "node_mac_to_golay": node_mac_to_golay,
        }

        return network_config
