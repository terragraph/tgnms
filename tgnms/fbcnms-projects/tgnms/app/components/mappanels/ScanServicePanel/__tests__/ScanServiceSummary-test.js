/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import React from 'react';
import ScanServiceSummary from '../ScanServiceSummary';
import {TestApp} from '../../../../tests/testHelpers';
import {render} from '@testing-library/react';

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
