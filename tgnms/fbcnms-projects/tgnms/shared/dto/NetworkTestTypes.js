/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 */

import {
  NETWORK_TEST_PROTOCOLS,
  NETWORK_TEST_TYPES,
  TEST_EXECUTION_STATUS,
  TEST_TYPE_CODES,
} from '../../app/constants/ScheduleConstants';

import {HEALTH_CODES} from '../../app/constants/HealthConstants';

export type InputStartType = {
  cronExpr?: string,
  allowlist?: Array<string>,
  testType?: $Keys<typeof NETWORK_TEST_TYPES>,
  networkName: string,
  iperfOptions?: IperfOptions,
  enabled?: boolean,
};

export type StartResponseType = {
  status: string,
  message: string,
  execution_id: string,
};

export type IperfOptions = {
  bitrate?: number,
  timeSec?: number,
  protocol?: number,
  omitSec?: number,
  intervalSec?: ?number,
  windowSize?: ?number,
  parallelStreams?: ?number,
};

export type InputGetType = {
  networkName: string,
  testType?: ?$Keys<typeof NETWORK_TEST_TYPES>,
  protocol?: ?$Values<typeof NETWORK_TEST_PROTOCOLS>,
  status?: ?$Values<typeof TEST_EXECUTION_STATUS>,
  startTime?: string,
  partial?: boolean,
};

export type FilterOptionsType = {|
  testType?: Array<$Keys<typeof NETWORK_TEST_TYPES>>,
  protocol?: Array<$Values<typeof NETWORK_TEST_PROTOCOLS>>,
  status?: Array<$Keys<typeof TEST_EXECUTION_STATUS>>,
  startTime?: string,
|};

export type EditScheduleType = {
  enabled: boolean,
  cron_expr?: string,
  network_name: string,
  iperf_options?: IperfOptions,
};

export type ExecutionDetailsType = {
  id: number,
  start_dt: string,
  end_dt: string,
  status: $Keys<typeof TEST_EXECUTION_STATUS>,
  test_type: $Keys<typeof TEST_TYPE_CODES>,
  network_name: string,
  iperf_options: IperfOptions,
  allowlist: Array<string>,
};

export type ExecutionResultsType = {
  execution: ExecutionDetailsType,
  results: Array<ExecutionResultDataType>,
};

export type ExecutionResultDataType = {
  id: number,
  link_distance: ?number,
  health: $Keys<typeof HEALTH_CODES>,
  status: $Keys<typeof TEST_EXECUTION_STATUS>,
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
