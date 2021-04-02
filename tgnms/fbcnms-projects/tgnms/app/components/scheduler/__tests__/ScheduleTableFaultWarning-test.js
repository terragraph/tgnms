/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import 'jest-dom/extend-expect';
import * as React from 'react';
import ScheduleTableFaultWarning from '../ScheduleTableFaultWarning';
import {SCHEDULE_TABLE_TYPES} from '../../../constants/ScheduleConstants';
import {TestApp} from '../../../tests/testHelpers';
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
