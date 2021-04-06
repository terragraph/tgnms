/**
 * Copyright 2004-present Facebook. All Rights Reserved.
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
} from '../../tests/testHelpers';

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
