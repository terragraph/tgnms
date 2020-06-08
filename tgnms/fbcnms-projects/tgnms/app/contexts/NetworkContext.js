/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import React from 'react';
import {BinaryStarFsmStateValueMap} from '../../shared/types/Controller';
import {TopologyElementType, WAC_TYPES} from '../constants/NetworkConstants';
import type {
  LinkType,
  LocationType,
  NodeType,
  TopologyType,
} from '../../shared/types/Topology';
import type {
  StatusDumpType,
  UpgradeStateDumpType,
} from '../../shared/types/Controller';

export type NetworkContextType = {|
  networkName: string,
  networkConfig: NetworkConfig,

  // time window of network health metrics in hours
  networkHealthTimeWindowHrs: number,
  setAvailabilityWindow: number => void,

  networkLinkHealth: NetworkHealth,
  networkNodeHealth: NetworkHealth,
  networkNodeHealthPrometheus: NetworkNodeStats,
  networkAnalyzerData: {},
  networkLinkMetrics: {},

  // Refresh data
  refreshNetworkConfig: () => void,

  // Topology maps
  nodeMap: NodeMap,
  nodeToLinksMap: NodeToLinksMap,
  linkMap: LinkMap,
  siteMap: SiteMap,
  siteToNodesMap: SiteToNodesMap,
  nodeToLinksMap: NodeToLinksMap,
  macToNodeMap: MacToNodeMap,
  // Topology elements
  selectedElement: ?Element,
  pinnedElements: Array<Element>,
  setSelected: ($Values<typeof TopologyElementType>, string) => void,
  removeElement: ($Values<typeof TopologyElementType>, string) => void,
  togglePin: ToggleTopologyElement,
  toggleExpanded: ToggleTopologyElement,
|};

export type ToggleTopologyElement = {
  ($Values<typeof TopologyElementType>, string, boolean): any,
};

export type NetworkConfig = {
  bounds?: [Coordinate, Coordinate],
  config_auto_overrides?: {
    overrides: string,
  },
  config_node_overrides?: {
    overrides: string,
  },
  controller_online: boolean,
  controller_version: string,
  id: number,
  high_availability: {
    primary: {
      peerExpiry: number,
      state: ControllerHAState,
    },
    backup: {
      peerExpiry: number,
      state: ControllerHAState,
    },
  },
  ignition_state: IgnitionState,
  backup: E2EController,
  primary: E2EController,
  prometheus_online: boolean,
  site_overrides: {
    name: string,
    location: LocationType,
  },
  status_dump: StatusDumpType,
  upgrade_state: UpgradeStateDumpType,
  topology: TopologyType,
  topologyConfig: TopologyConfig,
  offline_whitelist: OfflineWhiteListType,
  wireless_controller: ?WirelessController,
  wireless_controller_stats: {|[string]: WirelessControllerStats|},
  controller_error: ?string,
};

export type OfflineWhiteListType = {
  links: Map<string, boolean>,
  nodes: Map<string, boolean>,
};

export type WirelessController = {
  id?: number,
  type: $Values<typeof WAC_TYPES>,
  url: string,
  username: string,
  password: string,
};

export type WirelessControllerStats = {
  clientCount: number,
  lastSeenTime: number,
};

export type Coordinate = [number, number];

export type IgnitionState = {|
  igCandidates: Array<IgnitionCandidate>,
  igParams: {
    enable: boolean,
    linkAutoIgnite: {
      [string]: boolean,
    },
    linkUpDampenInterval: number,
    linkUpInterval: number,
  },
  lastIgCandidates: Array<IgnitionCandidate>,
|};

export type IgnitionCandidate = {|
  initiatorNodeName: string,
  linkName: string,
|};

export type E2EController = {|
  api_ip: string,
  api_port: number,
  controller_online?: boolean,
  e2e_ip?: string,
  e2e_port: number,
  id?: number,
|};

export type ControllerHAState = $Values<typeof BinaryStarFsmStateValueMap>;

export type NetworkHealth = {
  startTime: number,
  endTime: number,
  events: {|
    [string]: {
      events: Array<HealthEvent>,
      linkAlive: number,
      linkAvailForData: number,
    },
  |},
};

export type NetworkNodeStats = {
  [string /* node name */]: {
    // TODO - value should be numeric but the prometheus response is a string
    [string /* metric name */]: string /* value */,
  },
};

export type HealthEvent = {|
  description: string,
  linkState: number,
  startTime: number,
  endTime: number,
|};

//nms and thrift have different definitions.
//server decorates the thrift definition with NMS specific functionality
export type LinkMeta = {
  _meta_: {
    angle: number,
    distance: number,
  },
};

export type Element = {|
  expanded: boolean,
  name: string,
  type: $Values<typeof TopologyElementType>,
|};

export type SiteMap = {
  [string]: Site,
};

export type NodeMap = {
  [string]: NodeType,
};

export type LinkMap = {[string]: LinkType & LinkMeta};

export type SiteToNodesMap = {
  [string]: Set<string>,
};

// Map from node name to links
export type NodeToLinksMap = {
  [nodeName: string]: Set<string>, // links the node is part of
};

export type MacToNodeMap = {
  [mac: string]: string,
};

export type Site = {|
  location: LocationType,
  name: string,
|};

export type TopologyConfig = {};

// store topology data
const NetworkContext = React.createContext<NetworkContextType>({
  networkName: '',
  networkConfig: {},
  networkHealthTimeWindowHrs: 24,
  networkLinkHealth: {},
  networkNodeHealth: {},
  networkNodeHealthPrometheus: {},
  networkAnalyzerData: {},

  // Refresh data
  refreshNetworkConfig: () => {},

  // Topology maps
  nodeMap: {},
  nodeToLinksMap: {},
  linkMap: {},
  siteMap: {},
  siteToNodesMap: {},
  nodeToLinksMap: {},
  macToNodeMap: {},

  // Topology elements
  selectedElement: null,
  pinnedElements: [],
  setSelected: () => {},
  removeElement: () => {},
  togglePin: () => {},
  toggleExpanded: () => {},
  networkLinkMetrics: {},
  setAvailabilityWindow: () => {},
});

export function useNetworkContext() {
  const ctx = React.useContext(NetworkContext);
  return ctx;
}

export default NetworkContext;
