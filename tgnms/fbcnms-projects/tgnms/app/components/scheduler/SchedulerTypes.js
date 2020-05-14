/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import * as React from 'react';
import {
  EXECUTION,
  NETWORK_TEST_TYPES,
  PROTOCOL,
} from '../../constants/ScheduleConstants';

export type ScheduleParamsType = {
  typeSelector: React.Node,
  advancedParams: React.Node,
};

export type ScheduleTableRow = {
  id: number,
  filterStatus: $Values<typeof EXECUTION>,
  type: $Keys<typeof NETWORK_TEST_TYPES>,
  start: string,
  status: React.Node,
  protocol: $Values<typeof PROTOCOL>,
  actions: React.Node,
};
