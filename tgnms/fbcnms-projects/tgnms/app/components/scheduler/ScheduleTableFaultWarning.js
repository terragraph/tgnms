/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import EnableNetworkTest from '../troubleshootingAutomation/EnableNetworkTest';
import EnableScans from '../troubleshootingAutomation/EnableScans';
import {SCHEDULE_TABLE_TYPES} from '@fbcnms/tg-nms/app/constants/ScheduleConstants';

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
