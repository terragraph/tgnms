/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import {
  EXECUTION_STATUS,
  TEST_TYPE_CODES,
} from '../../constants/ScheduleConstants';

import type {IperfOptions} from '../../../shared/dto/NetworkTestTypes';

export type CreateTestUrl = {
  ({executionId?: string, linkName?: string}): string,
};

export type TableResultType = {
  id: number,
  enabled?: boolean,
  cron_expr?: string,
  start_dt?: string,
  end_dt?: string,
  status?: $Keys<typeof EXECUTION_STATUS>,
  test_type: $Keys<typeof TEST_TYPE_CODES>,
  network_name: string,
  iperf_options: IperfOptions,
  whitelist: Array<string>,
};
