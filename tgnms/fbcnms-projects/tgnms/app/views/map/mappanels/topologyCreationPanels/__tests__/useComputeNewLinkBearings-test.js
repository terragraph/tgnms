/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import {
  NetworkContextWrapper,
  TestApp,
} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {
  buildTopologyMaps,
  makeLinkName,
} from '@fbcnms/tg-nms/app/helpers/TopologyHelpers';
import {renderHook} from '@testing-library/react-hooks';
import {useComputeNewLinkBearings} from '../useComputeNewLinkBearings';

import {
  FIG0,
  mockFig0,
  mockLink,
  mockNetworkConfig,
} from '@fbcnms/tg-nms/app/tests/data/NetworkConfig';

test('computes bearings for both sides of a link', () => {
  const topology = mockFig0();
  const link = mockLink({
    name: makeLinkName(FIG0.NODE1_0, FIG0.NODE3_0),
    a_node_name: FIG0.NODE1_0,
    z_node_name: FIG0.NODE3_0,
  });
  const {result} = renderHook(() => useComputeNewLinkBearings(), {
    wrapper: props => (
      <TestWrapper
        {...props}
        networkContext={{
          networkConfig: mockNetworkConfig({topology}),
          ...buildTopologyMaps(topology),
        }}
      />
    ),
  });
  const bearings = result.current(link);
  /**
   * Node 1 is at (0,0) and is already connected to
   */
  expect(Math.abs(bearings.bearingA - 30)).toBeLessThan(10);
  expect(Math.abs(bearings.bearingZ - -160)).toBeLessThan(10);
});

function TestWrapper({networkContext, children}) {
  return (
    <TestApp>
      <NetworkContextWrapper contextValue={networkContext}>
        {children}
      </NetworkContextWrapper>
    </TestApp>
  );
}
