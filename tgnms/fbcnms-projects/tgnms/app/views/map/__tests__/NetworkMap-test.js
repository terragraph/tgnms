/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import 'jest-dom/extend-expect';
import * as React from 'react';
import NetworkMap from '../NetworkMap';
import {Layer} from 'react-mapbox-gl';
import {
  NetworkContextWrapper,
  TestApp,
  initWindowConfig,
  mockNetworkConfig,
  mockTopology,
  renderWithRouter,
} from '../../../tests/testHelpers';
import {buildTopologyMaps} from '../../../helpers/TopologyHelpers';
beforeEach(() => {
  initWindowConfig();
});

const commonProps = {
  /*
   * NetworkMap only uses bounds on the networkConfig passed as props.
   * All other uses of NetworkConfig consumed through context.
   */
  networkConfig: {bounds: {}},
  networkName: 'test',
};

test('renders without crashing with minimal props ', () => {
  renderWithRouter(<NetworkMap {...commonProps} />, {wrapper: MapWrapper});
  // assert that layers were rendered
  expect(Layer).toHaveBeenCalled();
});

test('renders with some sites and links', () => {
  const topology = basicTopology();
  const topologyMaps = buildTopologyMaps(topology);

  renderWithRouter(
    <MapWrapper
      contextValue={{
        networkConfig: mockNetworkConfig({topology: topology}),
        ...topologyMaps,
      }}>
      <NetworkMap {...commonProps} />
    </MapWrapper>,
  );
});

function MapWrapper({children, ...contextProps}: {children: React.Node}) {
  return (
    <TestApp>
      <NetworkContextWrapper {...contextProps}>
        {children}
      </NetworkContextWrapper>
    </TestApp>
  );
}

function basicTopology() {
  const topology = mockTopology();
  topology.__test
    .addNode({
      name: 'node1',
      site_name: 'site1',
    })
    .addNode({
      name: 'node2',
      site_name: 'site2',
    })
    .addLink({
      a_node_name: 'node1',
      z_node_name: 'node2',
    });
  return topology;
}