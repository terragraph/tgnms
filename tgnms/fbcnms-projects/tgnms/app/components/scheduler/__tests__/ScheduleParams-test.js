/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import * as React from 'react';
import ScheduleParams from '../ScheduleParams';
import {NetworkContextWrapper, TestApp} from '../../../tests/testHelpers';
import {render} from '@testing-library/react';

const defaultProps = {
  scheduleParams: {typeSelector: <div />, advancedParams: <div />},
};

test('renders without crashing', () => {
  const {getByText} = render(
    <TestApp>
      <NetworkContextWrapper contextValue={{networkName: 'testName'}}>
        <ScheduleParams {...defaultProps} />
      </NetworkContextWrapper>
    </TestApp>,
  );
  expect(getByText('Type')).toBeInTheDocument();
  expect(getByText('Network')).toBeInTheDocument();
});
