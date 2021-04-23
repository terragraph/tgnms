/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import {HEALTH_CODES} from '@fbcnms/tg-nms/app/constants/HealthConstants';
import {
  TEST_EXECUTION_STATUS,
  TEST_TYPE_CODES,
} from '@fbcnms/tg-nms/app/constants/ScheduleConstants';

import type {
  ExecutionResultDataType,
  IperfOptions,
} from '@fbcnms/tg-nms/shared/dto/NetworkTestTypes';

export type TableResultType = {
  id: number,
  enabled?: boolean,
  cron_expr?: string,
  start_dt?: ?string,
  end_dt?: string,
  status?: $Keys<typeof TEST_EXECUTION_STATUS>,
  test_type: $Keys<typeof TEST_TYPE_CODES>,
  network_name: string,
  iperf_options: IperfOptions,
  allowlist: Array<string>,
};

export type AssetTestResultType = {|
  assetName: string,
  results: Array<ExecutionResultDataType>,
|};

export type HealthExecutionType = {
  health: $Values<typeof HEALTH_CODES>,
  executions: Array<AssetTestResultType>,
};

export type MetricType = {
  val: number | string | boolean | null,
  label: string,
  metricUnit?: string,
};
