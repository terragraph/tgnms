/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 */

import {ANP_SITE_TYPE} from '@fbcnms/tg-nms/app/constants/TemplateConstants';
import {METRIC_COLOR_RANGE} from '@fbcnms/tg-nms/app/constants/LayerConstants';
import {NodeTypeValueMap} from '@fbcnms/tg-nms/shared/types/Topology';
import {SITE_FEATURE_TYPE} from '@fbcnms/tg-nms/app/features/map/NetworkMapTypes';
import {interpolateHcl} from 'd3-interpolate';
import {makeLinkName} from '@fbcnms/tg-nms/app/helpers/TopologyHelpers';
import {objectValuesTypesafe} from '@fbcnms/tg-nms/app/helpers/ObjectHelpers';
import {scaleLinear} from 'd3-scale';
import type {
  ANPLink,
  ANPSector,
  ANPSite,
  ANPUploadTopologyType,
} from '@fbcnms/tg-nms/app/constants/TemplateConstants';
import type {
  LinkFeature,
  MapFeatureTopology,
  NodeFeature,
  SiteFeature,
} from '@fbcnms/tg-nms/app/features/map/NetworkMapTypes';
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

/**
 * TG JSON to Map Features
 */
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

/**
 * ANP Plan to Map Features
 */
export function planToMapFeatures(
  plan: ANPUploadTopologyType,
): MapFeatureTopology {
  const links = {};
  if (plan.links != null) {
    for (const planLink of objectValuesTypesafe<ANPLink>(plan.links)) {
      const link = mapANPLinkToFeature(planLink);
      if (link != null) {
        links[link.name] = link;
      }
    }
  }
  const sites = {};
  if (plan.sites != null) {
    for (const planSite of objectValuesTypesafe<ANPSite>(plan.sites)) {
      const site = mapANPSiteToFeature(planSite);
      sites[site.name] = site;
    }
  }
  const nodes = {};
  if (plan.sectors != null) {
    for (const planNode of objectValuesTypesafe<ANPSector>(plan.sectors)) {
      const node = mapANPNodeToFeature(planNode);
      nodes[node.name] = node;
    }
  }
  return {
    links: links,
    sites: sites,
    nodes: nodes,
  };
}

function mapANPLinkToFeature(link: ANPLink): ?LinkFeature {
  const {tx_sector_id: a, rx_sector_id: z, link_type} = link;
  if (a == null || z == null) {
    return null;
  }
  return {
    link_id: link.link_id,
    name: makeLinkName(a, z),
    a_node_name: a,
    z_node_name: z,
    link_type: link_type,
    properties: link,
  };
}

function mapANPSiteToFeature(site: ANPSite): SiteFeature {
  const {site_id, loc, site_type} = site;
  // convert from ANP's SiteType mapping to the MapFeature mapping
  let siteFeatureType: number;
  switch (site_type) {
    case ANP_SITE_TYPE.CN:
      siteFeatureType = SITE_FEATURE_TYPE.CN;
      break;
    case ANP_SITE_TYPE.POP:
      siteFeatureType = SITE_FEATURE_TYPE.POP;
      break;
    default:
      siteFeatureType = SITE_FEATURE_TYPE.DN;
  }
  return {
    site_id: site_id,
    name: site_id,
    location: loc,
    properties: site,
    site_type: siteFeatureType,
  };
}
function mapANPNodeToFeature(node: ANPSector): NodeFeature {
  const {sector_id, site_id, ant_azimuth} = node;
  return {
    node_id: sector_id,
    name: sector_id,
    site_name: site_id,
    ant_azimuth: ant_azimuth,
    properties: node,
  };
}
