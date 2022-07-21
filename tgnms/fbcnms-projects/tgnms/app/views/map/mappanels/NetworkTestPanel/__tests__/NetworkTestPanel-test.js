/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow strict-local
 */

import NetworkTestPanel from '../NetworkTestPanel';
import React from 'react';
import {TestApp, renderWithRouter} from '@fbcnms/tg-nms/app/tests/testHelpers';

const defaultProps = {
  expanded: true,
  networkTestId: null,
};

test('doest not render table if there is no test ID', () => {
  const {queryByText} = renderWithRouter(
    <NetworkTestPanel {...defaultProps} />,
  );
  expect(queryByText('Network Test')).not.toBeInTheDocument();
});

test('renders table if there is a test ID', () => {
  const {getByText} = renderWithRouter(
    <TestApp>
      <NetworkTestPanel {...defaultProps} networkTestId={'1'} />
    </TestApp>,
  );
  expect(getByText('Network Test')).toBeInTheDocument();
});
