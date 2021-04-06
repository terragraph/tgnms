/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import NodeSysdumps from '../NodeSysdumps';
import React from 'react';
import axios from 'axios';
import {
  NetworkContextWrapper,
  TestApp,
  initWindowConfig,
  mockNetworkConfig,
  renderWithRouter,
} from '../../../tests/testHelpers';
import {cleanup} from '@testing-library/react';

jest.mock('axios');

beforeEach(() => {
  initWindowConfig();
});

afterEach(cleanup);

test('renders empty without crashing', async () => {
  const getMock = jest.spyOn(axios, 'get').mockResolvedValueOnce({
    data: [],
  });
  const {getByTestId} = renderWithRouter(
    <TestApp>
      <NetworkContextWrapper
        contextValue={{networkConfig: mockNetworkConfig()}}>
        <NodeSysdumps />
      </NetworkContextWrapper>
    </TestApp>,
  );
  expect(getMock).toHaveBeenCalled();
  await new Promise(resolve => {
    setTimeout(resolve, 0);
  });
  expect(getByTestId('sysdumps')).toBeInTheDocument();
});
