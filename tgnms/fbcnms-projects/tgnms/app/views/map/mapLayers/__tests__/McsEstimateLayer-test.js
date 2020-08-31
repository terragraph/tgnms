/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
import 'jest-dom/extend-expect';
import * as React from 'react';
import McsEstimateLayer from '../McsEstimateLayer';
import {
  MapContextWrapper,
  NetworkContextWrapper,
  TestApp,
  mockFig0,
  mockNetworkConfig,
} from '../../../../tests/testHelpers';
import {buildTopologyMaps} from '../../../../helpers/TopologyHelpers';

import {cleanup, render} from '@testing-library/react';

import type {NetworkContextType} from '../../../../contexts/NetworkContext';

afterEach(cleanup);

test('renders', async () => {
  await render(
    <Wrapper>
      <McsEstimateLayer />
    </Wrapper>,
  );
});

function Wrapper({
  children,
  networkVals,
}: {
  children: React.Node,
  networkVals?: $Shape<NetworkContextType>,
}) {
  const topology = mockFig0();
  // node with no links to ensure no crashy business
  topology.__test.addNode({
    name: 'site1-99',
    site_name: 'site1',
  });
  const topologyMaps = buildTopologyMaps(topology);
  return (
    <TestApp>
      <NetworkContextWrapper
        contextValue={{
          networkConfig: mockNetworkConfig({topology: topology}),
          ...topologyMaps,
          ...(networkVals || {}: $Shape<NetworkContextType>),
        }}>
        <MapContextWrapper>{children}</MapContextWrapper>
      </NetworkContextWrapper>
    </TestApp>
  );
}
