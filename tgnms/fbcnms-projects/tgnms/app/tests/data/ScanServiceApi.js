/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import type {
  ExecutionDetailsType,
  ExecutionResultDataType,
  ExecutionResultsType,
} from '@fbcnms/tg-nms/shared/dto/ScanServiceTypes';
import type {TableResultType} from '@fbcnms/tg-nms/app/features/scans/ScanServiceTypes';

/**
 * Creates a fake O< scan execution results
 * @param {object} overrides overrides default properties of the results
 */
export function mockExecutionResults(
  overrides?: $Shape<ExecutionResultsType>,
): {
  execution: $Shape<ExecutionDetailsType>,
  results: {[string]: $Shape<ExecutionResultDataType>},
} {
  // only a few result properties are important so we can just ignore the rest
  return {
    execution: {id: 1, ...overrides?.execution},
    results: overrides?.results
      ? overrides.results
      : {
          '0': {
            group_id: 1,
            tx_node: 'testNodeName',
            tx_status: 'FINISHED',
          },
        },
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
    group_id: 1,
    n_responses_waiting: null,
    resp_id: null,
    rx_statuses: null,
    start_bwgd: null,
    subtype: null,
    tx_node: null,
    tx_power: null,
    tx_status: 'FINISHED',
    ...overrides,
  };
}

/**
 * Creates a fake IM scan execution list
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
            network_name: 'scanTest',
            type: 'IM',
          },
          {
            id: 3,
            status: 'FAILED',
            start_dt: new Date().toString(),
            end_dt: new Date().toString(),
            network_name: 'scanTest',
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
