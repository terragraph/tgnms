/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import {
  EXECUTION_STATUS,
  NETWORK_TEST_PROTOCOLS,
  NETWORK_TEST_TYPES,
  TEST_TYPE_CODES,
} from '../../app/constants/ScheduleConstants';

export type InputStartType = {
  cronExpr?: string,
  whitelist?: Array<string>,
  testType?: $Keys<typeof NETWORK_TEST_TYPES>,
  networkName: string,
  iperfOptions?: IperfOptions,
};

export type IperfOptions = {
  bitrate?: number,
  timeSec?: number,
  protocol?: number,
  omitSec?: number,
  intervalSec?: ?number,
  windowSize?: ?number,
};

export type InputGetType = {
  networkName: string,
  testType?: ?$Keys<typeof NETWORK_TEST_TYPES>,
  protocol?: $Values<typeof NETWORK_TEST_PROTOCOLS>,
  status?: $Values<typeof EXECUTION_STATUS>,
  startTime?: string,
  partial?: boolean,
};

export type FilterOptionsType = {|
  testType?: ?$Keys<typeof NETWORK_TEST_TYPES>,
  protocol?: $Values<typeof NETWORK_TEST_PROTOCOLS>,
  status?: $Keys<typeof EXECUTION_STATUS>,
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
  status: $Keys<typeof EXECUTION_STATUS>,
  test_type: $Keys<typeof TEST_TYPE_CODES>,
  network_name: string,
  iperf_options: IperfOptions,
  whitelist: Array<string>,
};

export type ExecutionResultsType = {
  execution: ExecutionDetailsType,
  results: Array<ExecutionResultDataType>,
};

export type ExecutionResultDataType = {
  id: number,
  health: ?string,
  status: $Keys<typeof EXECUTION_STATUS>,
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
