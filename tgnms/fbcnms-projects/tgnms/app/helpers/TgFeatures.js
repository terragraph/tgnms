/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import {CtrlVerType, ctrlVerBefore} from './VersionHelper';
import {formatNumber} from './StringHelpers';
import type {
  GolayIdxType,
  LinkType,
  NodeType,
} from '@fbcnms/tg-nms/shared/types/Topology';
import type {TopologyConfig} from '@fbcnms/tg-nms/shared/dto/NetworkState';

/**
 * Get polarities associated with a node.
 * Prior to RELEASE_M31, a node had a single polarity and it was part of the
 * node's topology stucture.
 * Starting from RELEASE_M31, polarity is per WLAN MAC and is part of the node's
 * configuration.
 */
export function getNodePolarities(
  ctrlVersion: string,
  node: NodeType,
  topologyConfig: TopologyConfig,
) {
  const nodePolarities = {};
  if (ctrlVerBefore(ctrlVersion, CtrlVerType.M31)) {
    if (node.mac_addr) {
      nodePolarities[node.mac_addr] = node.polarity;
    }
  } else {
    if (node.wlan_mac_addrs) {
      for (const mac of node.wlan_mac_addrs) {
        nodePolarities[mac] = topologyConfig.polarity[mac];
      }
    } else {
      if (node.mac_addr) {
        nodePolarities[node.mac_addr] = topologyConfig.polarity[node.mac_addr];
      }
    }
  }
  return nodePolarities;
}

/**
 * Get link golay index
 * Prior to RELEASE_M31, golay was part of the link's topology structure
 * Starting from RELEASE_M31, golay is part of the node's configuration.
 */
export function getLinkGolay(
  ctrlVersion: string,
  link: LinkType,
  topologyConfig: TopologyConfig,
): GolayIdxType {
  let linkGolay: $Shape<GolayIdxType> = {};
  if (ctrlVerBefore(ctrlVersion, CtrlVerType.M31)) {
    if (link.golay_idx) {
      linkGolay = link.golay_idx;
    }
  } else {
    if (
      topologyConfig.golay &&
      topologyConfig.golay.hasOwnProperty(link.a_node_name) &&
      topologyConfig.golay[link.a_node_name].hasOwnProperty(link.z_node_mac)
    ) {
      linkGolay = topologyConfig.golay[link.a_node_name][link.z_node_mac];
    } else if (
      topologyConfig.golay &&
      topologyConfig.golay.hasOwnProperty(link.z_node_name) &&
      topologyConfig.golay[link.a_node_name].hasOwnProperty(link.a_node_mac)
    ) {
      linkGolay = topologyConfig.golay[link.z_node_name][link.a_node_mac];
    }
  }
  return linkGolay;
}

/**
 * Get link channel
 * Prior to M40, channel was configured at the topology level.
 * Starting from release M40, channel is part of the node's configuration.
 */
export function getLinkChannel(link: LinkType, topologyConfig: TopologyConfig) {
  let linkChannel = {};
  if (
    topologyConfig.channel &&
    topologyConfig.channel.hasOwnProperty(link.a_node_mac)
  ) {
    linkChannel = topologyConfig.channel[link.a_node_mac];
  } else if (
    topologyConfig.channel &&
    topologyConfig.channel.hasOwnProperty(link.z_node_mac)
  ) {
    linkChannel = topologyConfig.channel[link.z_node_mac];
  }
  return linkChannel;
}

/**
 * Get link control superframe
 * Prior to RELEASE_M31, control superframe was part of the link's topology
 * structure.
 * Starting from RELEASE_M31, control superframe is part of the node's
 * configuration.
 */
export function getLinkControlSuperframe(
  ctrlVersion: string,
  link: LinkType,
  topologyConfig: TopologyConfig,
) {
  let linkControlSuperframe = {};
  if (ctrlVerBefore(ctrlVersion, CtrlVerType.M31)) {
    if (link.control_superframe) {
      linkControlSuperframe = link.control_superframe;
    }
  } else if (topologyConfig.controlSuperframe) {
    if (
      topologyConfig.controlSuperframe.hasOwnProperty(link.a_node_name) &&
      topologyConfig.controlSuperframe[link.a_node_name].hasOwnProperty(
        link.z_node_mac,
      )
    ) {
      linkControlSuperframe =
        topologyConfig.controlSuperframe[link.a_node_name][link.z_node_mac];
    } else if (
      topologyConfig.controlSuperframe.hasOwnProperty(link.z_node_name) &&
      topologyConfig.controlSuperframe[link.a_node_name].hasOwnProperty(
        link.a_node_mac,
      )
    ) {
      linkControlSuperframe =
        topologyConfig.controlSuperframe[link.z_node_name][link.a_node_mac];
    }
  }
  return linkControlSuperframe;
}

/**
 * Check if the Node structure has a 'wlan_mac_addrs' field.
 * This was added in RELEASE_M29.
 */
export function useNodeWlanMacs(ctrlVersion: string) {
  return !ctrlVerBefore(ctrlVersion, CtrlVerType.M29);
}

/**
 * Check if the single-node topology scan feature is supported.
 * This was added in RELEASE_M29.
 */
export function supportsTopologyScan(ctrlVersion: string) {
  return !ctrlVerBefore(ctrlVersion, CtrlVerType.M29);
}

/**
 * Check if the network-wide topology scan feature is supported.
 * This was added in RELEASE_M30.
 */
export function supportsTopologyDiscovery(ctrlVersion: string) {
  return !ctrlVerBefore(ctrlVersion, CtrlVerType.M30);
}

/**
 * Check if the Firmware Version Stat API request is supported.
 * This was added in RELEASE_M46.
 */
export function supportsFirmwareApiRequest(ctrlVersion: string) {
  return !ctrlVerBefore(ctrlVersion, CtrlVerType.M46);
}

/**
 * Check if the node structure supports user-specified Polarity
 * and Golay_idx. No longer supporting these fields starting
 * RELEASE_M37.
 */
export function supportsUserSpecifiedPolairtyAndGolay(ctrlVersion: string) {
  return ctrlVerBefore(ctrlVersion, CtrlVerType.M37);
}

export function beamIndexToAngle(beamIdx: number): number {
  // This is only valid for Rev5
  // Index range is 0-63
  // 0 is the center (0°)
  // 1-31 = right (43.6 max)
  // 32-63 = left (-45 max)
  return (beamIdx >= 32 ? -(beamIdx - 31) : beamIdx) * 1.4 /* to degrees */;
}

export function beamAngleToOrientation(angle: number) {
  return angle === 0
    ? 0
    : `${angle > 0 ? 'L' : 'R'} ${formatNumber(Math.abs(angle), 0)}`;
}
