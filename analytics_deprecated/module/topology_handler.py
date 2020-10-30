#!/usr/bin/env python3

""" Provide function which can read the topology from the api_service and
    process for topology related configurations.
"""

import json
import logging
import os
from typing import Dict, Optional, Tuple

import requests
from facebook.gorilla.Topology.ttypes import LinkType
from module.mysql_db_access import MySqlDbAccess


def fetch_network_info(
    topology_id: Optional[int] = None, use_primary_controller: Optional[bool] = True
) -> Dict[int, Dict]:
    """
    returns all networks or just one if topology_id input is set
    use_primary_controller is True for Primary Controller info; False for Backup
        Controller info.
    networks.keys() are same as topology id
    networks[id].keys() includes "api_ip", "api_port", "topology", etc.
    networks[id]["topology"].keys() includes "nodes", "links", "sites", etc.
    """
    networks = {}
    api_services = MySqlDbAccess().read_api_service_setting(use_primary_controller)
    for _name, cfg in api_services.items():
        try:
            if topology_id and cfg["id"] != topology_id:
                continue
            target_domain = "{}:{}".format(cfg["api_ip"], cfg["api_port"])
            os.environ["NO_PROXY"] = target_domain
            url = "http://[{}]:{}/".format(cfg["api_ip"], cfg["api_port"])
            url += "api/getTopology"
            logging.debug("Fetching topology from url {}".format(url))
            response = requests.post(url, data="{}", timeout=1)
            topology_string = response.content.decode("utf-8")
            topology_reply = json.loads(topology_string)
            has_wlink = False
            for l in topology_reply["links"]:
                if l["link_type"] == LinkType.WIRELESS:
                    has_wlink = True
                    break
            if not has_wlink:
                logging.debug(
                    "Ignore {}, no wireless links".format(topology_reply["name"])
                )
                continue
            cfg["topology"] = topology_reply
            networks[cfg["id"]] = cfg
        except requests.exceptions.Timeout as e:
            logging.warning("HTTP timeout fetching topology {}".format(e))
        except requests.exceptions.ConnectionError as e:
            logging.warning("HTTP connection failure {}".format(e))
        except Exception as e:
            logging.error("Unexpected exception fetching topology {}".format(e))
    # remove nodes, links with mac_addr == "", this is proxy for future nodes
    topologies = [n["topology"] for _, n in networks.items()]
    for t in topologies:
        future_node_names = []
        future_node_indices = []
        future_link_indices = []
        for i, n in enumerate(t["nodes"]):
            if not n["mac_addr"]:
                future_node_names.append(n["name"])
                future_node_indices.append(i)
        for i, l in enumerate(t["links"]):
            if (
                l["a_node_name"] in future_node_names
                or l["z_node_name"] in future_node_names
            ):
                future_link_indices.append(i)
        for i in reversed(future_node_indices):
            t["nodes"].pop(i)
        for i in reversed(future_link_indices):
            t["links"].pop(i)

    return networks


def restart_minion(api_ip: str, api_port: int, node_list: Tuple, delay_sec: int) -> int:
    """Restart minion for the given list of node names.

    Return:
    Status code of the http put request
    """
    try:
        target_domain = "{}:{}".format(api_ip, api_port)
        os.environ["NO_PROXY"] = target_domain
        url = "http://[{}]:{}/".format(api_ip, api_port)
        url += "api/restartMinion"

        # Request body
        request_body = {}
        request_body["nodes"] = node_list
        request_body["secondsToRestart"] = delay_sec

        response = requests.post(url, json=request_body, timeout=1)

        if not response.ok:
            logging.error("Response status error with code: ", response.status_code)

        return response.status_code
    except Exception as e:
        logging.error("Exception happened while fetching network info")
        logging.warning("Exception: {}".format(e))
        return 0


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