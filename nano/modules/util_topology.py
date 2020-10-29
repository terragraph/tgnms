#!/usr/bin/env python3

import codecs

# built-ins
import json

# modules
import modules.keywords as KEY
from modules.addon_misc import convert2Bool, dump_result
from modules.util_math import compute_angle, compute_angle_diff, compute_distance


# make python2 and python3 compatible to check string type
try:
    basestring
except NameError:
    basestring = str

# global params
# TODO: move to config file
INR_THRESH = -10


class Topology(object):
    """
    Topology related functions
    Subject to syntax change as it is based on tg-cli and e2e_topology file

    File dependencies: util_math, keywords, addon_misc
    """

    def __init__(self, topology_fp=None):
        """
        @param topology_fp: if set, will try to read topology from the file
        """
        # dict to store all relevant info for all nodes
        self.node = {}
        # list to store all inband ips
        self.inband_ip = []
        # list to store pop_node names
        self.pop_node_list = []
        self.link = {}
        self.site = {}
        self.node_extra = {}
        # angle-based connectivity graph of links
        self.angle_connect_graph = {}
        # interference-based graph of links
        self.interference_graph = {}
        # convenient
        self.mac_to_node = {}
        self.ip_to_node = {}
        self.site_to_nodes = {}
        self.special_wired_connectivity = []

        if topology_fp is not None:
            self.load_topology(topology_fp)

    def print_graph(self, interference=False):
        """
        Print graph
        """
        graph = self.angle_connectivity_graph
        if interference:
            graph = self.interference_graph
        if graph is None:
            print("graph is empty, no need to view")
            return
        print("Graph:")
        for link in graph:
            try:
                print("{0:>35}  |  {1}".format(link, graph[link]))
            except BaseException:
                print("{0}  |  {1}".format(link, graph[link]))

    def get_graph_w_interfer(self, est_inr, logger=None):
        """
        @param interfer: Interfer object
        Derive the uni-directional graph from topology
        The graph vertices are links,
            and edges are their aggregated interference to each other
        This graph currently only gets used in the
            do_golay_optimization function of the util_optimization file
        Format: {link_name: [(connected_link1, interference), ...], ...}
        """
        self.interference_graph = {}
        # est_inr includes interference pattern for each uni-directional link
        # TODO: est_inr is only estimated interference profile,
        #   we shall also cover interference measurement
        for rxKey in est_inr:
            rx, rxTowardsNode = rxKey.split("__")
            # TODO: remove the randomness to pick a link associated with rxNode
            rxLink = self.get_link_name(rx, rxTowardsNode)[0]
            _overallINR, rxList = est_inr[rxKey]
            for txNode, interfereINR, txTowardsNode in rxList:
                if interfereINR < INR_THRESH:
                    continue
                # TODO: remove the randomness to pick a link
                # associated with interfering txNode
                txLink = self.get_link_name(txNode, txTowardsNode)[0]
                if txLink not in self.interference_graph:
                    self.interference_graph[txLink] = []
                # TODO: both txLink and rxLink need to be uni-directional link
                self.interference_graph[txLink].append((rxLink, interfereINR))
        if logger:
            logger.debug("interference graph = {}".format(self.interference_graph))

    def get_graph_w_link_angle(self):
        """
        Derive the uni-directional graph from topology
        The graph vertices are links, and edges are whether they are connected
        and the angular difference between two links
        Format: {link_name: [(connected_link1, angle diff), ...], ...}
        """
        self.angle_connect_graph = {}
        link_names = self.get_links(isWireless=True)
        for link_name in link_names:
            a_node = self.get_a_node(link_name)
            z_node = self.get_z_node(link_name)
            a_site = self.get_site_name(a_node)
            z_site = self.get_site_name(z_node)
            link_ang = self.get_angle(a_node, z_node)
            # skip if cannot get angle
            if link_ang is None:
                continue
            self.angle_connect_graph[link_name] = []
            for next_l in link_names:
                if next_l == link_name:
                    continue
                next_a_node = self.get_a_node(next_l)
                next_z_node = self.get_z_node(next_l)
                next_a_site = self.get_site_name(next_a_node)
                next_z_site = self.get_site_name(next_z_node)
                # skip if the link is not a wireless link
                if not self.is_link_wireless(next_l):
                    continue
                next_ang = self.get_angle(next_a_node, next_z_node)
                # skip if cannot get angle
                if next_ang is None:
                    continue
                if next_z_site == z_site or next_a_site == a_site:
                    flip = False
                elif next_a_site == z_site or next_z_site == a_site:
                    flip = True
                else:
                    continue
                angle_diff = compute_angle_diff(link_ang, next_ang, flip=flip)
                # add result if they are adjacent
                if (
                    a_site == next_a_site
                    or a_site == next_z_site
                    or z_site == next_a_site
                    or z_site == next_z_site
                ):
                    self.angle_connect_graph[link_name].append((next_l, angle_diff))

    def _get_info(self, mydict, key_to_find):
        if mydict is None:
            return None
        return mydict.get(key_to_find, None)

    """
    Sector/Node Related Functions
    """

    def get_distance(self, sectorA, sectorB):
        """
        compute the distance between two sectors
        """
        info = self.get_location(self.get_site_name(sectorA))
        if info is None:
            return float("nan")
        lat_a = float(info["latitude"])
        lon_a = float(info["longitude"])
        info = self.get_location(self.get_site_name(sectorB))
        if info is None:
            return float("nan")
        lat_b = float(info["latitude"])
        lon_b = float(info["longitude"])
        return compute_distance((lon_a, lat_a), (lon_b, lat_b))

    def get_angle(self, sectorA, sectorB):
        """
        get angle of sectorA w.r.t. sectorB
        """
        info = self.get_location(self.get_site_name(sectorA))
        if info is None:
            return None
        lat_a = float(info["latitude"])
        lon_a = float(info["longitude"])
        info = self.get_location(self.get_site_name(sectorB))
        if info is None:
            return None
        lat_b = float(info["latitude"])
        lon_b = float(info["longitude"])
        return compute_angle((lon_a, lat_a), (lon_b, lat_b))

    def set_primary(self, nodeName, is_primary):
        """
        set status about whether sector is primary
        """
        self.node[nodeName][KEY.IS_PRIMARY] = (
            convert2Bool(is_primary) if not isinstance(is_primary, bool) else is_primary
        )

    def is_primary(self, nodeName):
        """
        check status about whether sector is primary
        """
        status = self._get_info(self.node.get(nodeName, None), KEY.IS_PRIMARY)
        if status is None:
            return False
        return status

    def set_pop(self, nodeName, is_pop):
        """
        set status about whether a sector is PoP node
        """
        self.node[nodeName][KEY.IS_POP] = (
            convert2Bool(is_pop) if not isinstance(is_pop, bool) else is_pop
        )
        if self.node[nodeName][KEY.IS_POP] and nodeName not in self.pop_node_list:
            self.pop_node_list.append(nodeName)

    def is_pop(self, nodeName):
        """
        check status about whether a sector is PoP node
        """
        status = self._get_info(self.node.get(nodeName, None), KEY.IS_POP)
        if status is None:
            return False
        # store pop node names in a list
        if status and nodeName not in self.pop_node_list:
            self.pop_node_list.append(nodeName)
        return status

    def get_pop_nodes(self):
        """
        get the list of the PoP nodes
        """
        return self.pop_node_list

    def is_pop_site(self, nodes):
        """
        check if the list of nodes includes any node in a pop_site
        """
        if not nodes:
            return False
        for node in nodes:
            status = self._get_info(self.node.get(node, None), KEY.IS_POP)
            if status:
                return True
        return False

    def set_sw_version(self, nodeName, version):
        """
        set SW version of a node
        """
        self.node[nodeName][KEY.SW_VERSION] = version

    def get_sw_version(self, nodeName):
        """
        get SW version of a node
        """
        return self._get_info(self.node.get(nodeName, None), KEY.SW_VERSION)

    def set_polarity(self, nodeName, polarity):
        """
        set polarity of a node
        """
        self.node[nodeName][KEY.POLARITY] = polarity

    def get_polarity(self, nodeName):
        """
        get polarity of a node
        """
        return self._get_info(self.node.get(nodeName, None), KEY.POLARITY)

    def set_golay(self, nodeName, tx_golay_idx, rx_golay_idx=None, nodeTowards=""):
        """
        set Golay for a node
        Syntax change: link Golay > node Golay
        """
        if rx_golay_idx is None:
            rx_golay_idx = tx_golay_idx
        self.node[nodeName][KEY.GOLAY_IDX] = {
            KEY.GOLAY_IDX_TX: tx_golay_idx,
            KEY.GOLAY_IDX_RX: rx_golay_idx,
        }
        # also add to link
        linkNames = self.get_link_name(nodeName, nodeTowards)
        for linkName in linkNames:
            self.link[linkName][KEY.GOLAY_IDX] = {
                KEY.GOLAY_IDX_TX: tx_golay_idx,
                KEY.GOLAY_IDX_RX: rx_golay_idx,
            }

    def get_golay(self, nodeName, nodeTowards=""):
        """
        get Golay of a node
        Syntax change: link Golay > node Golay
        """
        # first check if link has it, if so, it'll overwrite the node
        # for p2mp, node should have the same golay on either link
        linkName = self.get_link_name(nodeName, nodeTowards)[0]
        if linkName is not None:
            tmp = self._get_info(self.link.get(linkName, None), KEY.GOLAY_IDX)
            if tmp is not None and KEY.GOLAY_IDX_TX in tmp:
                return [tmp[KEY.GOLAY_IDX_TX], tmp[KEY.GOLAY_IDX_RX]]
        tmp = self._get_info(self.node.get(nodeName, None), KEY.GOLAY_IDX)
        if tmp is None or KEY.GOLAY_IDX_TX not in tmp:
            return [float("nan"), float("nan")]
        return [tmp[KEY.GOLAY_IDX_TX], tmp[KEY.GOLAY_IDX_RX]]

    def is_connected(self, nodeName):
        """
        check if a sector is connected to the other
        """
        # if we already have linked node, then it is connected for sure
        if self.node.get(nodeName, {}).get(KEY.LINKED_NODE, []):
            return True
        # otherwise, we check via the hard way
        for link in self.get_links(isWireless=True):
            if ("-" + nodeName) in link:
                return True
        return False

    def is_linked(self, nodeName):
        """
        same to above
        """
        return self.is_connected(nodeName)

    def set_linked_sector(self, nodeName, linked_node):
        """
        set/add sector name if a node is connected to the other
        """
        if KEY.LINKED_NODE not in self.node[nodeName]:
            self.node[nodeName][KEY.LINKED_NODE] = []
        tmp = self.node[nodeName][KEY.LINKED_NODE]
        if isinstance(tmp, basestring):
            tmp = [tmp]
        if linked_node not in tmp:
            tmp.append(linked_node)
        self.node[nodeName][KEY.LINKED_NODE] = tmp

    def get_linked_sector(self, nodeName):
        """
        get the connected sector(s) of the target sector
        """
        tmp = self.node.get(nodeName, {}).get(KEY.LINKED_NODE, [])
        if tmp and not isinstance(tmp, list):
            tmp = [tmp]
        if KEY.LINKED_NODE not in self.node.get(nodeName, {}):
            nodes = []
            for link in self.get_link_name(nodeName):
                if nodeName == self.get_a_node(link):
                    nodes.append(self.get_z_node(link))
                    self.set_linked_sector(nodeName, nodes[-1])
                elif nodeName == self.get_z_node(link):
                    nodes.append(self.get_a_node(link))
                    self.set_linked_sector(nodeName, nodes[-1])
            return nodes
        return tmp

    def set_site_name(self, nodeName, site_name):
        """
        set the sitename of a node
        """
        self.node[nodeName][KEY.SITENAME] = site_name

    def get_site_name(self, nodeName):
        """
        get the sitename of a node
        """
        return self._get_info(self.node.get(nodeName, None), KEY.SITENAME)

    def set_status(self, nodeName, status):
        """
        set the status of the sector
        TODO: check how many status in total form tg cli
        """
        if status == "ONLINE_INITIATOR":
            status = 3
        elif status == "ONLINE":
            status = 2
        elif status == "OFFLINE":
            status = 1
        self.node[nodeName][KEY.STATUS] = status

    def get_status(self, nodeName):
        """
        get the status of the sector
        TODO: check how many status in total form tg cli
        """
        status = self._get_info(self.node.get(nodeName, None), KEY.STATUS)
        if status is 3:
            return "ONLINE_INITIATOR"
        elif status is 2:
            return "ONLINE"
        elif status is 1:
            return "OFFLINE"
        return status

    def set_node_type(self, nodeName, node_type):
        """
        set the type of the sector
        TODO: check how many types in total form tg cli
        """
        # TODO: get comprehensive node type
        if node_type == "DN":
            node_type = 2
        elif node_type == "CN":
            node_type = 1
        self.node[nodeName][KEY.NODE_TYPE] = node_type

    def get_node_type(self, nodeName):
        """
        get the type of the sector
        TODO: check how many types in total form tg cli
        """
        val = self._get_info(self.node.get(nodeName, None), KEY.NODE_TYPE)
        if val is 2:
            return "DN"
        elif val is 1:
            return "CN"
        return val

    def get_mac(self, nodeName):
        """
        get MAC address of a sector
        """
        return self._get_info(self.node.get(nodeName, None), KEY.MAC_ADDRESS)

    def get_all_node_mac(self):
        return [self.get_mac(name) for name in sorted(self.node.keys())]

    def get_all_link_mac(self, isWireless):
        names = self.get_links(isWireless)
        a_macs = [self.get_mac(self.get_a_node(name)) for name in names]
        z_macs = [self.get_mac(self.get_z_node(name)) for name in names]
        return a_macs, z_macs

    def get_node_from_mac(self, mac):
        """
        get node from mac address
        """
        if mac not in self.mac_to_node:
            for node in self.get_all_nodes(withMAC=True):
                if mac == self.get_mac(node):
                    self.mac_to_node[mac] = node
                    return node
            return None
        else:
            return self.mac_to_node[mac]

    def get_nodes_from_site(self, siteName, isConnected=False):
        """
        get node names from sites
        @param isConnected: set to true to filter out nodes not connected
        """
        if siteName not in self.site_to_nodes:
            for node in self.get_all_nodes():
                site = self.get_site_name(node)
                if site is None:
                    continue
                if not isConnected or self.is_connected(node):
                    if site not in self.site_to_nodes:
                        self.site_to_nodes[site] = []
                    if node not in self.site_to_nodes[site]:
                        self.site_to_nodes[site].append(node)
        return self.site_to_nodes.get(siteName, None)

    def _get_node_from_ip(self, ip):
        """
        get node from ip address
        """
        if ip not in self.ip_to_node:
            for node in self.get_all_nodes(withMAC=True, withIP=True):
                if ip == self.get_ip(node):
                    self.ip_to_node[ip] = node
                    return node
            return None
        else:
            return self.ip_to_node[ip]

    def get_nodes_from_ips(self, ips):
        """
        get node list from a list with multihop ip addresses
        """
        nodes = []
        for ip in ips:
            node = self._get_node_from_ip(ip)
            nodes.append(node)
        return nodes

    def get_wireless_hops_from_nodes(self, nodes):
        """
        derive the wireless links/hops from the nodes in the routing path
        """
        hops = []
        node_a = None
        node_z = None
        for node in nodes:
            if not node_a:
                # init
                node_a = node
                continue
            if not node_z:
                node_z = node
                link_a_z = "link-{}-{}".format(node_a, node_z)
                link_z_a = "link-{}-{}".format(node_z, node_a)
                if self.is_link_wireless(link_a_z) or self.is_link_wireless(link_z_a):
                    # uni-directional link name
                    # stored to reflect node_a -> node_z transmission
                    hops.append(link_a_z)
                # prepare for the next link
                node_a = node_z
                node_z = None
        return hops

    def get_nodes_from_link(self, link):
        try:
            tmp = link.replace("link-", "").split("-")
            # try to parse the nodes from the link first
            if len(tmp) > 2:
                if "." in tmp[0]:
                    node_a = tmp[0]
                    node_z = "-".join(tmp[1:])
                elif "." in tmp[1]:
                    node_a = "-".join(tmp[0:2])
                    node_z = "-".join(tmp[2:])
                elif "." in tmp[2]:
                    node_a = "-".join(tmp[0:3])
                    node_z = "-".join(tmp[3:])
                elif "." in tmp[3]:
                    node_a = "-".join(tmp[0:4])
                    node_z = "-".join(tmp[4:])
                elif "." in tmp[4]:
                    node_a = "-".join(tmp[0:5])
                    node_z = "-".join(tmp[5:])
                else:
                    node_a = tmp[0]
                    node_z = tmp[1]
            else:
                node_a, node_z = tmp
            # validate node_a and node_z via the topology node list
            nodes = self.get_all_nodes(isConnected=True)
            if node_a not in nodes:
                node_a = None
            if node_z not in nodes:
                node_z = None
        except BaseException:
            node_a, node_z = None, None
        return (node_a, node_z)

    def is_node_in_pop_site(self, node, logger=None):
        site = self.get_site_name(node)
        # consider special_wired_connectivity config list
        if self.special_wired_connectivity:
            for sites in self.special_wired_connectivity:
                # if site is part of special_wired_connectivity
                if site in sites:
                    nodes = []
                    for temp_site in sites:
                        nodes += self.get_nodes_from_site(temp_site, isConnected=True)
                    if logger:
                        logger.debug(
                            "with special_wired_connectivity, "
                            + "check if any node is in pop_site, "
                            + "connected sites = {0}, nodes = {1}".format(sites, nodes)
                        )
                    return self.is_pop_site(nodes)

        # if site is not part of special_wired_connectivity
        nodes = self.get_nodes_from_site(site, isConnected=True)
        if logger:
            logger.debug(
                "check if any node is in pop_site, site = {0}, nodes = {1}".format(
                    site, nodes
                )
            )
        return self.is_pop_site(nodes)

    def validate_pop_node_in_route(self, tx, rx, links, logger):
        """
        validate either the 1st or the last link shall:
        1. include a node, which is in a site with pop nodes
        """
        if not links:
            return False
        if tx == "vm" or tx == "pop":
            # node_a of the first wireless hop shall come from a pop site
            node, __ = self.get_nodes_from_link(links[0])
        elif rx == "vm" or rx == "pop":
            # node_z of the last wireless hop shall come from a pop site
            __, node = self.get_nodes_from_link(links[-1])
        logger.debug(
            "Validate if any pop_node from the routing info, node = {0}".format(node)
        )
        return True if node and self.is_node_in_pop_site(node, logger=logger) else False

    def validate_connecting_sites(self, site_z, site_a):
        """
        validate the corner case where two sites connecting with cables
        """
        # loop over the special_wired_connectivity list in the following format:
        #   [[A,B],[C,D],[E,F]]
        if self.special_wired_connectivity:
            for pair in self.special_wired_connectivity:
                if site_z in pair and site_a in pair:
                    return True
        if "-" in site_z and "-" in site_a:
            tmp_z = site_z.split("-")
            tmp_a = site_a.split("-")
            if len(tmp_z) <= 2 and len(tmp_a) <= 2:
                if tmp_z[0] == tmp_a[0]:
                    return True
            elif len(tmp_z) > 2 and len(tmp_a) > 2:
                if "-".join(tmp_z[0:-1]) == "-".join(tmp_a[0:-1]):
                    return True
            return False

    def validate_wireless_path(self, tx, rx, links, logger):
        """
        validate if a path (with a set of wireless links) based on:
        1. one link shall include a node from the pop node list
        2. two consecutive links shall share a common site
        3. TODO: offline topology graph analysis to cover corner cases
        """
        # validate point 1: a node from the pop node list
        pop_node_flag = self.validate_pop_node_in_route(tx, rx, links, logger)
        logger.debug(
            "In path validation, pop_node_flag = {0}, pop_nodes = {1}".format(
                pop_node_flag, self.get_pop_nodes()
            )
        )
        logger.debug("all links = {0}".format(links))
        if not pop_node_flag:
            return False
        # validate point 2: any two consecutive links share a common site
        site_a = None
        site_z = None
        site_z_temp = None
        if len(links) >= 2:
            for link in links:
                # given link name reflects node_a -> node_z direction
                node_a, node_z = self.get_nodes_from_link(link)
                # if both node_a and node_z are not None
                if node_a and node_z:
                    # assume only one '.' in node name
                    logger.debug(
                        "link = {0}, node_a = {1}, node_z = {2}".format(
                            link, node_a, node_z
                        )
                    )
                    if "." in node_a and "." in node_z:
                        site_a = node_a.split(".")[0]
                        site_z = node_z.split(".")[0]
                    else:
                        site_a = self.get_site_name(node_a)
                        site_z = self.get_site_name(node_z)
                logger.debug(
                    "link = {0}, site_a = {1}, site_z = {2}, site_z_temp = {3}".format(
                        link, site_a, site_z, site_z_temp
                    )
                )
                # when site_z_temp is None
                if not site_z_temp and site_z:
                    site_z_temp = site_z
                    continue
                else:
                    # both site_a and site_z_temp are not none
                    if site_z_temp and site_a:
                        if site_z_temp == site_a:
                            site_z_temp = site_z
                            continue
                        else:
                            # special cases where two sites connecting with cables
                            if self.validate_connecting_sites(
                                site_z=site_z_temp, site_a=site_a
                            ):
                                site_z_temp = site_z
                                continue
                    return False
        else:
            # if len(links) = 1
            # TODO: need offline topology graph analysis to
            # further validate and cover corner cases ('*' star entries)
            return True
        return True

    def set_mac(self, nodeName, mac_addr):
        """
        set MAC address of a sector
        """
        self.node[nodeName][KEY.MAC_ADDRESS] = mac_addr

    def set_ip(self, nodeName, ip, inband=True):
        """
        set IP address of a sector
        @param inband: True stores as inband ip, False stores as outband ip
        """
        key_to_find = KEY.INBAND_IP if inband else KEY.OUTBAND_IP
        self.node[nodeName][key_to_find] = ip

    def get_ip(self, nodeName, inband=True):
        """
        get IP address of a sector
        @param inband: True picks inband ip, False picks outband ip
        """
        key_to_find = KEY.INBAND_IP if inband else KEY.OUTBAND_IP
        return self._get_info(self.node.get(nodeName, None), key_to_find)

    def add_node(self, nodeName):
        """
        add a node to the dictionary
        """
        if nodeName in self.node:
            return True
        self.node[nodeName] = {"name": nodeName}

    def get_node(self, nodeName):
        """
        get all stored info belong to a sector
        """
        return self._get_info(self.node, nodeName)

    def get_node_extra(self, nodeName):
        """
        get alls stored extra channel info belong to a sector
        """
        return self._get_info(self.node_extra, nodeName)

    def set_extra_channel_info(self, node, node_l, info):
        if node not in self.node_extra:
            self.node_extra[node] = {}
        if node_l not in self.node_extra[node]:
            self.node_extra[node][node_l] = {}
        for key in info:
            if not info[key]:
                continue
            val = info[key][-1][1]
            self.node_extra[node][node_l][key] = val

    def get_phy_layer_info(self, node, towards_node=None, what="all"):
        """
        get the stored channel status (beam, snr, etc.) of the node
        @param what: by default 'all' means every supported status
        """
        existing_key_list = (
            KEY.ODS_PHY[:7]
            + [KEY.ODS_STA_TX_PWR]
            + [KEY.ODS_PERIOD_RX_BEAM, KEY.ODS_PERIOD_TX_BEAM]
        )
        if "," in what:
            what = what.split(",")
        elif "|" in what:
            what = what.split("|")
        if what == "all":
            what = existing_key_list
        if isinstance(what, basestring):
            what = [what]
        result = [None] * len(what)
        if node in self.node_extra:
            if towards_node is None:
                tmp = list(self.node_extra[node].keys())
                towards_node = tmp[0]
            tmp = self._get_info(self.node_extra[node], towards_node)
            if tmp is not None:
                for i in range(len(what)):
                    each = what[i]
                    if tmp.get(each, None) is not None:
                        result[i] = tmp[each]
        return result

    def get_all_beams_and_power(self, fromNode):
        """
        get the stored beam indices info from node
        this assumes p2mp rather than p2p
        """
        results = []
        if fromNode not in self.node_extra:
            return results
        tmp = self.node_extra[fromNode]
        for toNode in tmp:
            txIdx = tmp[toNode].get(KEY.ODS_PERIOD_TX_BEAM, None)
            rxIdx = tmp[toNode].get(KEY.ODS_PERIOD_RX_BEAM, None)
            txPower = tmp[toNode].get(KEY.ODS_STA_TX_PWR, None)
            if txIdx is None or rxIdx is None:
                continue
            results.append([toNode, txIdx, rxIdx, txPower])
        return results

    def get_current_thrpt_est(self, node, towardsNode=None):
        """
        get current estimated throughput info if exists
        """
        return self.get_phy_layer_info(
            node, towards_node=towardsNode, what=[KEY.IPERF_DETAILS + "_est"]
        )[0]

    def get_current_snr_rssi(self, node, towardsNode=None):
        """
        get current snr and rssi info if exists
        """
        return self.get_phy_layer_info(
            node,
            towards_node=towardsNode,
            what=[
                "{0}.{1}".format(KEY.ODS_PHY_DATA_PRE, KEY.ODS_SNR),
                "{0}.{1}".format(KEY.ODS_PHY_DATA_PRE, KEY.ODS_RSSI),
            ],
        )

    def get_current_mcs(self, node, towardsNode=None):
        """
        get current mcs info if exists
        """
        return self.get_phy_layer_info(
            node,
            towards_node=towardsNode,
            what=["{0}.{1}".format(KEY.ODS_PHY_DATA_PRE, KEY.ODS_RX_MCS)],
        )[0]

    def get_current_beam(self, node, towards_node=None):
        """
        get the stored beam index info from node
        here we assume p2p scenario
        (if found p2mp, report the first beam set only)
        """
        return self.get_phy_layer_info(
            node,
            towards_node=towards_node,
            what=[KEY.ODS_PERIOD_TX_BEAM, KEY.ODS_PERIOD_RX_BEAM],
        )

    def get_current_power(self, node, towards_node=None):
        """
        get the stored tx power info from node
        """
        return self.get_phy_layer_info(
            node, towards_node=towards_node, what=[KEY.ODS_STA_TX_PWR]
        )[0]

    def is_node(self, nodeName):
        """
        check if the node name is a sector in topology
        """
        return nodeName in self.node

    def get_all_nodes(self, withMAC=False, withIP=False, isConnected=False):
        """
        get the node list of a topology
        @param withMAC: return node (names) with MAC address
        @param withIP: return node (names) with IP address
        @param isConnected: return node (names) that connects to the other node
        @return list of node names, sorted in the alphabetical order
        """
        result = []
        for node in sorted(self.node.keys()):
            if withMAC and self.get_mac(node) is None:
                continue
            if withIP and self.get_ip(node, inband=True) is None:
                continue
            if isConnected and not self.is_connected(node):
                continue
            result.append(node)
        if not result:
            result = sorted(self.node_extra.keys())
        return result

    def get_all_inband_ips(self, withMAC=False, withIP=True, isConnected=False):
        """
        returns a list of the inband ip addresses of all the nodes
        """
        for node in self.get_all_nodes(
            withMAC=withMAC, withIP=withIP, isConnected=isConnected
        ):
            # get node inband ip
            node_ip = self.get_ip(node, inband=True)
            if node_ip and node_ip not in self.inband_ip:
                self.inband_ip.append(node_ip)
        return self.inband_ip

    def get_all_nodes_inband_ips(self, withMAC=False, withIP=True, isConnected=False):
        """
        returns a dict. with entries in the format of {node_name: inband_ip}
        """
        node_ip_dict = {}
        for node in self.get_all_nodes(
            withMAC=withMAC, withIP=withIP, isConnected=isConnected
        ):
            node_ip_dict[node] = self.get_ip(node, inband=True)
        return node_ip_dict

    def get_link_name(self, nodeName, nodeTowards=""):
        """
        get (wireless) link name(s) given the sector's name
        @param nodeName: the name of the node
        @param nodeTowards: the name of the node that nodeName is connected to
        """
        # nothing if we do not have this node
        if nodeName not in self.node:
            return []
        # get the link names associated with nodeName
        # if it was already done before
        tmp = self.node.get(nodeName, {}).get(KEY.LINK_NAME, [])
        if not tmp:
            link_names = self.get_links(isWireless=True)
            for link in link_names:
                if nodeName in link and (
                    self.get_a_node(link) == nodeName
                    or self.get_z_node(link) == nodeName
                ):
                    tmp.append(link)
            self.node[nodeName][KEY.LINK_NAME] = tmp
        if nodeTowards != "":
            tmp_filtered = []
            for linkName in tmp:
                if nodeTowards in {
                    self.link[linkName]["a_node_name"],
                    self.link[linkName]["z_node_name"],
                }:
                    tmp_filtered.append(linkName)
            return tmp_filtered
        return tmp

    """
    Link Related Functions
    """

    def remove_wireless_link(self, linkName):
        """
        remove a link from topology
        """
        if not self.is_link_wireless(linkName):
            return None, None
        aNode = self.get_a_node(linkName)
        self.node[aNode].pop(KEY.LINKED_NODE, [])
        zNode = self.get_z_node(linkName)
        self.node[zNode].pop(KEY.LINKED_NODE, [])
        self.link.pop(linkName, {})
        return aNode, zNode

    def add_wireless_link(self, aNode, zNode):
        """
        add a link to topology
        """
        linkName = "link-{}-{}".format(aNode, zNode)
        if self.is_link_wireless(linkName):
            # link already exists
            return False
        self.link[linkName] = {"name": linkName}
        self.set_a_node(linkName, aNode)
        self.set_z_node(linkName, zNode)
        self.node[aNode].pop(KEY.LINKED_NODE, [])
        self.node[aNode].pop(KEY.LINK_NAME, [])
        self.node[zNode].pop(KEY.LINKED_NODE, [])
        self.node[zNode].pop(KEY.LINK_NAME, [])
        self.set_link_attempts(linkName, 0)
        self.set_alive(linkName, "True")
        self.set_link_type(linkName, "wireless")
        return True

    def set_link_type(self, linkName, link_type):
        """
        set link type of a link (either wireless, or ethernet)
        """
        self.link[linkName][KEY.LINK_TYPE] = (
            link_type
            if isinstance(link_type, int)
            else KEY.WIRELESS_LINK
            if link_type.lower() == "wireless"
            else KEY.WIRED_LINK
        )

    def get_link_type(self, linkName):
        """
        get link type of a link (either wireless, or ethernet)
        """
        val = self._get_info(self.link.get(linkName, None), KEY.LINK_TYPE)
        if val is 1:
            return "WIRELESS"
        elif val is 2:
            return "ETHERNET"
        return val

    def is_link_wireless(self, linkName):
        """
        check if a link is wireless link
        """
        return self.get_link_type(linkName) == "WIRELESS"

    def get_link_attempts(self, linkName):
        """
        get how many attempts the link is trying to be alive
        (stored result, not real-time)
        """
        return self._get_info(self.link.get(linkName, None), KEY.LINK_ATTEMPTS)

    def set_link_attempts(self, linkName, attempts):
        """
        store how many attempts the link is trying to be alive
        """
        self.link[linkName][KEY.LINK_ATTEMPTS] = attempts
        self.link[linkName][KEY.LINKUP_ATTEMPTS] = attempts

    def set_z_node(self, linkName, z_node_name):
        """
        set z-node of a link
        """
        self.link[linkName][KEY.LINK_Z_NODE] = z_node_name
        # assume zNode exists
        self.link[linkName][KEY.LINK_Z_MAC] = self.get_mac(z_node_name)

    def set_a_node(self, linkName, a_node_name):
        """
        set a-node of a link
        """
        self.link[linkName][KEY.LINK_A_NODE] = a_node_name
        # assume aNode exists
        self.link[linkName][KEY.LINK_A_MAC] = self.get_mac(a_node_name)

    def get_z_node(self, linkName):
        """
        get z-node of a link
        """
        return self._get_info(self.link.get(linkName, None), KEY.LINK_Z_NODE)

    def get_a_node(self, linkName):
        """
        get a-node of a link
        """
        return self._get_info(self.link.get(linkName, None), KEY.LINK_A_NODE)

    def set_alive(self, linkName, is_alive):
        """
        set the alive status of a link (stored, not real-time)
        """
        self.link[linkName][KEY.IS_LINK_ALIVE] = (
            convert2Bool(is_alive) if not isinstance(is_alive, bool) else is_alive
        )

    def is_alive(self, linkName):
        """
        get the alive status of a link (stored, not real-time)
        """
        status = self._get_info(self.link.get(linkName, None), KEY.IS_LINK_ALIVE)
        if status is None:
            return False
        return status

    def is_link(self, linkName):
        """
        check if provided name is a link in topology file
        """
        return linkName in self.link

    def get_links(self, isWireless=False):
        """
        get all link names
        @param isWireless: set True to return only wireless links
        """
        linkNames = [link for link in self.link if self.is_link_wireless(link)]
        return sorted(linkNames)

    """
    Site Related Functions
    """

    def set_location(self, siteName, lat, lon, altitude, accuracy=None):
        """
        set the GPS location of a site (pole), or a node/sector
        """
        if self.is_node(siteName):
            siteName = self.get_site_name(siteName)
        self.site[siteName][KEY.SITE_LOCATION] = {
            "latitude": lat,
            "longitude": lon,
            "altitude": altitude,
        }
        if accuracy is not None:
            self.site[siteName][KEY.SITE_LOCATION]["accuracy"] = accuracy

    def get_location(self, siteName):
        """
        get GPS location of a site (pole), or a node/sector
        """
        if self.is_node(siteName):
            siteName = self.get_site_name(siteName)
        return self._get_info(self.site.get(siteName, None), KEY.SITE_LOCATION)

    def is_site(self, siteName):
        """
        check if provided name is a site name in topology
        """
        return siteName in self.site

    def get_sites(self):
        """
        get all site names in topology
        """
        return sorted(self.site.keys())

    def load_outband_ips(self, aux_config_fp):
        """
        Load outband ip to the topology
        @param aux_config_fp: the file path of aux_config.json
        @return True/False: succeed or not
        """
        try:
            with open(aux_config_fp, "r") as inf:
                tmp = json.load(inf)
        except BaseException as ex:
            print(ex)
            return False
        nodes = tmp["nodes"]
        for node_name in sorted(nodes.keys()):
            if "oob_ip" not in nodes[node_name]:
                print("oob not exist!")
                return False
            if not self.is_node(node_name):
                self.node[node_name] = {}
            self.set_ip(node_name, nodes[node_name]["oob"], inband_ip=False)
        return True

    def load_topology_extra(self, fp):
        """
        load topology extra information
        (single snapshot of snr, beam index, etc.)
        """
        try:
            with open(fp, "r") as inf:
                self.node_extra = json.load(inf)
        except BaseException as ex:
            print(ex)
            return False
        return True

    def dump_topology_extra(self, fp):
        """
        dump the topology extra information to the json file
        @param fp: output file path
        @return True/False: succeed or not
        """
        if not self.node_extra:
            return False
        try:
            with open(fp, "w") as of:
                json.dump(self.node_extra, of, indent=2)
        except BaseException:
            return False
        return True

    def load_topology(self, tmp):
        """
        load topology from file
        @param tmp: it can be either a file path, or a dictionary,
                   or a list of json text (e.g. ['{', '"key":"val"', '}'])
        @return True/False: succeed or not
        """
        try:
            if isinstance(tmp, basestring):
                # topology file downloaded from nms has BOM charecters
                # using codec as workaround
                with codecs.open(tmp, "r", "utf-8-sig") as inf:
                    tmp = json.load(inf)
            elif isinstance(tmp, list):
                tmp = json.loads("".join(tmp))
            # allow input to be dict
            elif not isinstance(tmp, dict):
                return False
        except BaseException:
            return False
        self.topology_name = "Test"
        if "name" in tmp:
            self.topology_name = tmp["name"]
        nodes = tmp["nodes"]
        for node in nodes:
            if "name" not in node:
                print("{0} has no attribute `name`!".format(node))
                continue
            key = node["name"]
            self.node[key] = node
            # set_pop for multihop analysis to be able to fetch pop node
            is_pop = str(node["pop_node"])
            self.set_pop(key, is_pop)
        links = tmp["links"]
        for link in links:
            if "name" not in link:
                print("{0} has no attribute `name`!".format(link))
                continue
            key = link["name"]
            self.link[key] = link
        sites = tmp["sites"]
        for site in sites:
            if "name" not in site:
                print("{0} has no attribute `name`!".format(site))
                continue
            site_name = site["name"]
            self.site[site_name] = site
            location = site["location"]
            self.set_location(
                site_name,
                lat=location["latitude"],
                lon=location["longitude"],
                altitude=location["altitude"],
                accuracy=location["accuracy"],
            )
        return True

    def remove_macless_nodes(self):
        """
        remove nodes with empty mac addresses
        returns list of such nodes
        """
        bad_node_names = []
        for key, value in self.node.items():
            if not value[KEY.MAC_ADDRESS]:
                bad_node_names.append(key)
        valid_nodes = {}
        for key, value in self.node.items():
            if key not in bad_node_names:
                valid_nodes[key] = value
        valid_links = {}
        for key, value in self.link.items():
            if (
                value[KEY.LINK_A_NODE] not in bad_node_names
                and value[KEY.LINK_Z_NODE] not in bad_node_names
            ):
                valid_links[key] = value
        self.node = valid_nodes
        self.link = valid_links
        return bad_node_names

    def dump_topology(self, fp, to_mongo_db=False, additional_stuff=None):
        """
        dump the topology to json file
        @param fp: output file path
        @param to_mongo_db: default False, set to True to upload to mongoDB
        @return True/False: succeed or not
        """
        tmp = {"name": self.topology_name, "nodes": [], "links": [], "sites": []}
        if additional_stuff:
            tmp["extrainfo"] = additional_stuff
        for node_name in sorted(self.node.keys()):
            tmp["nodes"].append(self.node[node_name])
        for link_name in sorted(self.link.keys()):
            tmp["links"].append(self.link[link_name])
        for site_name in sorted(self.site.keys()):
            tmp["sites"].append(self.site[site_name])
        # dump topology to file use dump_result function
        topofp = dump_result(
            fp.replace(".json", ""),
            tmp,
            logger=None,
            use_JSON=True,
            to_mongo_db=to_mongo_db,
        )
        return True if topofp else False
