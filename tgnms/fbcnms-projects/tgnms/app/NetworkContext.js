/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import React from 'react';
import {BinaryStarFsmStateValueMap} from '../shared/types/Controller';
import {TopologyElementType} from './constants/NetworkConstants';
import type {
  LinkType,
  LocationType,
  NodeType,
  TopologyType,
} from '../shared/types/Topology';
import type {
  StatusDumpType,
  UpgradeStateDumpType,
} from '../shared/types/Controller';

export type NetworkContextType = {|
  networkName: string,
  networkConfig: NetworkConfig,

  // time window of network health metrics in hours
  networkHealthTimeWindowHrs: number,
  setAvailabilityWindow: number => void,

  networkLinkHealth: NetworkHealth,
  networkNodeHealth: NetworkHealth,
  networkAnalyzerData: {},
  networkLinkMetrics: {},

  // Refresh data
  refreshNetworkConfig: () => void,

  // Topology maps
  nodeMap: NodeMap,
  linkMap: LinkMap,
  siteMap: SiteMap,
  siteToNodesMap: SiteToNodesMap,
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
  query_service_online: boolean,
  site_overrides: {
    name: string,
    location: LocationType,
  },
  status_dump: StatusDumpType,
  upgrade_state: UpgradeStateDumpType,
  topology: TopologyType,
  topologyConfig: TopologyConfig,
  offline_whitelist: {
    links: Map<string, boolean>,
    nodes: Map<string, boolean>,
  },
  wireless_controller: WirelessController,
  wireless_controller_stats: {|[string]: WirelessControllerStats|},
  controller_error: ?string,
};

export type WirelessController = {
  id: number,
  type: 'ruckus',
  url: string,
  username: string,
  password: string,
};

export type WirelessControllerStats = {
  clientCount: number,
};

type Coordinate = [number, number];

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
  controller_online: boolean,
  e2e_port: number,
  id: number,
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
  networkAnalyzerData: {},

  // Refresh data
  refreshNetworkConfig: () => {},

  // Topology maps
  nodeMap: {},
  linkMap: {},
  siteMap: {},
  siteToNodesMap: {},

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

export default NetworkContext;
