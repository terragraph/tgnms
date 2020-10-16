/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */
import 'jest-dom/extend-expect';
import React from 'react';
import ScanServiceSummary from '../ScanServiceSummary';
import {TestApp} from '../../../../tests/testHelpers';
import {cleanup, render} from '@testing-library/react';

afterEach(cleanup);

const defaultProps = {
  scanId: '1',
};

test('renders loading box', () => {
  const {getByTestId} = render(
    <TestApp>
      <ScanServiceSummary {...defaultProps} />,
    </TestApp>,
  );
  expect(getByTestId('loading-box')).toBeInTheDocument();
});
