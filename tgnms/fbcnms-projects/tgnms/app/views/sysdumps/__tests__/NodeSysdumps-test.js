/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
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
} from '@fbcnms/tg-nms/app/tests/testHelpers';

jest.mock('axios');

beforeEach(() => {
  initWindowConfig();
});

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
