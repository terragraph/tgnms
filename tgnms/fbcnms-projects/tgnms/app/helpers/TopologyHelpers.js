/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as turf from '@turf/turf';
import {LinkActionTypeValueMap} from '@fbcnms/tg-nms/shared/types/Controller';
import {
  LinkTypeValueMap,
  NodeTypeValueMap,
} from '@fbcnms/tg-nms/shared/types/Topology';
import {apiRequest} from '@fbcnms/tg-nms/app/apiutils/ServiceAPIUtil';
import {averageAngles} from './MathHelpers';
import {bearingToAzimuth, locToPos} from './GeoHelpers';
import {get} from 'lodash';
import {isNullOrEmptyString} from '@fbcnms/tg-nms/app/helpers/StringHelpers';

import type {ANPLink} from '@fbcnms/tg-nms/app/constants/TemplateConstants';
import type {AzimuthManager} from '@fbcnms/tg-nms/app/features/topology/useAzimuthManager';
import type {
  LinkMap,
  MacToNodeMap,
  NodeMap,
  NodeToLinksMap,
  SiteMap,
  SiteToNodesMap,
} from '@fbcnms/tg-nms/app/contexts/NetworkContext';
import type {
  LinkType,
  NodeType,
  TopologyType,
} from '@fbcnms/tg-nms/shared/types/Topology';
import type {NetworkConfig} from '@fbcnms/tg-nms/app/contexts/NetworkContext';

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

/**
 * Gets the estimated bearing for a node based on its wireless links in the
 * topologyMaps object.
 * Bearing is [-180,180] and is used in turf and mapbox
 */
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
    return 0;
  }
  const bearings = peerLocations.map(peerLocation =>
    turf.bearing(locToPos(site.location), locToPos(peerLocation)),
  );
  const averageBearing = averageAngles(bearings);
  return averageBearing;
}

/**
 * Gets the estimated azimuth for a node based on its wireless links in the
 * topologyMaps object.
 * Azimuth is [0,360] and is used topology nodes in the ant_azimuth field.
 */
export function getEstimatedNodeAzimuth(
  node: NodeType,
  topologyMaps: $Shape<TopologyMaps>,
): ?number {
  const bearing = getEstimatedNodeBearing(node, topologyMaps);
  if (bearing == null || isNaN(bearing)) {
    return bearing;
  }
  return bearingToAzimuth(bearing);
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
 * Get the link names on the other side of this node's wireless links */
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

/**
 * TG Links need to be ordered in alphabetical order in order
 * to be accepted by the controller.
 */
export function makeLink(link: ANPLink, sectorToNodeName: {[string]: string}) {
  const order = [
    sectorToNodeName[link.tx_sector_id],
    sectorToNodeName[link.rx_sector_id],
  ].sort();
  return {
    name: makeLinkName(order[0], order[1]),
    link_type: getLinkType(link.link_type),
    a_node_mac: '',
    a_node_name: order[0],
    z_node_mac: '',
    z_node_name: order[1],
    is_alive: false,
    linkup_attempts: 0,
  };
}

/**
 * Puts a link's nodes in lexicographical order.
 */
export function reorderLinkNodes(link: $Shape<LinkType>) {
  const res = {...link};
  if (res.a_node_name > res.z_node_name) {
    const tempName = res.a_node_name;
    const tempMac = res.a_node_mac;
    res.a_node_name = res.z_node_name;
    res.a_node_mac = res.z_node_mac;
    res.z_node_name = tempName;
    res.z_node_mac = tempMac;
  }
  return res;
}

/**
 * TG Links typically named link-<node1>-<node2>.
 * Node names are sorted alphabetically.
 */
export function makeLinkName(a: string, z: string) {
  const nodeNames = [a, z].sort();
  const name = `link-${nodeNames[0]}-${nodeNames[1]}`;
  return name;
}

/**
 * TG nodes typically named <site>_<node>.
 * Node names are sorted alphabetically.
 */
export function makeNodeName(site: string, node: number) {
  return `${site}_${node}`;
}

/**
 * Get the general link type for a link.
 *
 * Wireless backhaul and access links can just be grouped
 * under 'wireless'.
 */
export function getLinkType(link_type: number) {
  const WIRELESS = [
    LinkTypeValueMap['WIRELESS'],
    LinkTypeValueMap['WIRELESS_BACKHAUL'],
    LinkTypeValueMap['WIRELESS_ACCESS'],
  ];
  const ETHERNET = [LinkTypeValueMap['ETHERNET']];

  if (WIRELESS.includes(link_type)) {
    return LinkTypeValueMap['WIRELESS'];
  } else if (ETHERNET.includes(link_type)) {
    return LinkTypeValueMap['ETHERNET'];
  } else {
    throw new Error('Link type does not exist.');
  }
}

/**
 * Extracts the topologymaps object from an object which contains
 * the maps such as NetworkContext
 */
export function getTopologyMaps(obj: {...TopologyMaps}): TopologyMaps {
  const {
    nodeMap,
    nodeToLinksMap,
    siteMap,
    linkMap,
    siteToNodesMap,
    macToNodeMap,
  } = obj;
  return {
    nodeMap,
    siteMap,
    linkMap,
    nodeToLinksMap,
    siteToNodesMap,
    macToNodeMap,
  };
}

/**
 * In order to correctly delete a link, it is a 4 step process
 * 1. disable auto ignite so when link is turned off it doesn't turn back on
 * 2. turn link off so we can delete
 * 3. delete link
 * 4. enable auto ignite so if same link is formed, it will ignite
 *
 * this function triggers all those steps for a link
 */
export async function deleteLinkRequest({
  nodeMap,
  link,
  networkName,
  azimuthManager,
}: {
  nodeMap: {[string]: NodeType},
  link: LinkType,
  networkName: string,
  azimuthManager: AzimuthManager,
}) {
  try {
    await apiRequest({
      networkName,
      endpoint: 'setIgnitionState',
      data: {
        enable: true,
        linkAutoIgnite: {
          [link.name]: false,
        },
      },
    });
  } catch (error) {
    console.error(error);
  }
  try {
    const aNode = nodeMap[link.a_node_name];
    const zNode = nodeMap[link.z_node_name];
    const initiatorNode =
      aNode.node_type === NodeTypeValueMap.DN ? aNode : zNode;
    const responderNode =
      aNode.node_type === NodeTypeValueMap.DN ? zNode : aNode;

    await apiRequest({
      networkName,
      endpoint: 'setLinkStatus',
      data: {
        initiatorNodeName: initiatorNode.name,
        responderNodeName: responderNode.name,
        action: LinkActionTypeValueMap.LINK_DOWN,
      },
    });
  } catch (error) {
    console.error(error);
  }
  try {
    const aNodeName = link.a_node_name;
    const zNodeName = link.z_node_name;
    await apiRequest<{aNodeName: string, zNodeName: string, force: boolean}, *>(
      {
        networkName,
        endpoint: 'delLink',
        data: {aNodeName, zNodeName, force: true},
      },
    );
  } catch (error) {
    return {
      success: false,
      msg: error,
    };
  }
  try {
    await apiRequest({
      networkName,
      endpoint: 'setIgnitionState',
      data: {
        enable: true,
        linkAutoIgnite: {
          [link.name]: true,
        },
      },
    });
  } catch (error) {
    console.error(error);
  }
  await azimuthManager.deleteLink(link);
  return {
    success: true,
    msg: `Link was successfully deleted!`,
  };
}

export const getConfigOverrides = (config: NetworkConfig) => {
  const overrides = get(config, ['config_node_overrides', 'overrides']);
  return !isNullOrEmptyString(overrides) ? JSON.parse(overrides) : {};
};

export const getTunnelConfigs = (overrides: any, nodeName: string) => {
  return get(overrides, [nodeName, 'tunnelConfig'], {});
};
