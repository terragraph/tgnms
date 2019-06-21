/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
'use strict';
import type {TestResult} from './TestResult';

export type TestExecution = {|
  id: number,
  start_date_utc: Date,
  end_date_utc: Date,
  expected_end_date_utc: Date,
  status: number,
  test_code: string,
  user_id: number,
  topology_id: number,
  topology_name: string,
  multi_hop_parallel_sessions: number,
  multi_hop_session_iteration_count: number,
  session_duration: number,
  test_push_rate: number,
  traffic_direction: number,
  test_results: ?Array<TestResult>,
  protocol: $Values<typeof PROTOCOL>,
|};

export const TEST_STATUS = {
  RUNNING: 1,
  FINISHED: 2,
  ABORTED: 3,
  FAILED: 4,
  SCHEDULED: 5,
  QUEUED: 6,
};

export const TEST_TYPE_CODES = {
  SEQUENTIAL_LINK: '8.2',
  PARALLEL_LINK: '8.3',
  MULTI_HOP: '8.9',
};

export const TEST_TYPE = {
  [TEST_TYPE_CODES.SEQUENTIAL_LINK]: 'sequential link test',
  [TEST_TYPE_CODES.PARALLEL_LINK]: 'parallel link test',
  [TEST_TYPE_CODES.MULTI_HOP]: 'multi-hop test',
};

export const PROTOCOL = {
  TCP: 'TCP',
  UDP: 'UDP',
};
