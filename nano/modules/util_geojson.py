#!/usr/bin/env python3


# modules
import modules.keywords as KEY
from modules.util_math import compute_angle, index2deg, mean


def assign_color(fieldname, val=None, inverse=False):
    """
    assign color;
    if val is not specified, return who color dict (except for comparisons)
    """
    colors = {}
    if fieldname == "interference":
        if inverse:
            colors = {
                KEY.THRESH_NO_INTERF: KEY.COLOR_GREEN,
                KEY.THRESH_WEAK_INTERF: KEY.COLOR_YELLOW,
                KEY.THRESH_VERYSTRONG_INTERF: KEY.COLOR_RED,
            }
        else:
            # special handle as it requires comparison
            if val <= KEY.THRESH_NO_INTERF:
                return KEY.COLOR_GREEN
            if val <= KEY.THRESH_WEAK_INTERF:
                return KEY.COLOR_YELLOW
            elif val <= KEY.THRESH_VERYSTRONG_INTERF:
                return KEY.COLOR_RED
            return KEY.COLOR_GREY
    elif fieldname == "mcs":
        if inverse:
            colors = {
                KEY.THRESH_IPERF_MCS_EXCEL_S: KEY.COLOR_GREEN,
                KEY.THRESH_IPERF_MCS_OKAY_S: KEY.COLOR_BLUE,
                KEY.THRESH_IPERF_MCS_WARN_S: KEY.COLOR_YELLOW,
                1: KEY.COLOR_RED,
            }
        else:
            # special handle as it requires comparison
            if val >= KEY.THRESH_IPERF_MCS_EXCEL_S:
                return KEY.COLOR_GREEN
            if val >= KEY.THRESH_IPERF_MCS_OKAY_S:
                return KEY.COLOR_BLUE
            elif val >= KEY.THRESH_IPERF_MCS_WARN_S:
                return KEY.COLOR_YELLOW
            elif val >= 2:
                return KEY.COLOR_RED
            return KEY.COLOR_GREY
    elif fieldname == "link_healthiness":
        colors = {
            KEY.STATUS_EXCELLENT: KEY.COLOR_GREEN,
            KEY.STATUS_HEALTHY: KEY.COLOR_BLUE,
            KEY.STATUS_WARNING: KEY.COLOR_YELLOW,
            KEY.STATUS_BAD_OCCASION: KEY.COLOR_RED,
            KEY.STATUS_BAD_CONSTANT: KEY.COLOR_RED,
        }
    elif fieldname == "multihop":
        colors = {
            KEY.STATUS_EXCELLENT: KEY.COLOR_GREEN,
            KEY.STATUS_HEALTHY: KEY.COLOR_BLUE,
            KEY.STATUS_WARNING: KEY.COLOR_YELLOW,
            KEY.STATUS_BAD_OCCASION: KEY.COLOR_RED,
            KEY.STATUS_BAD_CONSTANT: KEY.COLOR_RED,
        }
    elif fieldname == "box_alignment":
        colors = {
            KEY.STATUS_TX_RX_HEALTHY: KEY.COLOR_GREEN,
            KEY.STATUS_TX_RX_DIFF: KEY.COLOR_YELLOW,
            KEY.STATUS_LARGE_ANGLE: KEY.COLOR_BLUE,
            KEY.STATUS_TX_RX_DIFF + KEY.STATUS_LARGE_ANGLE: KEY.COLOR_RED,
            KEY.STATUS_BOX_SWAPPED: KEY.COLOR_BRICKRED,
        }
    elif fieldname == "polarity":
        colors = {
            2: KEY.COLOR_PINK,
            1: KEY.COLOR_DARKBLUE,
            3: KEY.COLOR_BLUE,
            4: KEY.COLOR_BRICKRED,
        }
    elif fieldname == "foliage":
        colors = {
            KEY.STATUS_NON_FOLIAGE: KEY.COLOR_GREEN,
            KEY.STATUS_FOLIAGE: KEY.COLOR_RED,
            KEY.STATUS_FOLIAGE_LIKELY: KEY.COLOR_YELLOW,
        }
    if inverse:
        tmp = {v: k for k, v in colors.items()}
        if val is None:
            return tmp
        try:
            return tmp.get(val, KEY.STATUS_UNKNOWN)
        except TypeError:
            return KEY.COLOR_GREY
    if val is None:
        return KEY.COLOR_GREY
    try:
        return colors.get(val, KEY.COLOR_GREY)
    except TypeError:
        return KEY.COLOR_GREY


def get_color_meanings(fieldname, val=None):
    """
    get color meanings in words; if val is not specified, return who words dict
    """
    words = {}
    if fieldname == "interference":
        words = {
            KEY.COLOR_GREEN: "No Interference <= {0}dB".format(KEY.THRESH_NO_INTERF),
            KEY.COLOR_RED: "Strong Interference > {0}dB".format(KEY.THRESH_WEAK_INTERF),
            KEY.COLOR_YELLOW: "Weak Interference <= {0}dB".format(
                KEY.THRESH_WEAK_INTERF
            ),
            KEY.COLOR_GREY: "Missing Data",
        }
    elif fieldname == "mcs":
        words = {
            KEY.COLOR_GREEN: "MCS ={}".format(KEY.THRESH_IPERF_MCS_EXCEL_S),
            KEY.COLOR_BLUE: "MCS ={}".format(KEY.THRESH_IPERF_MCS_OKAY_S),
            KEY.COLOR_YELLOW: "MCS >={}".format(KEY.THRESH_IPERF_MCS_WARN_S),
            KEY.COLOR_RED: "MCS >={}".format(2),
            KEY.COLOR_GREY: "MCS Unknown",
        }
    elif fieldname == "connectivity":
        words = {
            KEY.COLOR_YELLOW: "Potential MacroRoute",
            KEY.COLOR_GOLDBROWN: "Potential MicroRoute",
            KEY.COLOR_ORANGE: "Original Link with MicroRoute",
            KEY.COLOR_BLACK: "Original Link",
            KEY.COLOR_GREY: "Missing Data",
        }
    elif fieldname == "foliage":
        words = {
            KEY.COLOR_RED: "Foliage",
            KEY.COLOR_GREEN: "No Foliage",
            KEY.COLOR_YELLOW: "Maybe Foliage",
            KEY.COLOR_GREY: "Missing Data",
        }
    elif fieldname == "link_healthiness":
        words = {
            KEY.COLOR_GREEN: "Excellent",
            KEY.COLOR_BLUE: "Healthy",
            KEY.COLOR_YELLOW: "Marginal",
            KEY.COLOR_RED: "Warning",
            KEY.COLOR_GREY: "Missing Result",
            KEY.COLOR_BLACK: "Not Ignited",
        }
    elif fieldname == "multihop":
        words = {
            KEY.COLOR_GREEN: "Excellent",
            KEY.COLOR_BLUE: "Healthy",
            KEY.COLOR_YELLOW: "Marginal",
            KEY.COLOR_RED: "Warning",
            KEY.COLOR_GREY: "Missing Result",
            KEY.COLOR_BLACK: "Not Ignited",
        }
    elif fieldname == "box_alignment":
        words = {
            KEY.COLOR_GREEN: "Okay",
            KEY.COLOR_YELLOW: "Tx != Rx",
            KEY.COLOR_DARKBLUE: "Misalign",
            KEY.COLOR_RED: "Misalign & Tx != Rx",
            KEY.COLOR_BRICKRED: "Box Swapped",
            KEY.COLOR_GREY: "Missing Result",
        }
    elif fieldname == "topology_node":
        words = {
            KEY.COLOR_DARKBLUE: "Odd Polarity",
            KEY.COLOR_PINK: "Even Polarity",
            KEY.COLOR_BLUE: "Hybrid Odd Polarity",
            KEY.COLOR_BRICKRED: "Hybrid Even Polarity",
            KEY.COLOR_GREY: "Missing Data",
        }
    elif fieldname == "topology_site":
        words = {
            KEY.COLOR_DARKBLUE: "All Odd",
            KEY.COLOR_PINK: "All Even",
            KEY.COLOR_YELLOW: "HW Hybrid",
            KEY.COLOR_GOLDBROWN: "Hybrid Hybrid",
            KEY.COLOR_GREY: "Missing Data",
        }
    elif fieldname == "topology_link":
        words = {
            KEY.COLOR_RED: "Wrong Golay Setup",
            KEY.COLOR_BRICKRED: "Golay 0",
            KEY.COLOR_LIGHTGREEN: "Golay 1",
            KEY.COLOR_GOLDBROWN: "Golay 2",
            KEY.COLOR_GREYBLUE: "Golay 3",
            KEY.COLOR_GREY: "Missing Data",
        }
    if val is None:
        return words
    try:
        return words.get(val, "Unsure")
    except TypeError:
        return "Unsure"


def wrap_row(content, extraClass=""):
    """
    add row to wrap the content
    """
    return "<div class='row {1}'>{0}</div>".format(content, extraClass)


def get_statistics_from_list(fieldname, colors):
    """
    summarize color statistics from a list for legend purpose
    @param fieldname: the name of the field
    @param colors: a specific list of colors to summarize
    """
    summary = {}
    counter = 0
    for color in colors:
        word = get_color_meanings(fieldname, color)
        if word not in summary:
            summary[word] = {
                "color": color,
                "count": 0,
                "idx": assign_color(fieldname, color, inverse=True),
            }
        summary[word]["count"] += 1
        counter += 1
    # fix division by zero error
    if counter is 0:
        counter = 1  # 1 does not matter here as perc will always be 0 later
    # covert summary to a list [[description, color, count, percent], ...]
    summary = [
        (
            key,
            summary[key]["color"],
            summary[key]["count"],
            "{0:.2f}".format(100.0 * summary[key]["count"] / counter),
            summary[key]["idx"],
        )
        for key in summary
    ]
    summary = sorted(summary, key=lambda x: x[4], reverse=True)
    return summary


def get_statistics(fieldname, features, color="fillColor"):
    """
    summarize color statistics from features (of geojson) for legend purpose
    """
    summary = {}
    counter = 0
    for feature in features:
        word = get_color_meanings(fieldname, feature["properties"]["style"][color])
        if word not in summary:
            summary[word] = {
                "color": feature["properties"]["style"][color],
                "count": 0,
                "idx": assign_color(
                    fieldname, feature["properties"]["style"][color], inverse=True
                ),
            }
        summary[word]["count"] += 1
        counter += 1
    # fix division by zero error
    if counter is 0:
        counter = 1  # 1 does not matter here as perc will always be 0 later
    # covert summary to a list [[description, color, count, percent], ...]
    summary = [
        (
            key,
            summary[key]["color"],
            summary[key]["count"],
            "{0:.2f}".format(100.0 * summary[key]["count"] / counter),
            summary[key]["idx"],
        )
        for key in summary
    ]
    summary = sorted(summary, key=lambda x: x[4], reverse=True)
    return summary


def format_interference_links_to_highlight(links):
    """
    generate `towards` links for highlight purpose
    """
    for victim in links:
        attack_link_ids = []
        for rx in links[victim]:
            tmp = links[victim][rx]
            # no interference source for the rx node of the victim link
            if not isinstance(tmp, dict):
                continue
            for each in tmp["details"]:
                if each[0] not in attack_link_ids:
                    attack_link_ids.append("inr_{0}".format(each[0]))
        links[victim]["attackLinkIds"] = attack_link_ids


def format_interference_webcontent(links, topology):
    """
    generate info content for each link
    """

    def get_nth_inr_in_list(mylist, idx):
        try:
            return "{0:.2f}dB by {1}".format(mylist[idx][2], mylist[idx][1])
        except IndexError:
            return ""

    defaults = {"allinr": float("-inf"), "details": []}
    for victim_name in links:
        content = '<div class="container inr_container">'
        a_victim = topology.get_a_node(victim_name)
        z_victim = topology.get_z_node(victim_name)
        content += wrap_row(
            "<div class='col-4'>(rx <- tx)</div>"
            + "<div class='col-4'>{0} <- {1}</div>".format(a_victim, z_victim)
            + "<div class='col-4'>{1} <- {0}</div>".format(a_victim, z_victim)
        )
        a_inrs_details = links[victim_name].get(a_victim, defaults)
        z_inrs_details = links[victim_name].get(z_victim, defaults)
        content += wrap_row(
            "<div class='col-4'>overallINR (dB)</div>"
            + "<div class='col-4'>{0:.2f}</div>".format(a_inrs_details["allinr"])
            + "<div class='col-4'>{0:.2f}</div>".format(z_inrs_details["allinr"])
        )
        # the number of interference source for node a
        a_victim_len = len(a_inrs_details["details"])
        # the number of interference source for node z
        z_victim_len = len(z_inrs_details["details"])
        # TODO: use a loop to build the interference webcontent instead of if
        if a_victim_len > 0 or z_victim_len > 0:
            content += wrap_row(
                "<div class='col-4'>top interferer</div>"
                + "<div class='col-4'>{0}</div>".format(
                    get_nth_inr_in_list(a_inrs_details["details"], 0)
                )
                + "<div class='col-4'>{0}</div>".format(
                    get_nth_inr_in_list(z_inrs_details["details"], 0)
                )
            )
        if a_victim_len > 1 or z_victim_len > 1:
            content += wrap_row(
                "<div class='col-4'>top interferer</div>"
                + "<div class='col-4'>{0}</div>".format(
                    get_nth_inr_in_list(a_inrs_details["details"], 1)
                )
                + "<div class='col-4'>{0}</div>".format(
                    get_nth_inr_in_list(z_inrs_details["details"], 1)
                )
            )
        # more than 2 interference source for node a or node z
        if a_victim_len > 2 or z_victim_len > 2:
            content += wrap_row(
                "<div class='col-4'>top interferer</div>"
                + "<div class='col-4'>{0}</div>".format(
                    get_nth_inr_in_list(a_inrs_details["details"], 2)
                )
                + "<div class='col-4'>{0}</div>".format(
                    get_nth_inr_in_list(z_inrs_details["details"], 2)
                )
            )
        content += "</div>"
        links[victim_name]["webContent"] = content
        # assign interference status based on overall INR for node a or node z
        thisINR = max(a_inrs_details["allinr"], z_inrs_details["allinr"])
        links[victim_name]["color"] = assign_color("interference", thisINR)


def format_interference(result, topology):
    """
    format interference result to link-based dict
    with web contents showing interference links
    """
    interference_links = {}
    keys = sorted(result.keys(), key=lambda x: result[x][0], reverse=True)
    for i in range(len(keys)):
        rx, rxTowards = keys[i].split("__")
        link_name = topology.get_link_name(rx, rxTowards)
        if link_name:
            victim_link = link_name[0]
        else:
            continue
        if victim_link not in interference_links:
            interference_links[victim_link] = {}
        if rx not in interference_links[victim_link]:
            interference_links[victim_link][rx] = {}
        interference_links[victim_link][rx]["allinr"] = result[keys[i]][0]
        interference_links[victim_link][rx]["details"] = []
        # loop over interference source for the victim link
        for tx_source, inr, rx_source in result[keys[i]][1]:
            # attack_link: jointly decided by interference source - tx and rx
            # get_link_name(tx_source) will not work for P2MP at tx_source
            attack_link = topology.get_link_name(tx_source, rx_source)[0]
            interference_links[victim_link][rx]["details"].append(
                (attack_link, tx_source, inr)
            )
        # sort the interference source based on the INR level created
        interference_links[victim_link][rx]["details"] = sorted(
            interference_links[victim_link][rx]["details"],
            key=lambda x: x[2],
            reverse=True,
        )
    format_interference_webcontent(interference_links, topology)
    format_interference_links_to_highlight(interference_links)
    return interference_links


def get_geojson_for_interference(result, topology):
    """
    generate geoJSON format for interference analysis
    """
    victim_links = format_interference(result, topology)
    links = topology.get_links()
    features = []
    # all links in the topology file
    for link in links:
        # basic format
        A_node = topology.get_a_node(link)
        Z_node = topology.get_z_node(link)
        A_node_loc = topology.get_location(A_node)
        Z_node_loc = topology.get_location(Z_node)
        features.append(
            {
                "type": "Feature",
                "properties": {
                    "popupContent": "Link {0}".format(link),
                    "style": {"weight": 3, "color": KEY.COLOR_GREEN},
                    "highlight_style": {"weight": 7},
                    "towards_style": {"weight": 7, "color": KEY.COLOR_BLUE},
                },
                "info": {"content": "No Interference!"},
                "id": "inr_{0}".format(link),
                "geometry": {
                    "type": "LineString",
                    "coordinates": [
                        [A_node_loc["longitude"], A_node_loc["latitude"]],
                        [Z_node_loc["longitude"], Z_node_loc["latitude"]],
                    ],
                },
            }
        )
        if link in victim_links:
            # add interference info
            features[-1]["info"]["content"] = victim_links[link]["webContent"]
            features[-1]["towards"] = victim_links[link]["attackLinkIds"]
            # change color based on healthiness
            features[-1]["properties"]["style"]["color"] = victim_links[link]["color"]
    geoJSONData = {
        "type": "FeatureCollection",
        "features": features,
        "stats": get_statistics("interference", features, color="color"),
    }
    return geoJSONData


def format_connectivity_webcontent(links, topology):
    """
    generate info content for each link in connectivity graph
    """
    for name in links:
        contents = '<div class="container cx_container">'
        contents += wrap_row(
            "<div class='col-4'>Link Distance:</div>"
            + "<div class='col-8'>{0:.1f}m</div>".format(links[name][KEY.DISTANCE])
        )
        contents += wrap_row(
            "<div class='col-4'>Link Direction:</div>"
            + "<div class='col-4'><b>{0}</b><br>&darr;<br>{1}</div>".format(
                links[name]["ANode"], links[name]["ZNode"]
            )
            + "<div class='col-4'><b>{1}</b><br>&darr;<br>{0}</div>".format(
                links[name]["ANode"], links[name]["ZNode"]
            )
        )
        a2z_cx = links[name].get(links[name]["ANode"], [])
        z2a_cx = links[name].get(links[name]["ZNode"], [])
        a2z_cx_len = len(a2z_cx)
        z2a_cx_len = len(z2a_cx)
        for i in range(max(a2z_cx_len, z2a_cx_len)):
            contents += "<div class='row'>"
            contents += "<div class='col-4'>txAng<br>&darr;<br>rxAng<br>SNR</div>"
            if i < a2z_cx_len:
                contents += "<div class='col-4'>{0}deg<br>&darr;<br>{1}deg<br>{2}dB</div>".format(
                    index2deg(a2z_cx[i][0]), index2deg(a2z_cx[i][1]), a2z_cx[i][2]
                )
            else:
                contents += "<div class='col-4'>nan</div>"
            if i < z2a_cx_len:
                contents += "<div class='col-4'>{0}deg<br>&darr;<br>{1}deg<br>{2}dB</div>".format(
                    index2deg(z2a_cx[i][0]), index2deg(z2a_cx[i][1]), z2a_cx[i][2]
                )
            else:
                contents += "<div class='col-4'></div>"
            contents += "</div>"  # row div
        contents += "</div>"  # container div
        links[name]["webContent"] = contents
    return links


def format_connectivity(result, topology):
    """
    format connectivity result in terms of links
    """
    cx_links = {}
    for txNode in result:
        if topology.get_location(txNode) is None:
            continue
        for rxNode in result[txNode]:
            if topology.get_location(rxNode) is None:
                continue
            key = "link-{0}-{1}".format(txNode, rxNode)
            key_reverse = "link-{1}-{0}".format(txNode, rxNode)
            if key_reverse in cx_links:
                cx_links[key_reverse][txNode] = sorted(
                    result[txNode][rxNode], key=lambda x: x[2], reverse=True
                )
            else:
                cx_links[key] = {
                    txNode: sorted(
                        result[txNode][rxNode], key=lambda x: x[2], reverse=True
                    ),
                    "isOriginalLink": topology.is_link(key)
                    or topology.is_link(key_reverse),
                    "ANode": txNode,
                    "ANodeLoc": topology.get_location(txNode),
                    "ZNode": rxNode,
                    "ZNodeLoc": topology.get_location(rxNode),
                    KEY.DISTANCE: topology.get_distance(txNode, rxNode),
                    "uRouteNum": len(result[txNode][rxNode]) - 1,
                }
    format_connectivity_webcontent(cx_links, topology)
    return cx_links


def get_geojson_for_connectivity(result, topology):
    """
    generate geoJSON format for connectivity analysis
    """
    links = format_connectivity(result, topology)
    features = []
    for name in links:
        use_color = KEY.COLOR_YELLOW
        if links[name]["uRouteNum"] > 0:
            use_color = KEY.COLOR_GOLDBROWN
        # basic link
        features.append(
            {
                "type": "Feature",
                "properties": {
                    "popupContent": "Potential {0}".format(name),
                    "style": {"weight": 3, "color": use_color},
                    "highlight_style": {"weight": 7, "color": KEY.COLOR_BLUE},
                },
                "info": {"content": links[name]["webContent"]},
                "id": "cx_{0}".format(name),
                "geometry": {
                    "type": "LineString",
                    "coordinates": [
                        [
                            links[name]["ANodeLoc"]["longitude"],
                            links[name]["ANodeLoc"]["latitude"],
                        ],
                        [
                            links[name]["ZNodeLoc"]["longitude"],
                            links[name]["ZNodeLoc"]["latitude"],
                        ],
                    ],
                },
            }
        )
        # check if this is the original link, if so change the color
        if links[name]["isOriginalLink"]:
            features[-1]["properties"]["popupContent"] = "Original {0}".format(name)
            features[-1]["properties"]["style"]["color"] = KEY.COLOR_BLACK
            if links[name]["uRouteNum"] > 0:
                features[-1]["properties"]["style"]["color"] = KEY.COLOR_ORANGE
    geoJSONData = {
        "type": "FeatureCollection",
        "features": features,
        "stats": get_statistics("connectivity", features, color="color"),
    }
    return geoJSONData


def format_topology_node_webcontent_perlink(topology, node, nodeLinked):
    """
    get content for per uni-directional link status
    content includes tx/rxBeamIdx, txPowerIndex, rxSNR/RSSI and rxMCS
    """
    contents = wrap_row(
        "<div class='col-4'>Towards</div>"
        + "<div class='col-8 copy-to-clipboard'><a href='#node-{0}'>{0}</a></div>".format(
            nodeLinked
        )
    )
    contents += wrap_row(
        "<div class='col-4'>Link Name</div>"
        + "<div class='col-8 copy-to-clipboard'><a href='#{0}'>{0}</a></div>".format(
            topology.get_link_name(node, nodeLinked)[0]
        )
    )
    # beam info
    txIdx, rxIdx = topology.get_current_beam(node, nodeLinked)
    if txIdx is not None:
        contents += wrap_row(
            "<div class='col-4'>txBeamIdx</div>"
            + "<div class='col-8'>{0}</div>".format(txIdx)
        )
    if rxIdx is not None:
        contents += wrap_row(
            "<div class='col-4'>rxBeamIdx</div>"
            + "<div class='col-8'>{0}</div>".format(rxIdx)
        )
    # txPowerIndex
    txPwrIdx = topology.get_current_power(node, nodeLinked)
    if txPwrIdx is not None:
        contents += wrap_row(
            "<div class='col-4'>txPowerIdx</div>"
            + "<div class='col-8'>{0}</div>".format(txPwrIdx)
        )
    # snr, rssi
    snr, rssi = topology.get_current_snr_rssi(node, nodeLinked)
    if snr is not None and rssi is not None:
        contents += wrap_row(
            "<div class='col-4'>SNR/RSSI (dB)</div>"
            + "<div class='col-8'>{0:.1f}/{1:.1f}</div>".format(snr, rssi)
        )
    # mcs
    rxMCS = topology.get_current_mcs(node, nodeLinked)
    if rxMCS is not None:
        contents += wrap_row(
            "<div class='col-4'>rxMCS</div>"
            + "<div class='col-8'>{0}</div>".format(rxMCS)
        )
    # TODO: est thrpt - how to improve accuracy
    estThrpt = topology.get_current_thrpt_est(node, nodeLinked)
    if estThrpt is not None:
        contents += wrap_row(
            "<div class='col-4'>estThrpt (Mbps)</div>"
            + "<div class='col-8'>{0}</div>".format(estThrpt)
        )
    return contents, rxMCS


def format_topology_node_webcontent_each(node, topology):
    """
    get content for each node
    """
    contents = '<div class="container topo_node_container">'
    contents += wrap_row("This is node {0}. ".format(node))
    # per connected node info
    linkedNodes = topology.get_linked_sector(node)
    rxMCSs = []
    if not linkedNodes:
        contents += wrap_row("It is not connected to any nodes")
    else:
        if len(linkedNodes) > 1:
            contents += wrap_row("This is a p2mp sector!")
        # link current connectivity info: tx/rxBeamIdx, rxSNR/RSSI, rxMCS
        contents += wrap_row("Current connectivity info:", extraClass="mt-2")
        for nodeLinked in linkedNodes:
            text, rxMCS = format_topology_node_webcontent_perlink(
                topology, node, nodeLinked
            )
            contents += text
            if rxMCS is not None:
                rxMCSs.append(rxMCS)
    # node configuration info
    contents += wrap_row("Current config info:", extraClass="mt-2")
    # polarity
    polarity = topology.get_polarity(node)
    contents += wrap_row(
        "<div class='col-4'>Polarity</div>"
        + "<div class='col-8'>{0}</div>".format(polarity)
    )
    # ip
    inbandip = topology.get_ip(node, inband=True)
    if inbandip:
        contents += wrap_row(
            "<div class='col-4'>Inband IP</div>"
            + "<div class='col-8 copy-to-clipboard'>{0}</div>".format(inbandip)
        )
    # mac
    macAddress = topology.get_mac(node)
    if macAddress:
        contents += wrap_row(
            "<div class='col-4'>MAC Addr</div>"
            + "<div class='col-8 copy-to-clipboard'>{0}</div>".format(macAddress)
        )
    contents += "</div>"
    return contents, polarity, rxMCSs


def get_node_angle(topology, node_name, node, location, logger):
    """
    caculate angle (averaged among mp)
    """
    directions = []
    linkedNodes = topology.get_linked_sector(node_name)
    node["towards"] = linkedNodes
    for nodeLinked in linkedNodes:
        directions.append(0)
        refNodeLocation = topology.get_location(nodeLinked)
        if refNodeLocation is None:
            logger.debug("{0} has no location".format(nodeLinked))
            continue
        directions[-1] = compute_angle(
            (location["longitude"], location["latitude"]),
            (refNodeLocation["longitude"], refNodeLocation["latitude"]),
        )
    node["direction"] = 0
    if directions:
        node["direction"] = -mean(directions) - 90
        if abs(node["direction"]) < 0.01:
            node["direction"] = 360


def format_topology_node_webcontent(topology, logger):
    """
    generate info content for each node
    """
    myNodes = {}
    for node in topology.get_all_nodes(isConnected=True):
        location = topology.get_location(node)
        # ignore node if it does not have location information
        if location is None:
            logger.debug("{0} has no location info".format(node))
            continue
        if node not in myNodes:
            myNodes[node] = {"webContent": ""}
        # location
        myNodes[node]["loc"] = (location["longitude"], location["latitude"])
        # generate webContent
        myNodes[node][
            "webContent"
        ], polarity, rxMCSs = format_topology_node_webcontent_each(node, topology)
        # calculate node angle
        get_node_angle(topology, node, myNodes[node], location, logger)
        # color code polarity (filled)
        myNodes[node]["fillColor"] = assign_color("polarity", polarity)
        # TODO: how to display MCS. Currently, color code mcs (hollow)
        myNodes[node]["color"] = assign_color("mcs", mean(rxMCSs))
    return myNodes


def get_geojson_for_topology_node(topology, logger):
    """
    generate geoJSON format for topology nodes
    """
    myNodes = format_topology_node_webcontent(topology, logger)
    features = []
    for node in myNodes:
        features.append(
            {
                "type": "Feature",
                "properties": {
                    "popupContent": "This is node {0}".format(node),
                    "style": {
                        "radius": 19,
                        "fillColor": myNodes[node]["fillColor"],
                        "color": myNodes[node]["color"],
                        # do not show `color`
                        "weight": 0,
                        "opacity": 1,
                        "fillOpacity": 1,
                    },
                    "towards_style": {"radius": 25},
                    "highlight_style": {"radius": 25},
                },
                "info": {"content": myNodes[node]["webContent"]},
                "towards": myNodes[node]["towards"],
                "id": "{0}".format(node),
                "geometry": {"type": "Point", "coordinates": myNodes[node]["loc"]},
            }
        )
        # convert to semicircle if necessary
        if myNodes[node]["direction"]:
            features[-1]["properties"]["direction"] = myNodes[node]["direction"]
            features[-1]["properties"]["size"] = 20
    geoJSONData = {
        "type": "FeatureCollection",
        "features": features,
        "stats": get_statistics("topology_node", features, color="fillColor"),
        "stats2": get_statistics("mcs", features, color="color"),
    }
    logger.debug(
        "For topology_node, stats = {0}, stats2 = {1}".format(
            get_statistics("topology_node", features, color="fillColor"),
            get_statistics("mcs", features, color="color"),
        )
    )
    return geoJSONData


def color_code_polarity_site(allPolarity):
    """
    color code rules for polarity
    """
    if allPolarity:
        allSame = allPolarity.count(allPolarity[0]) == len(allPolarity)
        if not allSame:
            # double check if software hybrid exists
            for polarity in allPolarity:
                if polarity is 3 or polarity is 4:
                    # if so, this site has sw hybrid and normal odd even,
                    # which is so far named as hybrid hybrid
                    return KEY.COLOR_GOLDBROWN
            return KEY.COLOR_YELLOW
        elif allPolarity[0] is 1:
            return KEY.COLOR_DARKBLUE
        elif allPolarity[0] is 2:
            return KEY.COLOR_PINK
    return KEY.COLOR_GREY


def color_code_pop_site(popSite):
    """
    color code rules for a site with pop nodes
    """
    if popSite:
        return KEY.COLOR_BLUE
    return KEY.COLOR_WHITE


def format_topology_site_webcontent(topology, logger):
    """
    generate info content for each site
    """
    mySites = {}
    for site in topology.get_sites():
        location = topology.get_location(site)
        # ignore node if it does not have location information
        if location is None:
            logger.debug("{0} has no location info".format(site))
            continue
        nodes = topology.get_nodes_from_site(site, isConnected=True)
        if nodes is None:
            continue
        popSite = topology.is_pop_site(nodes)
        if site not in mySites:
            mySites[site] = {"webContent": ""}
        # nodes in the same site are to be highlighted
        mySites[site]["towards"] = nodes
        # generate webContent
        contents = '<div class="container topo_site_container">'
        contents += wrap_row("This is site {0}.".format(site))
        # gps accuracy
        if "accuracy" in location:
            contents += wrap_row(
                "<div class='col-4'>GPS accuracy</div>"
                + "<div class='col-8'>{0:.3f}m</div>".format(location["accuracy"])
            )
        # nodes
        contents += wrap_row(
            "<div class='col-4'>Nodes</div>"
            + "<div class='col-8'>{}</div>".format(
                "<br>".join(
                    [
                        '<a href="#node-{0}">{0}</a>'.format(x)
                        for x in topology.get_nodes_from_site(site, isConnected=False)
                    ]
                )
            )
        )
        contents += "</div>"
        if popSite:
            # remove '</div>'
            contents = contents[:-6]
            contents += wrap_row(
                "<div class='col-4'>Site</div>" + "<div class='col-8'>PoP</div>"
            )
        mySites[site]["webContent"] = contents
        # location
        mySites[site]["loc"] = (location["longitude"], location["latitude"])
        # color code polarity
        allPolarity = [
            topology.get_polarity(node)
            for node in nodes
            if topology.get_polarity(node) is not None
        ]
        # In site overview, polarity-related color is used for
        # the fillcolor in the highlight_style
        mySites[site]["color"] = color_code_polarity_site(allPolarity)

        # In site overview, the popColor is used
        # if this site includes pop nodes
        mySites[site]["popColor"] = color_code_pop_site(popSite)
    return mySites


def get_geojson_for_topology_site(topology, logger):
    """
    generate geoJSON format for topology sites
    """
    mySites = format_topology_site_webcontent(topology, logger)
    features = []
    for site in mySites:
        features.append(
            {
                "type": "Feature",
                "properties": {
                    "popupContent": "This is site {0}".format(site),
                    "style": {
                        "radius": 8,
                        "fillColor": mySites[site]["color"],
                        "color": mySites[site]["color"],
                        "weight": 1.5,
                        "opacity": 1,
                        "fillOpacity": 1,
                    },
                    "highlight_style": {"radius": 12},
                },
                "info": {"content": mySites[site]["webContent"]},
                "id": "{0}".format(site),
                "geometry": {"type": "Point", "coordinates": mySites[site]["loc"]},
            }
        )
    geoJSONData = {
        "type": "FeatureCollection",
        "features": features,
        "stats": get_statistics("topology_site", features, color="fillColor"),
    }
    return geoJSONData


def format_topology_link_webcontent(topology, logger):
    """
    generate info content for each link
    """
    myLinks = {}
    for link in topology.get_links(isWireless=True):
        ANode = topology.get_a_node(link)
        ZNode = topology.get_z_node(link)
        ANodeGolay = topology.get_golay(ANode, ZNode)
        ZNodeGolay = topology.get_golay(ZNode, ANode)
        ANodeLoc = topology.get_location(ANode)
        ZNodeLoc = topology.get_location(ZNode)
        # skip if cannot get location
        if ANodeLoc is None or ZNodeLoc is None:
            logger.debug("Link {0} has no location info".format(link))
            logger.debug("{0} loc {1}".format(ANode, ANodeLoc))
            logger.debug("{0} loc {1}".format(ZNode, ZNodeLoc))
            continue
        # initialize contents
        if link not in myLinks:
            myLinks[link] = {"webContent": ""}
        # generate webContent
        contents = '<div class="container topo_container">'
        contents += (
            "<div class='row'><div class='col-4'>Link Distance</div>"
            + "<div class='col-8'>{0:.1f}m</div></div>".format(
                topology.get_distance(ANode, ZNode)
            )
            + "<div class='row'><div class='col-4'>Node Name</div>"
            + "<div class='col-4'>{0}</div>".format(ANode)
            + "<div class='col-4'>{0}</div></div>".format(ZNode)
            + "<div class='row'><div class='col-4'>txGolayIdx</div>"
            + "<div class='col-4'>{0}</div>".format(ANodeGolay[0])
            + "<div class='col-4'>{0}</div>".format(ZNodeGolay[0])
            + "</div>"
            + "<div class='row'><div class='col-4'>rxGolayIdx</div>"
            + "<div class='col-4'>{0}</div>".format(ANodeGolay[1])
            + "<div class='col-4'>{0}</div>".format(ZNodeGolay[1])
            + "</div>"
        )
        contents += "</div>"
        myLinks[link]["webContent"] = contents
        # color code golay
        myLinks[link]["color"] = KEY.COLOR_GREY
        nodeGolays = ANodeGolay + ZNodeGolay
        if not nodeGolays.count(nodeGolays[0]) == len(nodeGolays):
            myLinks[link]["color"] = KEY.COLOR_RED
        elif nodeGolays[0] is 0:
            myLinks[link]["color"] = KEY.COLOR_BRICKRED
        elif nodeGolays[0] is 1:
            myLinks[link]["color"] = KEY.COLOR_LIGHTGREEN
        elif nodeGolays[0] is 2:
            myLinks[link]["color"] = KEY.COLOR_GOLDBROWN
        elif nodeGolays[0] is 3:
            myLinks[link]["color"] = KEY.COLOR_GREYBLUE
        # coordinates
        myLinks[link]["coordinates"] = [
            [ANodeLoc["longitude"], ANodeLoc["latitude"]],
            [ZNodeLoc["longitude"], ZNodeLoc["latitude"]],
        ]
    return myLinks


def get_geojson_for_topology_link(topology, logger):
    """
    generate geoJSON format for topology links
    """
    myLinks = format_topology_link_webcontent(topology, logger)
    features = []
    for link in myLinks:
        # basic link
        features.append(
            {
                "type": "Feature",
                "properties": {
                    "popupContent": "Link {0}".format(link),
                    "style": {"weight": 3, "color": myLinks[link]["color"]},
                    "highlight_style": {"weight": 7},
                },
                "info": {"content": myLinks[link]["webContent"]},
                "id": "{0}".format(link),
                "geometry": {
                    "type": "LineString",
                    "coordinates": myLinks[link]["coordinates"],
                },
            }
        )
    geoJSONData = {
        "type": "FeatureCollection",
        "features": features,
        "stats": get_statistics("topology_link", features, color="color"),
    }
    return geoJSONData


def get_color_words(result, mykey, fieldname):
    """
    retrieve color and health status for given fieldname
    and key
    """
    aColor = assign_color(fieldname, result[KEY.A2Z].get(mykey, -1))
    zColor = assign_color(fieldname, result[KEY.Z2A].get(mykey, -1))
    aHealth = get_color_meanings(fieldname, aColor)
    zHealth = get_color_meanings(fieldname, zColor)
    return aColor, zColor, aHealth, zHealth


def format_iperf_monitor_webcontent_each(result, key, aNode, zNode, method):
    """
    generate the webcontent for each result for label (as key)
    """
    aBoxColor, zBoxColor, aBoxHealth, zBoxHealth = get_color_words(
        result, KEY.LB_MISALIGNMENT, "box_alignment"
    )
    contents = '<div class="container health_container">'
    contents += wrap_row(
        "<div class='col-4'>Distance: {0:.1f} m<br>".format(
            result.get(KEY.DISTANCE, float("nan"))
        )
        + (
            "<a href='{0}' target='_blank'>dashboard</a>".format(
                result.get(KEY.DASHBOARD, "")
            )
            if result.get(KEY.DASHBOARD, "")
            else ""
        )
        + "</div><div class='col-4'><b><a href='#node-{0}'>{0}</a></b>".format(aNode)
        + "<br>&darr;<br><a href='#node-{0}'>{0}</a></div>".format(zNode)
        + "<div class='col-4'><b><a href='#node-{0}'>{0}</a></b>".format(zNode)
        + "<br>&darr;<br><a href='#node-{0}'>{0}</a></div>".format(aNode)
    )
    contents += wrap_row(
        "<div class='col-4'>Alignment</div>"
        + "<div class='col-4' style='color:{0}'>{1}</div>".format(aBoxColor, aBoxHealth)
        + "<div class='col-4' style='color:{0}'>{1}</div>".format(zBoxColor, zBoxHealth)
    )
    contents += wrap_row(
        "<div class='col-4'>Degree as tx/rx</div>"
        + "<div class='col-4'>{0:.1f}/{1:.1f}</div>".format(
            result[KEY.A2Z].get(KEY.BEAM_TX_ANG, float("nan")),
            result[KEY.A2Z].get(KEY.BEAM_RX_ANG, float("nan")),
        )
        + "<div class='col-4'>{0:.1f}/{1:.1f}</div>".format(
            result[KEY.Z2A].get(KEY.BEAM_TX_ANG, float("nan")),
            result[KEY.Z2A].get(KEY.BEAM_RX_ANG, float("nan")),
        )
    )
    aColor, zColor, aHealth, zHealth = get_color_words(result, key, "link_healthiness")
    contents += wrap_row(
        "<div class='col-4'>Healthiness</div>"
        + "<div class='col-4' style='color:{0}'>{1}</div>".format(aColor, aHealth)
        + "<div class='col-4' style='color:{0}'>{1}</div>".format(zColor, zHealth)
    )
    mcsP90Key = KEY.ODS_STA_MCS.replace(KEY.ODS_STA_PRE + ".", "") + "_p90"
    contents += wrap_row(
        "<div class='col-4'>MCS (90% >)</div>"
        + "<div class='col-4'>{0:.0f}</div>".format(
            result[KEY.A2Z].get(mcsP90Key, float("nan"))
        )
        + "<div class='col-4'>{0:.0f}</div>".format(
            result[KEY.Z2A].get(mcsP90Key, float("nan"))
        )
    )
    perAvgKey = KEY.ODS_STA_PER.replace(KEY.ODS_STA_PRE + ".", "") + "_avg"
    contents += wrap_row(
        "<div class='col-4'>Avg PER</div>"
        + "<div class='col-4'>{0:.1f}%</div>".format(
            result[KEY.A2Z].get(perAvgKey, float("nan"))
        )
        + "<div class='col-4'>{0:.1f}%</div>".format(
            result[KEY.Z2A].get(perAvgKey, float("nan"))
        )
    )
    if not method == "monitor":
        contents += wrap_row(
            "<div class='col-4'>Avg Rate (&plusmn;)</div>"
            + "<div class='col-4'>{0:.1f} (&plusmn;{1:.1f}) Mbps</div>".format(
                result[KEY.A2Z].get(KEY.IPERF_DETAILS + "_avg", float("nan")),
                result[KEY.A2Z].get(KEY.IPERF_DETAILS + "_std", float("nan")),
            )
            + "<div class='col-4'>{0:.1f} (&plusmn;{1:.1f}) Mbps</div>".format(
                result[KEY.Z2A].get(KEY.IPERF_DETAILS + "_avg", float("nan")),
                result[KEY.Z2A].get(KEY.IPERF_DETAILS + "_std", float("nan")),
            )
        )
        contents += wrap_row(
            "<div class='col-4'>Target Rate</div>"
            + "<div class='col-4'>{0}</div>".format(
                result[KEY.A2Z].get(KEY.TARGET_BITRATE)
            )
            + "<div class='col-4'>{0}</div>".format(
                result[KEY.Z2A].get(KEY.TARGET_BITRATE)
            )
        )
        contents += wrap_row(
            "<div class='col-4'>Ping Latency (&plusmn;)</div>"
            + "<div class='col-4'>{0:.1f} (&plusmn;{1:.1f}) ms</div>".format(
                result[KEY.A2Z].get(KEY.PING_DETAILS + "_avg", float("nan")),
                result[KEY.A2Z].get(KEY.PING_DETAILS + "_std", float("nan")),
            )
            + "<div class='col-4'>{0:.1f} (&plusmn;{1:.1f}) ms</div>".format(
                result[KEY.Z2A].get(KEY.PING_DETAILS + "_avg", float("nan")),
                result[KEY.Z2A].get(KEY.PING_DETAILS + "_std", float("nan")),
            )
        )
    contents += wrap_row(
        "<div class='col-4'>Avg Pathloss (&plusmn;)</div>"
        + "<div class='col-4'>{0:.1f} (&plusmn;{1:.1f}) dB</div>".format(
            result[KEY.A2Z].get(KEY.PATHLOSS + "_avg", float("nan")),
            result[KEY.A2Z].get(KEY.PATHLOSS + "_std", float("nan")),
        )
        + "<div class='col-4'>{0:.1f} (&plusmn;{1:.1f}) dB</div>".format(
            result[KEY.Z2A].get(KEY.PATHLOSS + "_avg", float("nan")),
            result[KEY.Z2A].get(KEY.PATHLOSS + "_std", float("nan")),
        )
    )
    contents += wrap_row(
        "<div class='col-4'>Avg RSSI (&plusmn;)</div>"
        + "<div class='col-4'>{0:.1f} (&plusmn;{1:.1f}) dB</div>".format(
            result[KEY.Z2A].get(KEY.ODS_RSSI + "_avg", float("nan")),
            result[KEY.Z2A].get(KEY.ODS_RSSI + "_std", float("nan")),
        )
        + "<div class='col-4'>{0:.1f} (&plusmn;{1:.1f}) dB</div>".format(
            result[KEY.A2Z].get(KEY.ODS_RSSI + "_avg", float("nan")),
            result[KEY.A2Z].get(KEY.ODS_RSSI + "_std", float("nan")),
        )
    )
    contents += wrap_row(
        "<div class='col-4'>Avg SNR (&plusmn;)</div>"
        + "<div class='col-4'>{0:.1f} (&plusmn;{1:.1f}) dB</div>".format(
            result[KEY.Z2A].get(KEY.ODS_SNR + "_avg", float("nan")),
            result[KEY.Z2A].get(KEY.ODS_SNR + "_std", float("nan")),
        )
        + "<div class='col-4'>{0:.1f} (&plusmn;{1:.1f}) dB</div>".format(
            result[KEY.A2Z].get(KEY.ODS_SNR + "_avg", float("nan")),
            result[KEY.A2Z].get(KEY.ODS_SNR + "_std", float("nan")),
        )
    )
    txPwrKey = KEY.ODS_STA_TX_PWR.replace(KEY.ODS_STA_PRE + ".", "")
    contents += wrap_row(
        "<div class='col-4'>Avg TxPwrIdx (&plusmn;)</div>"
        + "<div class='col-4'>{0:.1f} (&plusmn;{1:.1f}) </div>".format(
            result[KEY.A2Z].get(txPwrKey + "_avg", float("nan")),
            result[KEY.A2Z].get(txPwrKey + "_std", float("nan")),
        )
        + "<div class='col-4'>{0:.1f} (&plusmn;{1:.1f}) </div>".format(
            result[KEY.Z2A].get(txPwrKey + "_avg", float("nan")),
            result[KEY.Z2A].get(txPwrKey + "_std", float("nan")),
        )
    )
    # foliage
    foColor = assign_color("foliage", result.get(KEY.LB_FOLIAGE, -1))
    foWord = get_color_meanings("foliage", foColor)
    contents += wrap_row(
        "<div class='col-4'>Foliage</div>"
        + "<div class='col-8' style='color:{0}'>{1}</div>".format(foColor, foWord)
    )

    # fairness and slot percentage related
    txUtilRatio = KEY.ODS_STA_TX_EFF.replace(KEY.ODS_STA_PRE + ".", "")
    contents += wrap_row(
        "<div class='col-4'>Utilization Ratio (&plusmn;)</div>"
        + "<div class='col-4'>{0:.1f}% (&plusmn;{1:.1f}) </div>".format(
            result[KEY.A2Z].get(txUtilRatio + "_avg", float("nan")),
            result[KEY.A2Z].get(txUtilRatio + "_std", float("nan")),
        )
        + "<div class='col-4'>{0:.1f}% (&plusmn;{1:.1f}) </div>".format(
            result[KEY.Z2A].get(txUtilRatio + "_avg", float("nan")),
            result[KEY.Z2A].get(txUtilRatio + "_std", float("nan")),
        )
    )
    txSlotPerc = KEY.ODS_BWHAN_TX_SLOT_PERC.replace(KEY.ODS_BWHAN_PRE + ".", "")
    contents += wrap_row(
        "<div class='col-4'>TxSlot Percent (&plusmn;)</div>"
        + "<div class='col-4'>{0:.1f}% (&plusmn;{1:.1f})</div>".format(
            result[KEY.A2Z].get(txSlotPerc + "_avg", float("nan")),
            result[KEY.A2Z].get(txSlotPerc + "_std", float("nan")),
        )
        + "<div class='col-4'>{0:.1f}% (&plusmn;{1:.1f})</div>".format(
            result[KEY.Z2A].get(txSlotPerc + "_avg", float("nan")),
            result[KEY.Z2A].get(txSlotPerc + "_std", float("nan")),
        )
    )
    rxSlotPerc = KEY.ODS_BWHAN_RX_SLOT_PERC.replace(KEY.ODS_BWHAN_PRE + ".", "")
    contents += wrap_row(
        "<div class='col-4'>RxSlot Percent (&plusmn;)</div>"
        + "<div class='col-4'>{0:.1f}% (&plusmn;{1:.1f})</div>".format(
            result[KEY.Z2A].get(rxSlotPerc + "_avg", float("nan")),
            result[KEY.Z2A].get(txSlotPerc + "_std", float("nan")),
        )
        + "<div class='col-4'>{0:.1f}% (&plusmn;{1:.1f})</div>".format(
            result[KEY.A2Z].get(rxSlotPerc + "_avg", float("nan")),
            result[KEY.A2Z].get(txSlotPerc + "_std", float("nan")),
        )
    )
    contents += "</div>"
    return contents, [aColor, zColor]


def format_iperf_monitor_webcontent(result, topology, logger, method):
    """
    generate iperf/monitor info content for each link
    """
    if method == "udp":
        myKey = KEY.LB_UDP_STATUS
    elif method == "tcp":
        myKey = KEY.LB_TCP_STATUS
    elif method == "monitor":
        myKey = KEY.LB_MON_STATUS
    else:
        return {}
    myLinks = {}
    for link in result:
        ANode = topology.get_a_node(link)
        ZNode = topology.get_z_node(link)
        ANodeLoc = topology.get_location(ANode)
        ZNodeLoc = topology.get_location(ZNode)
        # skip if cannot get location
        if ANodeLoc is None or ZNodeLoc is None:
            logger.debug("Link {0} has no location info".format(link))
            logger.debug("{0} loc {1}".format(ANode, ANodeLoc))
            logger.debug("{0} loc {1}".format(ZNode, ZNodeLoc))
            continue
        bilinkColor = assign_color("link_healthiness", result[link].get(myKey, -1))
        # initialize contents
        if link not in myLinks:
            myLinks[link] = {"webContent": ""}
        # generate webContent
        myLinks[link][
            "webContent"
        ], unilinkColors = format_iperf_monitor_webcontent_each(
            result[link], myKey, ANode, ZNode, method
        )
        # color code healthiness
        myLinks[link]["color"] = bilinkColor
        # hack summary for unidirectional link healthiness
        myLinks[link]["unicolor"] = unilinkColors
        if not topology.is_alive(link):
            myLinks[link]["color"] = KEY.COLOR_BLACK
            myLinks[link]["unicolor"] = [KEY.COLOR_BLACK] * 2
        # coordinates
        myLinks[link]["coordinates"] = [
            [ANodeLoc["longitude"], ANodeLoc["latitude"]],
            [ZNodeLoc["longitude"], ZNodeLoc["latitude"]],
        ]
        # node names
        myLinks[link]["nodes"] = [ANode, ZNode]
    return myLinks


def get_geojson_for_iperf_monitor(result, topology, logger, method):
    """
    generate geoJSON format for iperf or monitor analysis
    """
    myLinks = format_iperf_monitor_webcontent(result, topology, logger, method)
    features = []
    unlinkColors = []
    for link in myLinks:
        # basic link
        features.append(
            {
                "type": "Feature",
                "properties": {
                    "popupContent": "Link {0}".format(link),
                    "style": {"weight": 3, "color": myLinks[link]["color"]},
                    "highlight_style": {"weight": 7},
                },
                "info": {"content": myLinks[link]["webContent"]},
                "id": "{0}".format(link),
                "geometry": {
                    "type": "LineString",
                    "coordinates": myLinks[link]["coordinates"],
                },
            }
        )
        unlinkColors += myLinks[link]["unicolor"]
    geoJSONData = {
        "type": "FeatureCollection",
        "features": features,
        "stats2": get_statistics_from_list("link_healthiness", unlinkColors),
    }
    return geoJSONData


def format_multihop_node_webcontent_each(
    multihopNode, node_name, topology, aColor, zColor, aHealth, zHealth, target_rate
):
    """
    generate info content for each node based
    on multihop results
    """
    content = '<div class="container multihop_container">'
    a2z_path = multihopNode[KEY.A2Z]
    a2z_path_name = a2z_path["path_name"].split("To")
    z2a_path = multihopNode[KEY.Z2A]
    z2a_path_name = z2a_path["path_name"].split("To")
    content += wrap_row(
        "<div class='col-4'>Multihop<br>Result</div>"
        + "<div class='col-4'><b>{}</b><br>&darr;<br><b>{}</b></div>".format(
            a2z_path_name[0], a2z_path_name[1]
        )
        + "<div class='col-4'><b>{}</b><br>&darr;<br><b>{}</b></div>".format(
            z2a_path_name[0], z2a_path_name[1]
        )
    )
    content += wrap_row(
        "<div class='col-4'>Healthiness</div>"
        + "<div class='col-4' style='color:{0}'>{1}</div>".format(aColor, aHealth)
        + "<div class='col-4' style='color:{0}'>{1}</div>".format(zColor, zHealth)
    )
    content += wrap_row(
        "<div class='col-4'>Target Rate</div>"
        + "<div class='col-4'>{0} </div>".format(target_rate)
        + "<div class='col-4'>{0} </div>".format(target_rate)
    )
    content += wrap_row(
        "<div class='col-4'>Avg Rate (&plusmn;)</div>"
        + "<div class='col-4'>{0:.1f} (&plusmn;{1:.1f}) Mbps</div>".format(
            a2z_path.get(KEY.IPERF_DETAILS + "_avg", float("nan")),
            a2z_path.get(KEY.IPERF_DETAILS + "_std", float("nan")),
        )
        + "<div class='col-4'>{0:.1f} (&plusmn;{1:.1f}) Mbps</div>".format(
            z2a_path.get(KEY.IPERF_DETAILS + "_avg", float("nan")),
            z2a_path.get(KEY.IPERF_DETAILS + "_std", float("nan")),
        )
    )
    content += wrap_row(
        "<div class='col-4'>ReTransmissions</div>"
        + "<div class='col-4'>{0} </div>".format(
            a2z_path.get("iperf_tcp_retrans", "nan")
        )
        + "<div class='col-4'>{0} </div>".format(
            z2a_path.get("iperf_tcp_retrans", "nan")
        )
    )
    content += wrap_row(
        "<div class='col-4'>Avg Latency (&plusmn;)</div>"
        + "<div class='col-4'>{0:.1f} (&plusmn;{1:.1f}) ms</div>".format(
            a2z_path.get(KEY.PING_DETAILS + "_avg", float("nan")),
            a2z_path.get(KEY.PING_DETAILS + "_std", float("nan")),
        )
        + "<div class='col-4'>{0:.1f} (&plusmn;{1:.1f}) ms</div>".format(
            z2a_path.get(KEY.PING_DETAILS + "_avg", float("nan")),
            z2a_path.get(KEY.PING_DETAILS + "_std", float("nan")),
        )
    )
    content += wrap_row(
        "<div class='col-4'>Per Hop Latency </div>"
        + "<div class='col-4'>{0:.1f} ms</div>".format(
            a2z_path.get("per_hop_latency", float("nan"))
        )
        + "<div class='col-4'>{0:.1f} ms</div>".format(
            z2a_path.get("per_hop_latency", float("nan"))
        )
    )
    content += wrap_row(
        "<div class='col-4'>Wireless Hop Count</div>"
        + "<div class='col-4'>{0} </div>".format(
            a2z_path.get("wireless_hop_count", float("nan"))
        )
        + "<div class='col-4'>{0} </div>".format(
            z2a_path.get("wireless_hop_count", float("nan"))
        )
    )
    a2z_wireless_links = a2z_path.get("dominant_wireless_path", ["nan"])
    z2a_wireless_links = z2a_path.get("dominant_wireless_path", ["nan"])
    wireless_path_content = "<div class='col-4'>Wireless<br>\
       Path</div><div class='col-4'>"
    for link in a2z_wireless_links:
        wireless_path_content += "<a href='#{0}'>{0}</a><br>".format(
            get_link_id(link, topology)
        )
    wireless_path_content += "</div><div class='col-4'>"
    for link in z2a_wireless_links:
        wireless_path_content += "<a href='#{0}'>{0}</a><br>".format(
            get_link_id(link, topology)
        )
    wireless_path_content += "</div>"
    content += wrap_row(wireless_path_content)
    content += "</div>"
    multihopNode["webContent"] = content


def format_multihop_node_webcontent(result, topology, logger, key, args):
    """
    format multihop results to a node-based dictionary
    with web contents showing multihop paths
    """
    multihopNodeResults = {}
    for path, data in result.items():
        if any(x in path for x in ["pop", "vm"]):
            endNodes = path.split("-")
            if endNodes[1] in ("pop", "vm"):
                node_name = "-".join(endNodes[2:])
                multihopNodeResults[node_name] = {}
                a2z_pathname = "{}To{}".format(endNodes[1], node_name)
                z2a_pathname = "{}To{}".format(node_name, endNodes[1])
                multihopNodeResults[node_name][KEY.A2Z] = data[KEY.A2Z]
                multihopNodeResults[node_name][KEY.A2Z]["path_name"] = a2z_pathname
                multihopNodeResults[node_name][KEY.Z2A] = data[KEY.Z2A]
                multihopNodeResults[node_name][KEY.Z2A]["path_name"] = z2a_pathname
            else:
                node_name = "-".join(endNodes[1 : len(endNodes) - 1])
                multihopNodeResults[node_name] = {}
                a2z_pathname = "{}To{}".format(endNodes[-1], node_name)
                z2a_pathname = "{}To{}".format(node_name, endNodes[-1])
                multihopNodeResults[node_name][KEY.A2Z] = data[KEY.Z2A]
                multihopNodeResults[node_name][KEY.A2Z]["path_name"] = a2z_pathname
                multihopNodeResults[node_name][KEY.Z2A] = data[KEY.A2Z]
                multihopNodeResults[node_name][KEY.Z2A]["path_name"] = z2a_pathname
        location = topology.get_location(node_name)
        multihopNodeResults[node_name]["location"] = location
        multihopNodeResults[node_name]["color"] = assign_color("multihop", data[key])
        aColor, zColor, aHealth, zHealth = get_color_words(
            multihopNodeResults[node_name], key, "multihop"
        )
        get_node_angle(
            topology, node_name, multihopNodeResults[node_name], location, logger
        )
        if args["direction"] == KEY.SOUTHBOUND:
            multihopNodeResults[node_name]["uniDirColor"] = [aColor]
            multihopNodeResults[node_name]["health"] = [aHealth]
        elif args["direction"] == KEY.NORTHBOUND:
            multihopNodeResults[node_name]["uniDirColor"] = [zColor]
            multihopNodeResults[node_name]["health"] = [zHealth]
        else:
            multihopNodeResults[node_name]["uniDirColor"] = [aColor, zColor]
            multihopNodeResults[node_name]["health"] = [aHealth, zHealth]
        format_multihop_node_webcontent_each(
            multihopNodeResults[node_name],
            node_name,
            topology,
            aColor,
            zColor,
            aHealth,
            zHealth,
            args["target_rate"],
        )
    return multihopNodeResults


def get_link_id(link_name, topology):
    """
    get link_id from link_name
    """
    if not topology.is_link_wireless(link_name):
        nodeA, nodeZ = topology.get_nodes_from_link(link_name)
        link_name = "link-{}-{}".format(nodeZ, nodeA)
    return link_name


def get_geojson_for_multihop(result, topology, logger, args):
    """
    generate geojson for multihop
    """
    # get status key based on traffic type
    if args["traffic_type"] == "tcp":
        key = KEY.LB_TCP_STATUS
    elif args["traffic_type"] == "udp":
        key = KEY.LB_UDP_STATUS
    else:
        return {}
    multihopNodeResults = format_multihop_node_webcontent(
        result, topology, logger, key, args
    )
    node_features = []
    uniDirColors = []
    for node_name in multihopNodeResults:
        location = multihopNodeResults[node_name]["location"]
        node_features.append(
            {
                "type": "Feature",
                "properties": {
                    "popupContent": "This is node {}".format(node_name),
                    "style": {
                        "radius": 19,
                        "fillColor": multihopNodeResults[node_name]["color"],
                        "color": "black",
                        "weight": 1.5,
                        "opacity": 1,
                        "fillOpacity": 1,
                    },
                    "towards_style": {"radius": 25, "opacity": 1, "fillOpacity": 1},
                    "highlight_style": {"radius": 25},
                },
                "info": {"content": multihopNodeResults[node_name]["webContent"]},
                "id": "{0}".format(node_name),
                "geometry": {
                    "type": "Point",
                    "coordinates": (location["longitude"], location["latitude"]),
                },
            }
        )
        uniDirColors += multihopNodeResults[node_name]["uniDirColor"]
        if multihopNodeResults[node_name]["direction"]:
            node_features[-1]["properties"]["direction"] = multihopNodeResults[
                node_name
            ]["direction"]
            node_features[-1]["properties"]["size"] = 20
        towards_links = []
        wireless_path = []
        if ("dominant_wireless_path" in multihopNodeResults[node_name][KEY.A2Z]) and (
            multihopNodeResults[node_name][KEY.A2Z]["dominant_wireless_path"]
        ):
            wireless_path = multihopNodeResults[node_name][KEY.A2Z][
                "dominant_wireless_path"
            ]
        elif ("dominant_wireless_path" in multihopNodeResults[node_name][KEY.Z2A]) and (
            multihopNodeResults[node_name][KEY.Z2A]["dominant_wireless_path"]
        ):
            wireless_path = multihopNodeResults[node_name][KEY.Z2A][
                "dominant_wireless_path"
            ]
        if wireless_path:
            towards_links = []
            for link_name in wireless_path:
                link_id = get_link_id(link_name, topology)
                towards_links.append(link_id + "_mh")
            node_features[-1]["towards"] = towards_links

    geoJSONData = {
        "type": "FeatureCollection",
        "stats": get_statistics_from_list("multihop", uniDirColors),
    }
    # add topology link features
    link_geojson = get_geojson_for_topology_link(topology, logger)
    for link in link_geojson["features"]:
        if topology.is_alive(link["id"]):
            link["properties"]["style"]["color"] = "grey"
        else:
            link["properties"]["style"]["color"] = "black"
        link["properties"]["towards_style"] = {"weight": 5, "color": KEY.COLOR_DARKBLUE}
        link["properties"]["highlight_style"] = {"weight": 3}
        link["id"] = link["id"] + "_mh"
    # add site features to geojson
    site_features = []
    get_geojson_for_overview_site(site_features, result, topology, logger)
    geoJSONData["features"] = link_geojson["features"] + node_features + site_features
    return geoJSONData


def get_geojson_for_overview_site(features, results, topology, logger):
    """
    append features of sites for overview
    """
    # get whatever site originally displays
    contents = format_topology_site_webcontent(topology, logger)
    for site in contents:
        features.append(
            {
                "type": "Feature",
                "properties": {
                    "popupContent": "This is site {0}".format(site),
                    "style": {
                        "radius": 6,
                        "fillColor": contents[site]["popColor"],
                        "color": "black",
                        "weight": 1.5,
                        "fillOpacity": 1,
                        "opacity": 0.5,
                    },
                    "highlight_style": {
                        "radius": 9,
                        "fillColor": contents[site]["color"],
                        "weight": 0,
                        "fillOpacity": 1,
                    },
                },
                "towards": contents[site]["towards"],
                "info": {"content": contents[site]["webContent"]},
                "id": "{0}".format(site),
                "geometry": {"type": "Point", "coordinates": contents[site]["loc"]},
            }
        )


def add_webcontent_to_overview_node(contents, snapshot, daysum, topology):
    """
    for overview, we add more info, e.g., connectivity
    """
    for node in contents:
        # strip last "</div>"
        content = contents[node]["webContent"][:-6]
        # add average connectivity analysis
        content += wrap_row(
            "Potential connectivity (with 30-day analysis):", extraClass="mt-2"
        )
        links = topology.get_link_name(node)
        for link in links:
            if link not in daysum:
                continue
            aNode = topology.get_a_node(link)
            if aNode == node:
                cx = daysum[link].get(KEY.A2Z, {}).get(KEY.CONNECTIVITY, {})
            else:
                cx = daysum[link].get(KEY.Z2A, {}).get(KEY.CONNECTIVITY, {})
            if not cx:
                continue
            for towards in cx:
                for each in cx[towards]:
                    snrinfo = "<br>max SNR = {0:.1f}dB".format(each[2])
                    if len(each) > 3:
                        snrinfo = "<br>max SNR = {0:.1f} (&plusmn;{1:.1f})dB".format(
                            each[2], each[3]
                        )
                    content += wrap_row(
                        "<div class='col-4'><a href='#node-{0}'>{0}</a></div>".format(
                            towards
                        )
                        + "<div class='col-8'>via beamIdx {0}&rarr;{1}".format(
                            each[0], each[1]
                        )
                        + snrinfo
                        + "</div>"
                    )
        contents[node]["webContent"] = content + "</div>"
    return contents


def get_geojson_for_overview_node(features, results, topology, logger):
    """
    append features of nodes for overview
    """
    snapshot, daysum = results
    # get whatever node originally displays - polarity and rxMCS
    contents = format_topology_node_webcontent(topology, logger)
    # add other info - historical average, and update contents
    contents = add_webcontent_to_overview_node(contents, snapshot, daysum, topology)

    # TODO: to add multihop iperf/ping/hop_num info to node overview

    for node in contents:
        features.append(
            {
                "type": "Feature",
                "properties": {
                    "popupContent": "This is node {0}".format(node),
                    "style": {
                        "radius": 19,
                        "fillColor": "white",
                        "color": "black",
                        "weight": 1.5,
                        "opacity": 0.4,
                        "fillOpacity": 0.4,
                    },
                    "towards_style": {"radius": 25, "opacity": 1, "fillOpacity": 1},
                    "highlight_style": {
                        "radius": 25,
                        "fillColor": contents[node]["fillColor"],
                        "weight": 0,
                        "opacity": 1,
                        "fillOpacity": 1,
                    },
                },
                "info": {"content": contents[node]["webContent"]},
                "towards": contents[node]["towards"],
                "id": "{0}".format(node),
                "geometry": {"type": "Point", "coordinates": contents[node]["loc"]},
            }
        )
        # convert to semicircle if necessary
        if contents[node]["direction"]:
            features[-1]["properties"]["direction"] = contents[node]["direction"]
            features[-1]["properties"]["size"] = 20


def get_geojson_for_overview_link(features, results, topology, logger):
    """
    append features of links for overview
    """
    snapshot, daysum = results
    # get whatever iperf originally displays
    contents = format_iperf_monitor_webcontent(snapshot, topology, logger, "udp")
    unlinkColors = []
    for link in contents:
        features.append(
            {
                "type": "Feature",
                "properties": {
                    "popupContent": "Link {0}".format(link),
                    "style": {"weight": 3, "color": contents[link]["color"]},
                    "highlight_style": {"weight": 7},
                },
                "towards": contents[link]["nodes"],
                "info": {"content": contents[link]["webContent"]},
                "id": "{0}".format(link),
                "geometry": {
                    "type": "LineString",
                    "coordinates": contents[link]["coordinates"],
                },
            }
        )
        unlinkColors += contents[link]["unicolor"]
    return unlinkColors


def get_geojson_for_overview(results, topology, logger):
    """
    generate geojson for overview
    """
    features = []
    # include link features in the overview geoJson
    unlinkColors = get_geojson_for_overview_link(features, results, topology, logger)
    # include node features in the overview geoJson
    get_geojson_for_overview_node(features, results, topology, logger)
    # include site features in the overview geoJson
    get_geojson_for_overview_site(features, results, topology, logger)
    geoJSONData = {
        "type": "FeatureCollection",
        "features": features,
        "stats2": get_statistics_from_list("link_healthiness", unlinkColors),
    }
    return geoJSONData


def get_geojson_for_topology(topology, logger):
    """
    generate geoJSON format for topology
    """
    geoJSONs = {}
    geoJSONs["node"] = get_geojson_for_topology_node(topology, logger)
    geoJSONs["site"] = get_geojson_for_topology_site(topology, logger)
    geoJSONs["link"] = get_geojson_for_topology_link(topology, logger)
    return geoJSONs


def get_geojson(fieldname, result, topology, logger, args=None):
    """
    wrapper function to get geojson
    """
    data = None
    if "interference" in fieldname:
        data = get_geojson_for_interference(result, topology)
    elif "iperf_p2p" in fieldname:
        method = fieldname.replace("iperf_p2p_", "")
        data = get_geojson_for_iperf_monitor(result, topology, logger, method)
    elif "monitor_r2d2" in fieldname:
        data = get_geojson_for_iperf_monitor(result, topology, logger, "monitor")
    elif "connectivity" in fieldname:
        data = get_geojson_for_connectivity(result, topology)
    elif "multihop" in fieldname:
        data = get_geojson_for_multihop(result, topology, logger, args)
    elif "topology" == fieldname:
        data = get_geojson_for_topology(topology, logger)
    elif "overview" == fieldname:
        data = get_geojson_for_overview(result, topology, logger)
    return data
