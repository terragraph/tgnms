/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 */

import type {
  ExecutionDetailsType,
  ExecutionResultDataType,
  ExecutionResultsType,
} from '@fbcnms/tg-nms/shared/dto/NetworkTestTypes';
import type {TableResultType} from '@fbcnms/tg-nms/app/features/network_test/NetworkTestTypes';

/**
 * Creates a fake network test execution results
 * @param {object} overrides overrides default properties of the results
 */
export function mockExecutionResults(
  overrides?: $Shape<ExecutionResultsType>,
): {
  execution: $Shape<ExecutionDetailsType>,
  results: Array<$Shape<ExecutionResultDataType>>,
} {
  // only a few result properties are important so we can just ignore the rest
  return {
    execution: {id: 1, iperf_options: {bitrate: 0}, ...overrides?.execution},
    results: overrides?.results
      ? overrides.results
      : [
          {
            id: 1,
            status: 'FINISHED',
            start_dt: new Date().toString(),
            end_dt: new Date().toString(),
          },
        ],
  };
}

/**
 * Creates a fake singular execution result
 * @param {object} overrides overrides default properties of the results
 */
export function mockExecutionResult(
  overrides?: $Shape<ExecutionResultDataType>,
): ExecutionResultDataType {
  // only a few result properties are important so we can just ignore the rest
  return {
    id: 1,
    link_distance: null,
    health: 'EXCELLENT',
    status: 'FINISHED',
    src_node_mac: 'testSrcMac',
    dst_node_mac: 'testDstMac',
    asset_name: 'testAssetName',
    start_dt: 'testStart',
    end_dt: 'testEnd',
    mcs_avg: null,
    rssi_avg: null,
    snr_avg: null,
    rx_beam_idx: null,
    rx_packet_count: null,
    rx_per: null,
    tx_beam_idx: null,
    tx_packet_count: null,
    tx_per: null,
    tx_pwr_avg: null,
    iperf_min_throughput: null,
    iperf_max_throughput: 10,
    iperf_avg_throughput: null,
    iperf_min_lost_percent: null,
    iperf_max_lost_percent: null,
    iperf_avg_lost_percent: null,
    iperf_min_retransmits: null,
    iperf_max_retransmits: null,
    iperf_avg_retransmits: null,
    ...overrides,
  };
}

/**
 * Creates a fake network test execution list
 * @param {object} overrides overrides default properties of the list
 */
export function mockExecutions(
  overrides?: Array<$Shape<TableResultType>>,
): {
  executions: Array<$Shape<TableResultType>>,
} {
  // only a few result properties are important so we can just ignore the rest
  return {
    executions: overrides
      ? overrides
      : [
          {
            id: 1,
            status: 'FINISHED',
            start_dt: new Date().toString(),
            end_dt: new Date().toString(),
            network_name: 'fbtest',
            test_type: 'PARALLEL_LINK',
          },
          {
            id: 3,
            status: 'FAILED',
            start_dt: new Date().toString(),
            end_dt: new Date().toString(),
            network_name: 'fbtest',
            test_type: 'SEQUENTIAL_LINK',
          },
        ],
  };
}

/**
 * Creates a fake network test schedule list
 * @param {object} overrides overrides default properties of the list
 */
export function mockSchedules(
  overrides?: Array<$Shape<TableResultType>>,
): {schedules: Array<$Shape<TableResultType>>} {
  // only a few result properties are important so we can just ignore the rest
  return {
    schedules: overrides
      ? overrides
      : [
          {
            id: 1,
            enabled: true,
            network_name: 'fbtest',
            cron_expr: '*',
          },
          {
            id: 3,
            network_name: 'fbtest',
            cron_expr: '*',
          },
        ],
  };
}
