#!/usr/bin/env python3

# import json
from modules.util_math import compute_angle, compute_cart_vector, cos, sin


def connectivity_graph_gen(result, data):
    """
    generate a connectivity graph based on tg scan
    the graph is suitable to use with sigma.js
    """
    json_graph = {"nodes": [], "edges": []}
    initial_loc = []
    # get all nodes and their locations
    for node in data.topology.get_all_nodes():
        node_loc = data.topology.get_location(node)
        if not initial_loc:
            initial_loc = (node_loc["longitude"], node_loc["latitude"])
        x, y = compute_cart_vector(
            node_loc["longitude"],
            -node_loc["latitude"],
            initial_loc[0],
            -initial_loc[1],
        )
        linked_nodes = data.topology.get_linked_sector(node)
        if linked_nodes:
            linked_node = linked_nodes[0]
            ref_node_loc = data.topology.get_location(linked_node)
            angle = compute_angle(
                (node_loc["longitude"], node_loc["latitude"]),
                (ref_node_loc["longitude"], ref_node_loc["latitude"]),
            )
            x += -cos(angle) * 0.5
            y += sin(angle) * 0.5
            json_graph["nodes"].append(
                {"id": node, "label": node, "x": x, "y": y, "size": 2}
            )
    for tx in result:
        for rx in result[tx]:
            for each in result[tx][rx]:
                txIdx, rxIdx, txSnr = each
                json_graph["edges"].append(
                    {
                        "id": "{0}__{1}:{2}".format(tx, rx, txIdx),
                        "source": tx,
                        "target": rx,
                        "label": "tx {0}; rx {1}; snr {2}".format(txIdx, rxIdx, txSnr),
                    }
                )
    return json_graph
