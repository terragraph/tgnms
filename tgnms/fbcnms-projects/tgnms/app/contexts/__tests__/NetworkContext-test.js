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
import {
  NetworkContextWrapper,
  TestApp,
  mockNetworkConfig,
  renderWithRouter,
} from '@fbcnms/tg-nms/app/tests/testHelpers';

test('renders without crashing', () => {
  const {getByText} = renderWithRouter(
    <TestApp>
      <NetworkContextWrapper>test</NetworkContextWrapper>
    </TestApp>,
  );
  expect(getByText('test')).toBeInTheDocument();
});

test('renders with a null wireless_controller without crashing', () => {
  const {getByText} = renderWithRouter(
    <TestApp>
      <NetworkContextWrapper
        contextValue={{
          networkConfig: mockNetworkConfig({wireless_controller: null}),
        }}>
        test
      </NetworkContextWrapper>
    </TestApp>,
  );
  expect(getByText('test')).toBeInTheDocument();
});
