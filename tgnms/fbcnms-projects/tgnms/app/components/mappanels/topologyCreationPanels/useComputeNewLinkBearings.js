/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import {
  getEstimatedNodeBearing,
  getTopologyMaps,
  makeLinkName,
} from '@fbcnms/tg-nms/app/helpers/TopologyHelpers';
import {useNetworkContext} from '@fbcnms/tg-nms/app/contexts/NetworkContext';
import type {LinkType} from '@fbcnms/tg-nms/shared/types/Topology';

export type ComputeNewLinkBearings = (
  link: LinkType,
) => {bearingA: number, bearingZ: number};
/**
 * Recomputes the azimuths of nodeA and nodeZ as if a new wireless link was
 * added between them. This takes into account their current wireless links.
 * This returns the bearings in the range [-180,180]
 */
export function useComputeNewLinkBearings(): ComputeNewLinkBearings {
  const ctx = useNetworkContext();
  const topologyMaps = getTopologyMaps(ctx);
  const {nodeMap} = topologyMaps;
  return (link: LinkType) => {
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

    /**
     * Compute the node bearings as if the new link was already in the topology
     */
    const bearingA = getEstimatedNodeBearing(nodeA, newTopologyMap) ?? 0;
    const bearingZ = getEstimatedNodeBearing(nodeZ, newTopologyMap) ?? 0;
    return {
      bearingA,
      bearingZ,
    };
  };
}
