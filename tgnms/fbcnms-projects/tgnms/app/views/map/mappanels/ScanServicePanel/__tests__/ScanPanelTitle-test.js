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
import ScanPanelTitle from '../ScanPanelTitle';
import {TestApp} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {render} from '@testing-library/react';

const defaultProps = {
  onBack: jest.fn(),
  startDate: new Date(),
  title: 'Test Title',
};

test('renders', () => {
  const {getByText} = render(
    <TestApp>
      <ScanPanelTitle {...defaultProps} />
    </TestApp>,
  );
  expect(getByText('Test Title')).toBeInTheDocument();
});
