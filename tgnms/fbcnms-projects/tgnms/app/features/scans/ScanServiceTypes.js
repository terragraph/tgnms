/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow strict-local
 */

import {
  SCAN_EXECUTION_STATUS,
  SCAN_MODE,
  SCAN_TYPES,
} from '@fbcnms/tg-nms/app/constants/ScheduleConstants';

export type TableResultType = {
  id: number,
  enabled?: boolean,
  cron_expr?: string,
  start_dt?: string,
  end_dt?: string,
  status?: $Keys<typeof SCAN_EXECUTION_STATUS>,
  type: $Keys<typeof SCAN_TYPES>,
  mode: $Keys<typeof SCAN_MODE>,
  network_name: string,
  options: {
    tx_wlan_mac?: string,
  },
};
