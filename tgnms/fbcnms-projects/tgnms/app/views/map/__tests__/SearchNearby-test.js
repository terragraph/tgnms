/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import SearchNearby from '../SearchNearby';
import {
  NetworkContextWrapper,
  TestApp,
  initWindowConfig,
  mockNetworkConfig,
  mockSingleLink,
} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {buildTopologyMaps} from '@fbcnms/tg-nms/app/helpers/TopologyHelpers';
import {render} from '@testing-library/react';

beforeEach(() => {
  initWindowConfig();
});

const commonProps = {
  onAddTopology: jest.fn(),
  nodeName: 'node1',
  searchNearbyProps: {
    nearbyNodes: {node1: {}},
    onUpdateNearbyNodes: jest.fn(() => {}),
  },
};

test('renders SearchNearbyPanel', async () => {
  const {getByText} = render(
    <SearchNearbyWrapper>
      <SearchNearby {...commonProps} />
    </SearchNearbyWrapper>,
  );
  expect(getByText('node1')).toBeInTheDocument();
});

function SearchNearbyWrapper({children}: {children: React.Node}) {
  const topology = mockSingleLink();
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
