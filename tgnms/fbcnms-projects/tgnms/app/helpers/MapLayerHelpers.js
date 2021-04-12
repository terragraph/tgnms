/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import {METRIC_COLOR_RANGE} from '@fbcnms/tg-nms/app/constants/LayerConstants';
import {NodeTypeValueMap} from '@fbcnms/tg-nms/shared/types/Topology';
import {SITE_FEATURE_TYPE} from '@fbcnms/tg-nms/app/views/map/NetworkMapTypes';
import {interpolateHcl} from 'd3-interpolate';
import {scaleLinear} from 'd3-scale';
import type {
  LinkFeature,
  MapFeatureTopology,
  NodeFeature,
  SiteFeature,
} from '@fbcnms/tg-nms/app/views/map/NetworkMapTypes';
import type {
  LinkType,
  NodeType,
  SiteType,
  TopologyType,
} from '@fbcnms/tg-nms/shared/types/Topology';

/**
 * Makes a function which maps from the input domain to the provided color range
 * Colors are linearly interpolated between stops.
 */
export function makeRangeColorFunc(
  domain: Array<number>,
  colorRange: ?Array<string>,
): (value: number) => string {
  return scaleLinear()
    .domain(domain)
    .range(colorRange || METRIC_COLOR_RANGE)
    .interpolate(interpolateHcl);
}

export function topologyToMapFeatures({
  nodes,
  links,
  sites,
}: TopologyType): MapFeatureTopology {
  const siteToNodes: {[string]: Array<NodeType>} = {};
  const mapFeatures = {
    sites: {},
    nodes: {},
    links: {},
  };
  for (const node of nodes) {
    if (siteToNodes[node.site_name] == null) {
      siteToNodes[node.site_name] = [];
    }
    siteToNodes[node.site_name].push(node);
    mapFeatures.nodes[node.name] = topologyNodeToFeature(node);
  }
  for (const site of sites) {
    mapFeatures.sites[site.name] = topologySiteToFeature(
      site,
      siteToNodes[site.name],
    );
  }
  for (const link of links) {
    mapFeatures.links[link.name] = topologyLinkToFeature(link);
  }
  return mapFeatures;
}

function topologyNodeToFeature(node: NodeType): NodeFeature {
  return {
    name: node.name,
    site_name: node.site_name,
    ant_azimuth: node.ant_azimuth,
    properties: node,
  };
}

function topologySiteToFeature(
  site: SiteType,
  nodes: Array<NodeType>,
): SiteFeature {
  const hasPop = nodes.some(n => n.pop_node);
  const hasCN = nodes.some(n => n.node_type === NodeTypeValueMap.CN);
  const siteType = hasPop
    ? SITE_FEATURE_TYPE.POP
    : hasCN
    ? SITE_FEATURE_TYPE.CN
    : SITE_FEATURE_TYPE.DN;
  return {
    name: site.name,
    location: site.location,
    site_type: siteType,
    properties: site,
  };
}

function topologyLinkToFeature(link: LinkType): LinkFeature {
  return {
    name: link.name,
    a_node_name: link.a_node_name,
    z_node_name: link.z_node_name,
    link_type: link.link_type,
    properties: link,
  };
}
