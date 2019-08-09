/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import type {TestExecution} from './TestExecution';

export type TestSchedule = {
  id: number,
  cron_minute: string,
  cron_hour: string,
  cron_day_of_month: string,
  cron_month: string,
  cron_day_of_week: string,
  priority: number,
  asap: boolean,
  test_run_execution_id: number,
  test_execution: ?TestExecution,

  // mapped from test execution
  test_code: string,
};
