#!/usr/bin/env python3

import re


"""
Topology related parser functions
"""


def parse_topology_filepath(resp, syntaxs, logger):
    """
    parse response for the topology file path
    @param resp: list of lines from output of cmd like 'ps aux | grep e2e'
    @param syntaxs: syntax(s) of e2e_controller to load the topology file
                    e.g., ['-topology_file', '-topology-file']
    @param logger: EmptyLogger() object
    @return the file path, or None if not find
    """
    logger.debug("at parse_topology_filepath")
    for line in resp:
        for syntax in syntaxs:
            if syntax in line:
                tmp = line.split()
                idx = None
                try:
                    idx = tmp.index(syntax)
                except BaseException as ex:
                    logger.error(ex)
                    logger.error(line)
                    logger.error(syntax)
                    logger.error(
                        "Cannot find topology file path,"
                        + "e2e_controller syntax has been changed?"
                    )
                    return None
                logger.debug("index: {0}".format(idx))
                logger.debug("remote_fp_ori: {0}".format(tmp[idx + 1]))
                logger.debug("at parse_topology_filepath, find {}".format(tmp))
                return tmp[idx + 1]
    return None


def parse_inband_ip(resp, logger):
    """
    parse response for sector inband ip
    @param resp: a list of response from 'tg status'
    @param logger: EmptyLogger() object
    @return dictionary of (node name, ip address)
    NOTE: syntax subject to change based on changes to 'tg status'
    """
    ips = {}
    for line in resp:
        try:
            tmp = line.split()
            ips[tmp[0]] = tmp[1]
        except BaseException as ex:
            logger.debug(ex)
            logger.debug(line)
    return ips


def parse_topology_ls(resp, logger):
    """
    parse response for sector online status
    @param resp: a list of response from 'tg topology ls'
    @param logger: EmptyLogger() object
    @param acc_range: report only within the gps accuracy range,
                      by default within (0, 100) meters
    @return dictionary of (nodes, links, sites),
            each containing list of detected parameters
    NOTE: syntax subject to change based on changes to 'tg topology ls'
    """
    nodes = []
    links = []
    sites = []
    for line in resp:
        if "Name" in line or "----" in line:
            continue
        logger.debug(line)
        # fix str.split() problem when node name has a space
        tmp = re.split(r"\s{2,}", line)
        # check if current line is node, or link, or site
        if len(tmp) == 7 or "OFFLINE" in line:
            # fix if 6 cols due to missing MAC address
            if len(tmp) == 6:
                tmp.insert(1, None)
            logger.debug("adding to nodes")
            nodes.append(tmp)
        elif len(tmp) == 6 and "link-" in line:
            logger.debug("adding to links")
            links.append(tmp)
        elif len(tmp) == 5:
            try:
                gps_accuracy = float(tmp[4])
                lat = float(tmp[1])
                lon = float(tmp[2])
                altitude = float(tmp[3])
                logger.debug("adding to sites")
                sites.append([tmp[0], lat, lon, altitude, gps_accuracy])
            except BaseException as ex:
                logger.error(ex)
                logger.error(tmp)
        elif len(tmp) != 0:
            # don't update topology
            logger.debug("topology ls function is changed?")
            logger.debug(tmp)
    return {"nodes": nodes, "links": links, "sites": sites}
