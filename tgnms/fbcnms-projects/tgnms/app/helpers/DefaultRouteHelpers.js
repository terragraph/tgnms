/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @flow
 * @format
 */

import type {TopologyType} from '../../shared/types/Topology';

export function mapDefaultRoutes({
  mapRoutes,
  topology,
}: {
  mapRoutes: Array<Array<string>>,
  topology: TopologyType,
}) {
  const weights = {};
  const nodes = new Set<string>();
  let max_weight = 0;

  // for each possible route
  mapRoutes.length &&
    mapRoutes.map(route => {
      let prev_node = null;
      // iterate through all nodes
      route.map(node_name => {
        if (prev_node) {
          // find link in topology
          const link = findLinkInTopology(prev_node, node_name, topology);
          if (link) {
            // increment weights for this link
            if (!weights[link.name]) {
              weights[link.name] = 0;
            }
            weights[link.name] += 1;
            // keep track of maximum weight
            max_weight = Math.max(weights[link.name], max_weight);
          }
        }
        prev_node = node_name;
        nodes.add(node_name);
      });
    });

  // normalize weights to [0-1] range
  const normalized_weights = {};
  if (max_weight > 0) {
    Object.keys(weights).forEach(key => {
      normalized_weights[key] = (weights[key] * 1.0) / max_weight;
    });
  }

  return {
    links: normalized_weights,
    nodes,
  };
}

function findLinkInTopology(node1, node2, topology) {
  const link = topology.links.filter(
    link =>
      (link.a_node_name === node1 && link.z_node_name === node2) ||
      (link.a_node_name === node2 && link.z_node_name === node1),
  );
  return link.length ? link[0] : null;
}

export function getNodesInRoute({
  mapRoutes,
}: {
  mapRoutes: Array<Array<string>>,
}) {
  const nodes = new Set<string>();

  // for each possible route
  mapRoutes.length &&
    mapRoutes.map(route => {
      // iterate through all nodes
      route.map(node_name => {
        nodes.add(node_name);
      });
    });

  return nodes;
}
