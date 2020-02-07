/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */
import type {
  LinkMap,
  NodeMap,
  SiteMap,
  SiteToNodesMap,
} from '../NetworkContext';
import type {TopologyType} from '../../shared/types/Topology';

export type TopologyMaps = {|
  nodeMap: NodeMap,
  siteMap: SiteMap,
  linkMap: LinkMap,
  siteToNodesMap: SiteToNodesMap,
|};

export function buildTopologyMaps(topology: TopologyType): TopologyMaps {
  // Build maps from topology element arrays
  const nodeMap = {};
  const linkMap = {};
  const siteMap = {};
  const siteToNodesMap = {};
  topology.sites.forEach(site => {
    siteMap[site.name] = site;
    siteToNodesMap[site.name] = new Set();
  });
  topology.nodes.forEach(node => {
    nodeMap[node.name] = node;
    siteToNodesMap[node.site_name].add(node.name);
  });
  topology.links.forEach(link => {
    linkMap[link.name] = link;
  });

  return {nodeMap, linkMap, siteMap, siteToNodesMap};
}
