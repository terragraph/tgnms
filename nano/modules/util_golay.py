#!/usr/bin/env python3

import random

# built-ins
import sys

from modules.util_logger import EmptyLogger

# modules
from modules.util_math import isnan


# global param
# in deg; two links have large separation angles
OBSERVE_LARGE_ANG_DIFF = 50
# in deg; two links are this much nearby
OBSERVE_NARROW_ANG_DIFF = 20


class Golay(object):
    """
    Golay Assignment Util
    Provide functions to analyze Golay code assignments

    Dependencies: util_logger, util_math
    """

    def __init__(self, topology, logger=None):
        """
        @param topology: Topology() object
        @param logger: EmptyLogger() object; if set None, then use its own
        """
        self.assignment = {}
        if logger is None:
            self.logger = EmptyLogger("Golay", printout=True)
        else:
            self.logger = logger
        self.__tp = topology
        # get original golay code assignment from topology file
        self.prev_assignment = {}
        for node in self.__tp.get_all_nodes(isConnected=True):
            towardsNodes = self.__tp.get_linked_sector(node)
            for towardsNode in towardsNodes:
                node_golay, _ignore = self.__tp.get_golay(node, towardsNode)
                if node_golay is None or isnan(node_golay):
                    continue
                link = self.__tp.get_link_name(node, towardsNode)[0]
                if not link:
                    continue
                self.prev_assignment[link] = node_golay

    def print_golay(self):
        """
        Show Golay code assignment (self.assignment)
        """
        if not self.assignment:
            self.logger.note("new golay assignment is empty, no need to view")
            return
        self.logger.info("{0:>35} | Old Golay | New".format("Link Name"))
        for link in self.assignment:
            if link not in self.prev_assignment:
                self.prev_assignment[link] = None
            self.logger.info(
                "{0:>35} | {1:>9} | {2}".format(
                    link, self.prev_assignment[link], self.assignment[link]
                )
            )

    def apply_golay(self):
        """
        Replace the Golay assignment in self.topology
        with the ones in self.assignment
        """
        if self.assignment is None or len(self.assignment) < 1:
            self.logger.error("assignment is empty, get_golay_init first")
            return False
        for link_name in self.assignment:
            golay_idx = self.assignment[link_name]
            a_node = self.__tp.get_a_node(link_name)
            z_node = self.__tp.get_z_node(link_name)
            self.__tp.set_golay(a_node, golay_idx, nodeTowards=z_node)
            self.__tp.set_golay(z_node, golay_idx, nodeTowards=a_node)
        return self.__tp

    def minimize_discrepancy(self):
        """
        minimize discrepancy between the old and new golay assignment
        here we assume golay number 2, need extra work for 3 or more golays
        """
        if not self.assignment:
            return
        if not self.prev_assignment:
            return
        # count how many are the same
        counter = 0
        for link in self.assignment:
            if link not in self.prev_assignment:
                continue
            if self.assignment[link] == self.prev_assignment[link]:
                counter += 1
        # flip the assignment if not so many the same
        if counter < (len(self.assignment) / 2):
            for link in self.assignment:
                if self.assignment[link] is 1:
                    self.assignment[link] = 2
                elif self.assignment[link] is 2:
                    self.assignment[link] = 1

    def get_golay_w_interfer(
        self, interfer_links, num_of_golay=2, ystreet=False, weight=10
    ):
        """
        Derive the golay based on interference (and then the angles)
        @param interfer_links: links sorted based on interference
        @param num_of_golay: number of golay codes we have, default 2
        @param ystreet: whether we assume existence of Y-street topology
        @param weight: tune accuracy & performance of Golay code assignment
        """
        # params
        self.assignment = {}
        all_choices = range(1, num_of_golay + 1)

        # first take care of worst interfering link
        for interfer_link in interfer_links:
            choices = [x for x in all_choices]
            a_node = self.__tp.get_a_node(interfer_link)
            z_node = self.__tp.get_z_node(interfer_link)
            # check adj links to rule out Golays
            for adj_link, _adj_angle in self.__tp.angle_connect_graph[interfer_link]:
                # skip if not assigned
                if adj_link not in self.assignment:
                    continue
                # otherwise, rule out Golay already in use
                adj_golay = self.assignment[adj_link]
                # force y-street links to be the same golay
                adj_a_node = self.__tp.get_a_node(adj_link)
                adj_z_node = self.__tp.get_z_node(adj_link)
                if (
                    adj_a_node == a_node
                    or adj_a_node == z_node
                    or adj_z_node == a_node
                    or adj_z_node == z_node
                ):
                    del choices[:]
                    choices.append(adj_golay)
                    break
                else:
                    choices = [x for x in choices if not x == adj_golay]
            # pick a golay
            if len(choices) < 1:
                choices = [x for x in all_choices]
            pickIdx = random.randint(0, len(choices) - 1)
            self.assignment[interfer_link] = choices[pickIdx]

        # then take care of other links
        for link in self.__tp.angle_connect_graph:
            # skip if already done
            if link in self.assignment:
                continue
            choices = [x for x in all_choices]
            self._choice_selection(link, choices, ystreet, weight)
            # if choices is empty
            if len(choices) < 1:
                choices = [x for x in all_choices]
            # pick a golay
            pickIdx = random.randint(0, len(choices) - 1)
            self.assignment[link] = choices[pickIdx]

        # minimize golay discrepancy between old and new assignment
        self.minimize_discrepancy()

    def _choice_selection_ob4(self, adj_l, link, adj_golay, choices, weight):
        """
        Don't call this function directly.
        It checks Golays of the two links with one link in between
        and suggests the Golay choices, based on Observation documented in Wiki:
        """
        for next_link, _ang_diff in self.__tp.angle_connect_graph[adj_l]:
            # skip if neighbor's neighbor not assigned yet
            if next_link not in self.assignment:
                continue
            # skip if is current link or current neighbors
            if next_link == link or next_link in self.__tp.angle_connect_graph[link]:
                continue
            next_golay = self.assignment[next_link]
            # never three consecutive assignments
            if next_golay == adj_golay:
                choices = [x for x in choices if not x == adj_golay]
            else:
                # otherwise we prefer Golay the same as adjacent link
                choices.extend([adj_golay] * weight)

    def _choice_selection(
        self, link, choices, ystreet, weight, queue=None, accurate_gps=True
    ):
        """
        Don't call this function directly
        It checkes Golays of adjacent links, as well as
        three consecutive links. And it suggests the Golay
        choices by modifying parameter choices
        """
        a_node = self.__tp.get_a_node(link)
        z_node = self.__tp.get_z_node(link)
        for adj_l, ang_diff in self.__tp.angle_connect_graph[link]:
            # skip if adjacent link does not have Golay
            if adj_l not in self.assignment:
                # add to queue if required
                if queue is not None:
                    queue.append(adj_l)
                continue
            adj_golay = self.assignment[adj_l]
            # observation 2
            if accurate_gps and ang_diff > OBSERVE_LARGE_ANG_DIFF:
                choices.extend([adj_golay] * weight)
            # observation 1
            # (check y-street based on a-z node names rather than angle)
            # force already setted y-street links to be the same golay
            adj_a_node = self.__tp.get_a_node(adj_l)
            adj_z_node = self.__tp.get_z_node(adj_l)
            if (
                adj_a_node == a_node
                or adj_a_node == z_node
                or adj_z_node == a_node
                or adj_z_node == z_node
            ):
                del choices[:]
                choices.append(adj_golay)
                break
            else:
                if accurate_gps and ang_diff < OBSERVE_NARROW_ANG_DIFF:
                    # if not setted as y-street yet, but will do later
                    if ystreet:
                        choices.extend([adj_golay] * weight)
                        continue
                    else:
                        choices = [x for x in choices if not x == adj_golay]
                # observation 4
                self._choice_selection_ob4(adj_l, link, adj_golay, choices, weight)

    def get_golay_w_angle(
        self, start_link, num_of_golay=2, ystreet=False, accurate_gps=True, weight=10
    ):
        """
        Derive the golay based on the angles between adjacent links
        If GPS inaccurate, do best and run ob4
        If with GPS, derive angles and check
        @param start_link: the link to start with
        @param num_of_golay: number of golay codes we have, default 2
        @param ystreet: whether we assume existence of Y-street topology
        @param accurate_gps: whether we assume GPS is accurate
        @param weight: tune accuracy & performance of Golay code assignment
        """
        # params
        self.assignment = {}
        all_choices = range(1, num_of_golay + 1)

        # BFS
        queue = [start_link]
        while len(queue) > 0:
            link = queue.pop(0)
            if link in self.assignment:
                continue
            choices = [x for x in all_choices]
            # mod the choice to suit the criteria
            self._choice_selection(
                link, choices, ystreet, weight, queue=queue, accurate_gps=accurate_gps
            )
            # pick a golay
            if len(choices) < 1:
                choices = [x for x in all_choices]
            pickIdx = random.randint(0, len(choices) - 1)
            # randomly pick one for it
            self.assignment[link] = choices[pickIdx]

        # minimize golay discrepancy between old and new assignment
        self.minimize_discrepancy()


def testing_effectivness(myInterference, topology):
    """
    Test func to evaluate the effectiveness of the derived Golay assignmnent.
    Evaluation is based on how many interference links will be "suppressed"
    after assigning different Golays, as well as the overall INR.
    @param myInterference: the Interfer() object with interference data
    @param topology: the Topology() object with topology loaded
    @return Tuple(overall INR, number of remaining interfered links)
    """
    from math import log10

    my_aggregated_inr = 0
    counter = 0
    for txNode in myInterference.result:
        tx_link_name = topology.get_link_name(txNode)[0]
        tx_site_name = topology.get_site_name(txNode)
        tx_link_golay, _dummy = topology.get_golay(txNode)
        tx_polarity = topology.get_polarity(txNode)
        m = myInterference.get_interferers(txNode)
        rxNodes = m.keys()
        for rxNode in rxNodes:
            # skip if the desired link
            desired_sector = topology.get_linked_sector(txNode)
            if rxNode in desired_sector:
                continue
            rx_site_name = topology.get_site_name(rxNode)
            # skip if interference on the same pole
            if tx_site_name == rx_site_name:
                continue
            rx_polarity = topology.get_polarity(rxNode)
            # skip if same polarity
            if tx_polarity == rx_polarity:
                continue
            rx_link_name = topology.get_link_name(rxNode)[0]
            # skip if same link
            if tx_link_name == rx_link_name:
                continue
            _dummy, rx_link_golay = topology.get_golay(rxNode)
            # we may have early weak interference if we get
            # different polarity, same golay, and interference
            if tx_link_golay == rx_link_golay:
                snr = myInterference.get_snr(txNode, rxNode)
                if snr is not None:
                    print(txNode, rxNode, snr)
                    counter += 1
                    my_aggregated_inr += pow(10, snr / 10)
    if my_aggregated_inr is 0:
        return (float("-inf"), counter)
    return (10 * log10(my_aggregated_inr), counter)


def testing(num_of_golay=2, ystreet=True, accurate_gps=True, weight=10):
    """
    Test func to load topology, derive connectivity graph, and derive Golay
    @param num_of_golay: number of golay codes we have, default 2
    @param ystreet: whether we assume existence of Y-street topology
    @param accurate_gps: whether we assume GPS is accurate
    @param weight: tune accuracy & performance of Golay code assignment

    Dependencies: util_topology, util_interference
    """
    # import necessary libs
    from util_topology import Topology
    from util_interference import Interfer

    # initialize params
    topology_fp = sys.argv[1]  # file path of topology file
    worst_link = None  # which link to start

    # load initial topology file
    topology = Topology()
    topology.load_topology(topology_fp)

    # derive angle-based connectivity graph
    # format: {link_name: {(adjacent_link_1, their_angle_difference), ...}, ...}
    topology.get_graph_w_link_angle()

    # print it
    topology.print_graph()

    # initialize Golay() object with this topology
    golay = Golay(topology)

    # evaluate current Golay code assignment in the topology file
    interference = Interfer(topology)
    if len(sys.argv) > 2:
        interfer_fp = sys.argv[2]
        interference.load_interference_result(interfer_fp)
    else:
        interference.predict_interference_result()
        # interference.dump_interference_result(interfer_fp)
    ori_inr, ori_count = testing_effectivness(interference, topology)
    golay.logger.note("Original INR: {0}; Counter: {1}".format(ori_inr, ori_count))

    # get the worst interfer link as the most interfered rx's link to start
    interfer_sectors = topology.get_interfer_sectors()
    if len(interfer_sectors) > 0:
        worst_link = topology.get_link_name(interfer_sectors[0][1])[0]

    # otherwise, no interference and pick the first link in graph
    if not worst_link:
        # graph must not be empty as we use angle-based connectivity graph here
        worst_link = next(iter(topology.angle_connect_graph))

    golay.logger.debug("Worst Link: {0}".format(worst_link))

    # derive initial Golay code assignment (based on angles, connectivities)
    golay.get_golay_w_angle(
        worst_link,
        num_of_golay=num_of_golay,
        ystreet=ystreet,
        accurate_gps=accurate_gps,
        weight=weight,
    )

    # print the golay assignment
    golay.print_golay()

    # apply the new golay assignment to the loaded topology
    golay.apply_golay()

    # evaluate new Golay code assignment in the topology
    new_inr, new_count = testing_effectivness(interference, topology)
    golay.logger.note("New INR: {0}; Counter: {1}".format(new_inr, new_count))

    # write to new file
    golay.logger.note("Generating new topology config file...")
    topology.dump_topology(topology_fp.rstrip(".json") + "_new_golay.json")


if __name__ == "__main__":

    print("==== Below is for testing purpose... ====")
    if len(sys.argv) < 2:
        print("Usage: {0} topology_fp interfer_fp[optional]".format(sys.argv[0]))
        print("- topology_fp: topology file path")
        print("- interfer_fp: interference analysis result path")
        print("               (if not set, will predict interference)")
        sys.exit(1)
    testing()
