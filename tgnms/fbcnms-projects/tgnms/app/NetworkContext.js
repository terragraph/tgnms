/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import React from 'react';
import {BinaryStarFsmStateValueMap} from '../shared/types/Controller';
import {TopologyElementType} from './constants/NetworkConstants';
import type {LinkType, TopologyType} from '../shared/types/Topology';
import type {
  StatusDumpType,
  UpgradeStateDumpType,
} from '../shared/types/Controller';

export type NetworkContextType = {|
  networkName: string,
  networkConfig: NetworkConfig,
  networkLinkHealth: NetworkHealth,
  networkNodeHealth: NetworkHealth,
  networkAnalyzerData: {},
  networkLinkMetrics: {},

  // Refresh data
  refreshNetworkConfig: () => void,

  // Topology maps
  nodeMap: {
    [string]: Node,
  },
  linkMap: {[string]: LinkType},
  siteMap: SiteMap,
  siteToNodesMap: {
    [string]: Set<string>,
  },
  // Topology elements
  selectedElement: ?Element,
  pinnedElements: Array<Element>,
  setSelected: ($Values<typeof TopologyElementType>, ?string) => void,
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
    location: Location,
  },
  status_dump: StatusDumpType,
  upgrade_state: UpgradeStateDumpType,
  topology: TopologyType,
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

export type Location = {|
  accuracy: number,
  altitude: number,
  latitude: number,
  longitude: number,
|};

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

export type Node = {|
  ant_azimuth: number,
  ant_elevation: number,
  golay_idx: {
    rxGolayIdx: number,
    txGolayIdx: number,
  },
  has_cpe: boolean,
  is_primary: boolean,
  mac_addr: string,
  name: string,
  node_type: number,
  polarity: number,
  pop_node: boolean,
  prefix: string,
  secondary_mac_addrs: Array<string>,
  site_name: string,
  status: number,
  wlan_mac_addrs: Array<string>,
|};

export type Element = {|
  expanded: boolean,
  name: string,
  type: string,
|};

export type SiteMap = {
  [string]: Site,
};

export type Site = {|
  location: Location,
  name: string,
|};

export type TopologyConfig = {||};

// store topology data
const NetworkContext = React.createContext<NetworkContextType>({
  networkName: '',
  networkConfig: {},
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
});

export default NetworkContext;
