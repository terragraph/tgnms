/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import * as React from 'react';
import {
  EXECUTION_STATUS,
  NETWORK_TEST_TYPES,
  PROTOCOL,
} from '../../constants/ScheduleConstants';

export type ScheduleParamsType = {
  typeSelector: React.Node,
  advancedParams: React.Node,
};

export type ScheduleTableRow = {
  id: number,
  filterStatus: $Keys<typeof EXECUTION_STATUS>,
  type: $Keys<typeof NETWORK_TEST_TYPES>,
  start: string,
  status: React.Node,
  protocol: $Values<typeof PROTOCOL>,
  actions: React.Node,
};

export type TableOption = {
  name: string,
  title: string,
  initialValue: ?string,
  options: Array<OptionItem>,
};

type OptionItem = {
  type: string,
  title: string,
};
