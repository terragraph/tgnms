/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import NetworkGraphs from '../NetworkGraphs';
import React from 'react';
import {NetworkContextWrapper, TestApp} from '../../../tests/testHelpers';
import {cleanup, render} from '@testing-library/react';
import {mockNetworkContext} from '../../../tests/data/NetworkContext';

jest
  .spyOn(require('../../../contexts/NetworkContext'), 'useNetworkContext')
  .mockImplementation(jest.fn(() => mockNetworkContext()));

afterEach(() => {
  cleanup();
  jest.clearAllMocks();
});

const defaultProps = {
  data: null,
  startTime: 0,
  endTime: 1,
};

test('renders', () => {
  const {getByText} = render(
    <TestApp route="/nodes">
      <NetworkContextWrapper>
        <NetworkGraphs {...defaultProps} />
      </NetworkContextWrapper>
    </TestApp>,
  );
  expect(getByText('Network')).toBeInTheDocument();
  expect(getByText('Link Availability')).toBeInTheDocument();
  expect(getByText('Node Availability')).toBeInTheDocument();
});
