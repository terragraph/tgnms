/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import EnableNetworkTest from '../troubleshootingAutomation/EnableNetworkTest';
import EnableScans from '../troubleshootingAutomation/EnableScans';
import {SCHEDULE_TABLE_TYPES} from '../../constants/ScheduleConstants';

export default function ScheduleTableFaultWarning({
  mode,
}: {
  mode: $Values<typeof SCHEDULE_TABLE_TYPES>,
}) {
  if (mode === SCHEDULE_TABLE_TYPES.SCAN) {
    return <EnableScans />;
  }

  return <EnableNetworkTest />;
}
