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

export type AzimuthManager = {|
  addLink: LinkType => Promise<void>,
  deleteLink: LinkType => Promise<void>,
  moveSite: SiteType => Promise<void>,
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
  const moveSite = async (updatedSite: SiteType) => {
    const newTopologyMap = {
      ...topologyMaps,
      siteMap: {
        ...topologyMaps.siteMap,
        [updatedSite.name]: {
          ...updatedSite,
        },
      },
    };
    const siteNodes = Array.from(
      newTopologyMap.siteToNodesMap[updatedSite.name],
    ).map(name => nodeMap[name]);
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
