/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */
import type {
  LinkMap,
  MacToNodeMap,
  NodeMap,
  NodeToLinksMap,
  SiteMap,
  SiteToNodesMap,
} from '../contexts/NetworkContext';
import type {TopologyType} from '../../shared/types/Topology';

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
