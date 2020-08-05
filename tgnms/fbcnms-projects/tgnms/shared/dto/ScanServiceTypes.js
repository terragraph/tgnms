/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import {
  SCAN_EXECUTION_STATUS,
  SCAN_MODE,
  SCAN_TYPES,
} from '../../app/constants/ScheduleConstants';

import {HEALTH_CODES} from '../../app/constants/HealthConstants';

export type InputStartType = {
  enabled?: boolean,
  cronExpr?: string,
  networkName: string,
  type: $Values<typeof SCAN_TYPES>,
  mode: $Values<typeof SCAN_MODE>,
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
  results: Array<ExecutionResultDataType>,
};

export type ExecutionResultDataType = {
  id: number,
  link_distance: ?number,
  health: $Keys<typeof HEALTH_CODES>,
  status: $Keys<typeof SCAN_EXECUTION_STATUS>,
  src_node_mac: string,
  dst_node_mac: string,
  asset_name: string,
  start_dt: string,
  end_dt: string,
  mcs_avg: ?number,
  rssi_avg: ?number,
  snr_avg: ?number,
  rx_beam_idx: ?number,
  rx_packet_count: ?number,
  rx_per: ?number,
  tx_beam_idx: ?number,
  tx_packet_count: ?number,
  tx_per: ?number,
  tx_pwr_avg: ?number,
  iperf_min_throughput: ?number,
  iperf_max_throughput: ?number,
  iperf_avg_throughput: ?number,
  iperf_min_lost_percent: ?number,
  iperf_max_lost_percent: ?number,
  iperf_avg_lost_percent: ?number,
  iperf_min_retransmits: ?number,
  iperf_max_retransmits: ?number,
  iperf_avg_retransmits: ?number,
};
