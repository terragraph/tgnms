/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow strict-local
 */

import * as React from 'react';
import ScheduleTableFaultWarning from '../ScheduleTableFaultWarning';
import {SCHEDULE_TABLE_TYPES} from '@fbcnms/tg-nms/app/constants/ScheduleConstants';
import {TestApp} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {render} from '@testing-library/react';

jest
  .spyOn(
    require('@fbcnms/tg-nms/app/constants/FeatureFlags'),
    'isFeatureEnabled',
  )
  .mockReturnValue(true);

test('test for scan warning without crashing', () => {
  const {getByTitle} = render(
    <TestApp>
      <ScheduleTableFaultWarning mode={SCHEDULE_TABLE_TYPES.SCAN} />
    </TestApp>,
  );
  expect(getByTitle('Scan Service Unavailable')).toBeInTheDocument();
});

test('test for test warning without crashing', () => {
  const {getByTitle} = render(
    <TestApp>
      <ScheduleTableFaultWarning mode={SCHEDULE_TABLE_TYPES.TEST} />
    </TestApp>,
  );
  expect(getByTitle('Network Test Unavailable')).toBeInTheDocument();
});
