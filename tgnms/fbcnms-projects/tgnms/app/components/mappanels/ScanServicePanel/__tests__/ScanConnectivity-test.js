/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import React from 'react';
import ScanConnectivity from '../ScanConnectivity';
import {TestApp} from '../../../../tests/testHelpers';
import {cleanup, render} from '@testing-library/react';

afterEach(cleanup);

const defaultProps = {
  onBack: jest.fn(),
  results: [],
  startDate: new Date(),
};

test('renders', () => {
  const {getByText} = render(
    <TestApp>
      <ScanConnectivity {...defaultProps} />
    </TestApp>,
  );
  expect(getByText('Search')).toBeInTheDocument();
});
