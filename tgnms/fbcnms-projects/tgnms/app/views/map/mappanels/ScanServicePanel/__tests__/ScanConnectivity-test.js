/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import React from 'react';
import ScanConnectivity from '../ScanConnectivity';
import {TestApp} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {render} from '@testing-library/react';

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
