/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import {HEALTH_CODES} from '../../app/constants/HealthConstants';
import {
  SCAN_EXECUTION_STATUS,
  SCAN_MODE,
  SCAN_TYPES,
} from '../../app/constants/ScheduleConstants';

export type InputStartType = {
  enabled?: boolean,
  cronExpr?: string,
  networkName: string,
  type: $Values<typeof SCAN_TYPES>,
  mode: $Values<typeof SCAN_MODE>,
  options?: {
    tx_wlan_mac?: string,
  },
};

export type InputGetType = {
  type?: $Values<typeof SCAN_TYPES>,
  networkName: string,
  mode?: $Values<typeof SCAN_MODE>,
  status?: $Keys<typeof SCAN_EXECUTION_STATUS>,
  startTime?: string,
};

export type FilterOptionsType = {|
  status?: Array<$Keys<typeof SCAN_EXECUTION_STATUS>>,
  startTime?: string,
  type: Array<$Keys<typeof SCAN_TYPES>>,
  mode: Array<$Keys<typeof SCAN_MODE>>,
|};

export type EditScheduleType = {
  enabled: boolean,
  cron_expr?: string,
  network_name: string,
  type: $Values<typeof SCAN_TYPES>,
  mode: $Values<typeof SCAN_MODE>,
  options?: {
    tx_wlan_mac?: string,
  },
};

export type ExecutionDetailsType = {
  id: number,
  start_dt: string,
  end_dt: string,
  type: $Keys<typeof SCAN_TYPES>,
  mode: $Keys<typeof SCAN_MODE>,
  network_name: string,
  status?: $Keys<typeof SCAN_EXECUTION_STATUS>,
  params_id: number,
};

export type ExecutionResultsType = {
  execution: ExecutionDetailsType,
  results: {[string]: ExecutionResultDataType},
  aggregated_inr: AggregatedInrType,
};

export type ConnectivityResultsType = {
  routes: Array<[number, number, number]>,
  rx_node: string,
  tx_node: string,
};

export type InterferenceResultsType = {
  inr_curr_power: {rssi: number, snr_avg: number, post_snr: number},
  inr_max_power: {rssi: number, snr_avg: number, post_snr: number},
  rx_from_node: string,
  rx_node: string,
  tx_node: string,
  tx_power_idx: number,
  tx_to_node: string,
};

export type ExecutionResultDataType = {
  id?: number,
  health?: number,
  connectivity?: Array<ConnectivityResultsType>,
  group_id: ?number,
  interference?: Array<InterferenceResultsType>,
  n_responses_waiting: ?number,
  resp_id: ?number,
  rx_statuses: ?{[string]: $Keys<typeof SCAN_EXECUTION_STATUS>},
  start_bwgd: ?number,
  subtype: ?string,
  tx_node: ?string,
  tx_power: ?number,
  tx_status: ?$Keys<typeof SCAN_EXECUTION_STATUS>,
};

export type InterferenceGroupType = {
  name: string,
  links: Array<LinkInterferenceType>,
  health: $Values<typeof HEALTH_CODES>,
};

export type LinkInterferenceType = {
  assetName: string,
  totalINR?: number,
  directions: Array<{
    label: string,
    interference: Array<{
      interferenceLinkName: ?string,
      INR: number,
      fromNode: string,
    }>,
    totalINR: number,
    health: number,
  }>,
};

export type LinkAggregatedInr = {
  inr_curr_power: number,
  rx_from_node: string,
  rx_node: string,
};

export type AggregatedInrType = {
  current: {
    [string]: Array<LinkAggregatedInr>,
  },
  n_day_avg: {
    [string]: Array<LinkAggregatedInr>,
  },
};
