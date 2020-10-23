/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */
import * as turf from '@turf/turf';
import {LinkTypeValueMap} from '../../shared/types/Topology';
import {averageAngles} from './MathHelpers';
import type {
  LinkMap,
  MacToNodeMap,
  NodeMap,
  NodeToLinksMap,
  SiteMap,
  SiteToNodesMap,
} from '../contexts/NetworkContext';
import type {NodeType, TopologyType} from '../../shared/types/Topology';

export type TopologyMaps = {|
  nodeMap: NodeMap,
  nodeToLinksMap: NodeToLinksMap,
  siteMap: SiteMap,
  linkMap: LinkMap,
  nodeToLinksMap: NodeToLinksMap,
  siteToNodesMap: SiteToNodesMap,
  macToNodeMap: MacToNodeMap,
|};

export function buildTopologyMaps(topology: TopologyType): TopologyMaps {
  // Build maps from topology element arrays
  const nodeMap = {};
  const linkMap = {};
  const siteMap = {};
  const siteToNodesMap = {};
  const nodeToLinksMap = {};
  const macToNodeMap = {};
  topology.sites.forEach(site => {
    siteMap[site.name] = site;
    siteToNodesMap[site.name] = new Set();
  });
  topology.nodes.forEach(node => {
    nodeMap[node.name] = node;
    siteToNodesMap[node.site_name].add(node.name);
    nodeToLinksMap[node.name] = new Set();
    node.wlan_mac_addrs.forEach(mac => (macToNodeMap[mac] = node.name));
  });
  topology.links.forEach(link => {
    // index links by name
    linkMap[link.name] = link;

    // TODO helper function
    // add link to both sides of nodeToLinksMap
    const {a_node_name: a, z_node_name: z} = link;
    nodeToLinksMap[a].add(link.name);
    nodeToLinksMap[z].add(link.name);
  });

  return {
    nodeMap,
    linkMap,
    siteMap,
    siteToNodesMap,
    nodeToLinksMap,
    macToNodeMap,
  };
}

export function getEstimatedNodeBearing(
  node: NodeType,
  topologyMaps: $Shape<TopologyMaps>,
): ?number {
  const site = topologyMaps.siteMap[node.site_name];
  const peerLocations = getWirelessPeers(node, topologyMaps).map(
    (peerNode: NodeType) => {
      const peerSite = topologyMaps.siteMap[peerNode.site_name];
      return peerSite.location;
    },
  );
  if (peerLocations.length < 1) {
    return null;
  }
  const bearings = peerLocations.map(peerLocation =>
    turf.bearing(
      [site.location.longitude, site.location.latitude, site.location.altitude],
      [peerLocation.longitude, peerLocation.latitude, peerLocation.altitude],
    ),
  );
  const averageBearing = averageAngles(bearings);
  return averageBearing;
}

/*
 * Get the nodes on the other side of this node's wireless links */
export function getWirelessPeers(
  node: NodeType,
  {linkMap, nodeToLinksMap, nodeMap}: TopologyMaps,
): Array<NodeType> {
  const peers: Array<NodeType> = [];
  for (const linkName of Array.from(nodeToLinksMap[node.name] || [])) {
    const link = linkMap[linkName];
    if (link.link_type === LinkTypeValueMap.WIRELESS) {
      // get node on the other side of the link
      const peerName =
        link.a_node_name === node.name ? link.z_node_name : link.a_node_name;
      const peer = nodeMap[peerName];
      if (!peer) {
        console.error(`peer not found: ${peerName}`);
        continue;
      }
      peers.push(peer);
    }
  }

  return peers;
}

/*
 * Get the nodes on the other side of this node's wireless links */
export function getWirelessLinkNames({
  node,
  linkMap,
  nodeToLinksMap,
}: {
  node: NodeType,
  linkMap: LinkMap,
  nodeToLinksMap: NodeToLinksMap,
}): Array<string> {
  const links: Array<string> = [];
  for (const linkName of Array.from(nodeToLinksMap[node.name] || [])) {
    const link = linkMap[linkName];
    if (link.link_type === LinkTypeValueMap.WIRELESS) {
      links.push(linkName);
    }
  }

  return links;
}
