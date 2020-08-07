/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import 'jest-dom/extend-expect';
import NodeSysdumps from '../NodeSysdumps';
import React from 'react';
import {
  NetworkContextWrapper,
  TestApp,
  initWindowConfig,
  mockNetworkConfig,
  renderWithRouter,
} from '../../../tests/testHelpers';
import {cleanup} from '@testing-library/react';

jest.useFakeTimers();
jest.mock('axios');
jest.mock('copy-to-clipboard');

beforeEach(() => {
  initWindowConfig();
});

afterEach(cleanup);

test('renders empty without crashing', () => {
  const sysdumps = [];
  const {getByTestId} = renderWithRouter(
    <TestApp>
      <NetworkContextWrapper
        contextValue={{networkConfig: mockNetworkConfig()}}>
        <NodeSysdumps sysdumps={sysdumps} />
      </NetworkContextWrapper>
    </TestApp>,
  );
  expect(getByTestId('sysdumps')).toBeInTheDocument();
});
