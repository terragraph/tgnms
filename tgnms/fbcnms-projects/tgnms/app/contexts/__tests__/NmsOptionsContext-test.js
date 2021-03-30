/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import 'jest-dom/extend-expect';
import React from 'react';
import {
  NmsOptionsContextWrapper,
  TestApp,
  mockNetworkMapOptions,
  renderWithRouter,
} from '../../tests/testHelpers';
import {cleanup} from '@testing-library/react';

afterEach(cleanup);

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
