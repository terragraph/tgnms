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
} from '../../../shared/dto/NetworkTestTypes';
import type {TableResultType} from '../../views/network_test/NetworkTestTypes';

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
    execution: {id: 1, ...overrides?.execution},
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
            test_type: 'PARALLEL',
          },
          {
            id: 3,
            status: 'FAILED',
            start_dt: new Date().toString(),
            end_dt: new Date().toString(),
            network_name: 'fbtest',
            test_type: 'SEQUENTIAL',
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
