/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import React from 'react';
import ScanInterference from '../ScanInterference';
import {TestApp} from '../../../../tests/testHelpers';
import {cleanup, render} from '@testing-library/react';

afterEach(cleanup);

const defaultProps = {
  onBack: jest.fn(),
  results: [],
  startDate: new Date(),
  aggregatedInr: {current: {}, n_day_avg: {}},
};

test('renders', () => {
  const {getByText} = render(
    <TestApp>
      <ScanInterference {...defaultProps} />
    </TestApp>,
  );
  expect(getByText('Interference')).toBeInTheDocument();
});
