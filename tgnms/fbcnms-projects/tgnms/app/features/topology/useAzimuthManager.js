/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import {apiRequest} from '@fbcnms/tg-nms/app/apiutils/ServiceAPIUtil';
import {
  getEstimatedNodeAzimuth,
  getTopologyMaps,
  getWirelessPeers,
  makeLinkName,
} from '@fbcnms/tg-nms/app/helpers/TopologyHelpers';
import {useNetworkContext} from '@fbcnms/tg-nms/app/contexts/NetworkContext';
import type {
  LinkType,
  NodeType,
  SiteType,
} from '@fbcnms/tg-nms/shared/types/Topology';
import type {TopologyMaps} from '@fbcnms/tg-nms/app/helpers/TopologyHelpers';

export type MoveSitePayload = {
  siteName: string,
  newSite: SiteType,
};

export type AzimuthManager = {|
  addLink: LinkType => Promise<void>,
  deleteLink: LinkType => Promise<void>,
  moveSite: MoveSitePayload => Promise<void>,
|};
/**
 * Update node azimuths in response to topology changes
 */
export function useAzimuthManager() {
  const ctx = useNetworkContext();
  const {networkName} = ctx;
  const topologyMaps = getTopologyMaps(ctx);
  const {nodeMap} = topologyMaps;
  const AZIMUTH_EPSILON = 0.2;
  /**
   * Updates the azimuths of the nodes on both sides of a wireless link using
   * the topology provided
   */
  const recomputeNodeAzimuths = async (
    nodes: Array<NodeType>,
    topology: $Shape<TopologyMaps>,
  ) => {
    await Promise.all(
      nodes.map(async node => {
        const newAzimuth = getEstimatedNodeAzimuth(node, topology) ?? 0;
        if (Math.abs(node.ant_azimuth - newAzimuth) > AZIMUTH_EPSILON) {
          await apiRequest({
            networkName,
            endpoint: 'editNode',
            data: {
              nodeName: node.name,
              newNode: {...node, ant_azimuth: newAzimuth},
            },
          });
        }
      }),
    );
  };
  const addLink = async (link: LinkType) => {
    const {a_node_name, z_node_name} = link;
    const newLinkName = makeLinkName(a_node_name, z_node_name);
    const nodeA = nodeMap[a_node_name];
    const nodeZ = nodeMap[z_node_name];
    const newLink = {...link, name: newLinkName};
    // create a mutable copy of the linkMap
    const newTopologyMap = {
      ...topologyMaps,
      linkMap: {
        ...topologyMaps.linkMap,
        [newLinkName]: newLink,
      },
      nodeToLinksMap: {
        ...topologyMaps.nodeToLinksMap,
      },
    };
    const aLinks = Array.from(
      newTopologyMap.nodeToLinksMap[a_node_name]?.values() ?? [],
    ).concat(newLinkName);
    const zLinks = Array.from(
      newTopologyMap.nodeToLinksMap[z_node_name]?.values() ?? [],
    ).concat(newLinkName);
    newTopologyMap.nodeToLinksMap[a_node_name] = new Set(aLinks);
    newTopologyMap.nodeToLinksMap[z_node_name] = new Set(zLinks);

    await recomputeNodeAzimuths([nodeA, nodeZ], newTopologyMap);
  };
  // Updates the azimuths of the nodes on both sides of a deleted wireless link
  const deleteLink = async (link: LinkType) => {
    const {a_node_name, z_node_name} = link;
    const nodeA = nodeMap[a_node_name];
    const nodeZ = nodeMap[z_node_name];
    // create a mutable copy of the topology map
    const newTopologyMap = {
      ...topologyMaps,
      linkMap: {
        ...topologyMaps.linkMap,
      },
      nodeToLinksMap: {
        ...topologyMaps.nodeToLinksMap,
      },
    };
    delete newTopologyMap.linkMap[link.name];
    // make sure not to mutate nodeToLinksMap
    const aLinks = new Set(newTopologyMap.nodeToLinksMap[a_node_name]);
    aLinks.delete(link.name);
    newTopologyMap.nodeToLinksMap[a_node_name] = aLinks;
    const zLinks = new Set(newTopologyMap.nodeToLinksMap[z_node_name]);
    zLinks.delete(link.name);
    newTopologyMap.nodeToLinksMap[z_node_name] = zLinks;

    await recomputeNodeAzimuths([nodeA, nodeZ], newTopologyMap);
  };
  /**
   * When a site is moved, recompute the azimuths of every node on this site and
   * every node it has a wireless link with.
   */
  const moveSite = async ({siteName, newSite}: MoveSitePayload) => {
    // In the event that the site is renamed, we need to make sure the
    // site's nodes get the new site name.
    const refactoredNodes = Array.from(
      topologyMaps.siteToNodesMap[siteName],
    ).map(nodeName => ({
      ...topologyMaps.nodeMap[nodeName],
      site_name: newSite.name,
    }));
    // Reconstruct our topology maps with the new site.
    const newTopologyMap = {
      ...topologyMaps,
      siteMap: {
        ...topologyMaps.siteMap,
        [newSite.name]: {
          ...newSite,
        },
      },
      siteToNodesMap: {
        ...topologyMaps.siteToNodesMap,
        [newSite.name]: topologyMaps.siteToNodesMap[siteName],
      },
      nodeMap: {
        ...topologyMaps.nodeMap,
        ...refactoredNodes.reduce((map, node) => {
          map[node.name] = node;
          return map;
        }, {}),
      },
    };
    if (newSite.name != siteName) {
      // Remove any reference to the old site
      delete newTopologyMap.siteMap[siteName];
      delete newTopologyMap.siteToNodesMap[siteName];
    }

    const siteNodes = Array.from(
      newTopologyMap.siteToNodesMap[newSite.name],
    ).map(name => newTopologyMap.nodeMap[name]);
    let peers: Array<NodeType> = [];
    for (const node of siteNodes) {
      peers = peers.concat(
        getWirelessPeers(newTopologyMap.nodeMap[node.name], topologyMaps),
      );
    }
    const allNodes = siteNodes.concat(peers);
    await recomputeNodeAzimuths(allNodes, newTopologyMap);
  };
  return {
    addLink,
    deleteLink,
    moveSite,
  };
}
