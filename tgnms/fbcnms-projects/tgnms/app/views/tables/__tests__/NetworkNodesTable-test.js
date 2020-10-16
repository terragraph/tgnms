/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */
import 'jest-dom/extend-expect';
import * as React from 'react';
import NetworkNodesTable from '../NetworkNodesTable';
import {
  NetworkContextWrapper,
  TestApp,
  mockNetworkConfig,
} from '../../../tests/testHelpers';
import {Route} from 'react-router-dom';
import {buildTopologyMaps} from '../../../helpers/TopologyHelpers';
import {mockFig0} from '../../../tests/data/NetworkConfig';
import {render} from '@testing-library/react';

test('renders table with no data', () => {
  const {getByTestId} = render(
    <TestApp route="/nodes">
      <NetworkContextWrapper contextValue={{}}>
        <Route path="/" render={r => <NetworkNodesTable {...r} />} />
      </NetworkContextWrapper>
    </TestApp>,
  );

  expect(getByTestId('network-nodes-table')).toBeInTheDocument();
});

test('renders table with data', () => {
  const {getByText, getByTestId} = render(
    <Wrapper>
      <Route path="/" render={r => <NetworkNodesTable {...r} />} />
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
