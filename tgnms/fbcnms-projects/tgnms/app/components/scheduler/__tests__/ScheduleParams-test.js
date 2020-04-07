/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import 'jest-dom/extend-expect';
import * as React from 'react';
import ScheduleParams from '../ScheduleParams';
import {NetworkContextWrapper} from '../../../tests/testHelpers';
import {cleanup, render} from '@testing-library/react';

afterEach(cleanup);

const defaultProps = {
  scheduleParams: {typeSelector: <div />, advancedParams: <div />},
};

test('renders without crashing', () => {
  const {getByText} = render(
    <NetworkContextWrapper contextValue={{networkName: 'testName'}}>
      <ScheduleParams {...defaultProps} />
    </NetworkContextWrapper>,
  );
  expect(getByText('Type')).toBeInTheDocument();
  expect(getByText('Network')).toBeInTheDocument();
});
