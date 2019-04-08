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
  test_results: ?Array<TestResult>,
|};

export const TEST_STATUS = {
  RUNNING: 1,
  FINISHED: 2,
  ABORTED: 3,
  FAILED: 4,
};

export const TEST_TYPE = {
  '8.2': 'sequential link test',
  '8.3': 'parallel link test',
  '8.9': 'multi-hop test',
};
