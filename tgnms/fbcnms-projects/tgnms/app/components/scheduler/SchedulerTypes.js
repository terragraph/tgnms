/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import * as React from 'react';
import {
  NETWORK_TEST_TYPES,
  PROTOCOL,
  SCAN_EXECUTION_STATUS,
  SCAN_MODE,
  SCAN_TYPES,
  TEST_EXECUTION_STATUS,
} from '@fbcnms/tg-nms/app/constants/ScheduleConstants';

export type ScheduleParamsType = {
  typeSelector: React.Node,
  advancedParams: React.Node,
  itemSelector?: React.Node,
};

export type CreateUrl = {
  ({executionId?: string, linkName?: string}): string,
};

export type ScheduleTableRow = {
  id: number,
  rowId: string,
  filterStatus:
    | $Keys<typeof TEST_EXECUTION_STATUS>
    | $Keys<typeof SCAN_EXECUTION_STATUS>,
  type: $Values<typeof NETWORK_TEST_TYPES> | $Keys<typeof SCAN_TYPES>,
  start: React.Node,
  status: React.Node,
  item?: string,
  protocol?: $Values<typeof PROTOCOL>,
  mode?: $Keys<typeof SCAN_MODE>,
  actions?: React.Node,
};

export type TableOption = {
  name: string,
  title: string,
  initialValue: ?Array<string>,
  options: Array<OptionItem>,
};

type OptionItem = {
  type: string,
  title: string,
};
