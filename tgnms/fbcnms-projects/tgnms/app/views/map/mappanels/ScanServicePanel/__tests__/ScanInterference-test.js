/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow strict-local
 */

import React from 'react';
import ScanInterference from '../ScanInterference';
import {TestApp} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {render} from '@testing-library/react';

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
