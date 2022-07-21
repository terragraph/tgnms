/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 */

import {BinaryStarFsmStateValueMap} from '../types/Controller';
import type {GolayIdxType, SiteType, TopologyType} from '../types/Topology';
import type {
  IgnitionStateType,
  StatusDumpType,
  UpgradeStateDumpType,
} from '../types/Controller';

export const HAPeerType = {
  PRIMARY: 'PRIMARY',
  BACKUP: 'BACKUP',
  ERROR: 'ERROR',
};

export const WAC_TYPES = {
  none: 'none',
  ruckus: 'ruckus',
};

export type NetworkInstanceConfig = {|
  id: number,
  name: string,
  controller_online: boolean,
  primary: E2EController,
  backup: ?E2EController,
  site_overrides: Array<SiteType>,
  offline_whitelist: ?OfflineWhiteListType,
  wireless_controller: ?WirelessController,
  map_profile_id: ?number,
  // stats urls
  prometheus_url?: ?string,
  queryservice_url?: ?string,
  alertmanager_url?: ?string,
  alertmanager_config_url?: ?string,
  prometheus_config_url?: ?string,
  event_alarm_url?: ?string,
|};

export type HAActiveState = {|
  active: $Keys<typeof HAPeerType>,
  error?: string,
|};

export type ServerNetworkState = {|
  name: string,
  active: HAActiveState,
  controller_ip: number,
  controller_ip_active: number,
  controller_version: string,
  controller_online: boolean,
  prometheus_online: boolean,
  topology: TopologyType,
  topologyConfig: TopologyConfig,
  bounds: [
    [number, number] | [number, number, number],
    [number, number] | [number, number, number],
  ],
  config_node_overrides: {overrides: string},
  config_auto_overrides: {overrides: string},
  high_availability: HAState,
  status_dump: StatusDumpType,
  ignition_state: IgnitionStateType,
  upgrade_state: UpgradeStateDumpType,
  // not sure if these are ever set.
  controller_error: ?string,
  wireless_controller_stats: {},
|};

export type NetworkState = {|
  ...ServerNetworkState,
  ...NetworkInstanceConfig,
|};

export type HAState = {|
  primary: ?{
    peerExpiry: number,
    state: ControllerHAState,
  },
  backup: ?{
    peerExpiry: number,
    state: ControllerHAState,
  },
|};

export type NetworkHealth = {
  startTime: number,
  endTime: number,
  events: {|
    [string]: LinkHealth,
  |},
};

export type LinkHealth = {
  events: Array<HealthEvent>,
  linkAlive: number,
  linkAvailForData: number,
};

export type HealthEvent = {|
  description: string,
  linkState: number,
  startTime: number,
  endTime: number,
|};

export type OfflineWhiteListType = {
  links: {|[string]: boolean|},
  nodes: {|[string]: boolean|},
};

export type WirelessController = {
  id?: number,
  type: 'none' | 'ruckus',
  url: string,
  username: string,
  password?: ?string,
};

export type WirelessControllerStats = {
  clientCount: number,
  lastSeenTime: number,
};

export type Boundary = [number, number, number, number];

export type E2EController = {|
  api_ip: string,
  api_port: number,
  controller_online?: boolean,
  e2e_ip: string,
  e2e_port: number,
  id?: number,
|};

export type ControllerHAState = $Values<typeof BinaryStarFsmStateValueMap>;

export type TopologyConfig = $Shape<{|
  polarity: {|[string]: number|},
  golay: {|[string]: $Shape<GolayIdxType>|},
  controlSuperframe: {|[string]: {|[string]: number|}|},
  channel: {|[string]: number|},
|}>;

export type NetworkList = {|
  [string]: NetworkInstanceConfig,
|};

export type NetworkAnalyzerData = {
  [linkName: string]: {
    A: AnalyzerLinkData,
    Z: AnalyzerLinkData,
  },
};

export type AnalyzerLinkData = {|
  avg_snr: string,
  avg_mcs: string,
  avg_tx_power: string,
  flaps: string,
  avg_per: string,
  tx_beam_idx: string,
  rx_beam_idx: string,
|};
