/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 */

import React from 'react';
import {
  NmsOptionsContextWrapper,
  TestApp,
  mockNetworkMapOptions,
  renderWithRouter,
} from '@fbcnms/tg-nms/app/tests/testHelpers';

test('renders without crashing', () => {
  const {getByText} = renderWithRouter(
    <TestApp>
      <NmsOptionsContextWrapper>test</NmsOptionsContextWrapper>
    </TestApp>,
  );
  expect(getByText('test')).toBeInTheDocument();
});

test('renders with valid networkMapOptions', () => {
  const {getByText} = renderWithRouter(
    <TestApp>
      <NmsOptionsContextWrapper
        contextValue={{networkMapOptions: mockNetworkMapOptions()}}>
        test
      </NmsOptionsContextWrapper>
    </TestApp>,
  );
  expect(getByText('test')).toBeInTheDocument();
});
