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
import ScanServiceSummary from '../ScanServiceSummary';
import {TestApp} from '@fbcnms/tg-nms/app/tests/testHelpers';
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
