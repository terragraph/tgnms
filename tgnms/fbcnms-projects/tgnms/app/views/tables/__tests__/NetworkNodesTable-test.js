/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow strict-local
 */

import * as React from 'react';
import NetworkNodesTable from '../NetworkNodesTable';
import {
  NetworkContextWrapper,
  TestApp,
  mockNetworkConfig,
} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {Route} from 'react-router-dom';
import {buildTopologyMaps} from '@fbcnms/tg-nms/app/helpers/TopologyHelpers';
import {mockFig0} from '@fbcnms/tg-nms/app/tests/data/NetworkConfig';
import {render} from '@testing-library/react';

test('renders table with no data', () => {
  const {getByTestId} = render(
    <TestApp route="/nodes">
      <NetworkContextWrapper contextValue={{}}>
        <Route path="/" render={_r => <NetworkNodesTable />} />
      </NetworkContextWrapper>
    </TestApp>,
  );

  expect(getByTestId('network-nodes-table')).toBeInTheDocument();
});

test('renders table with data', () => {
  const {getByText, getByTestId} = render(
    <Wrapper>
      <Route path="/" render={_r => <NetworkNodesTable />} />
    </Wrapper>,
  );
  expect(getByTestId('network-nodes-table')).toBeInTheDocument();
  expect(getByText('site1')).toBeInTheDocument();
});

function Wrapper({children}: {children: React.Node}) {
  const topology = mockFig0();
  const topologyMaps = buildTopologyMaps(topology);
  return (
    <TestApp>
      <NetworkContextWrapper
        contextValue={{
          networkConfig: mockNetworkConfig({topology: topology}),
          ...topologyMaps,
        }}>
        {children}
      </NetworkContextWrapper>
    </TestApp>
  );
}
