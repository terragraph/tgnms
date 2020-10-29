#!/usr/bin/env python3

import modules.keywords as KEY
import numpy as np
from modules.analyzer_health_check import convert_rate


"""
This file contains all functions that are used by P2MP Iperf Test
"""


def _get_random_p2mp_rate_profile(__vm, traffic_rate, num_peers):
    # convert traffic_rate string to actual rate in Mbps
    traffic_rate = convert_rate(traffic_rate, __vm.logger)

    # generate list of random numbers totalling to traffic_rate
    random_rates = np.random.multinomial(
        traffic_rate, np.ones(num_peers) / num_peers, size=1
    )[0]
    __vm.logger.debug("random_rates: {0}".format(random_rates))

    return ["{0}M".format(rate) for rate in random_rates]


def _get_max_test_combination_num(num):
    # scale input number by (n * (n - 1)) / 2
    return (num * (num - 1)) / 2


def _get_p2mp_links_and_rates(
    __vm, time_slot_index, p2mp_master_dn_nodes, sector_pair_to_test, traffic_direction
):
    p2mp_links = {}

    for node in p2mp_master_dn_nodes:
        # get peer nodes
        peer_nodes = __vm.topology.get_linked_sector(node)

        # check if p2mp links need to be tested for corresponding time_slot_index
        if time_slot_index < _get_max_test_combination_num(len(peer_nodes)):
            # get random traffic rates
            random_rate_profile = _get_random_p2mp_rate_profile(
                __vm, __vm.params["tests"]["iperf_p2mp"]["rate"], len(peer_nodes)
            )

            if traffic_direction == KEY.BIDIRECTIONAL:
                # form the list of link tuples
                dn_to_peer_links = [(node, dst) for dst in peer_nodes]
                peer_to_dn_links = [(dst, node) for dst in peer_nodes]
                # map the rates to the links
                for links, random_rate_profile in zip(
                    dn_to_peer_links + peer_to_dn_links, random_rate_profile * 2
                ):
                    p2mp_links[links] = random_rate_profile
            elif traffic_direction == KEY.DN_TO_PEER:
                # form the list of link tuples
                links = [(node, dst) for dst in peer_nodes]
                # map the rates to the links
                for links, random_rate_profile in zip(links, random_rate_profile):
                    p2mp_links[links] = random_rate_profile
            elif traffic_direction == KEY.PEER_TO_DN:
                # form the list of link tuples
                links = [(dst, node) for dst in peer_nodes]
                # map the rates to the links
                for links, random_rate_profile in zip(links, random_rate_profile):
                    p2mp_links[links] = random_rate_profile
            else:
                __vm.logger.error(
                    "Incorrect traffic direction. "
                    + "Please choose between: {0}/{1}/{2}".format(
                        KEY.BIDIRECTIONAL, KEY.DN_TO_PEER, KEY.PEER_TO_DN
                    )
                )
                return None

    return p2mp_links


def get_p2mp_links_list(__vm, sector_pair_to_test, traffic_direction):
    p2mp_links_list = []
    p2mp_master_dn_nodes = []
    max_p2mp_links = 0

    if sector_pair_to_test:
        # get master DN nodes
        for TX, RX in sector_pair_to_test:
            # get DOF value - number of p2mp links for TX and RX
            tx_dof = len(__vm.topology.get_linked_sector(TX))
            rx_dof = len(__vm.topology.get_linked_sector(RX))

            # find the node with max DOF value - number of p2mp links
            max_p2mp_links = max(max_p2mp_links, tx_dof, rx_dof)

            if TX not in p2mp_master_dn_nodes:
                if tx_dof > 1:
                    p2mp_master_dn_nodes.append(TX)
            if RX not in p2mp_master_dn_nodes:
                if rx_dof > 1:
                    p2mp_master_dn_nodes.append(RX)

        # calculate the max number of time_slots
        max_num_time_slots = _get_max_test_combination_num(max_p2mp_links)

        # get p2mp_links for each time slot
        for time_slot_index in range(max_num_time_slots):
            p2mp_links_dict = {}

            # populate links and rates in p2mp_links_list
            p2mp_links_dict["time_slot_index"] = "time_slot_{0}".format(time_slot_index)
            p2mp_links_dict["links"] = _get_p2mp_links_and_rates(
                __vm,
                time_slot_index,
                p2mp_master_dn_nodes,
                sector_pair_to_test,
                traffic_direction,
            )
            p2mp_links_list.append(p2mp_links_dict)
        __vm.logger.debug("p2mp_links_list: {0}".format(p2mp_links_list))

    return p2mp_links_list


def get_time_slot_nodes(list_node_pairs):
    nodes = []
    for tx, rx in list_node_pairs:
        if tx not in nodes:
            nodes.append(tx)
        if rx not in nodes:
            nodes.append(rx)
    return nodes


def get_time_slot_links(__vm, list_node_pairs):
    links = []
    all_links = __vm.topology.get_links(isWireless=True)
    for tx, rx in list_node_pairs:
        link_name = "link-{0}-{1}".format(tx, rx)
        if link_name in all_links:
            links.append(link_name)
    return links
