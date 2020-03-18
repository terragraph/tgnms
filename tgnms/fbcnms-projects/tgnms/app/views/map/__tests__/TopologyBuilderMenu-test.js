/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import 'jest-dom/extend-expect';
import * as React from 'react';
import TopologyBuilderMenu from '../TopologyBuilderMenu';
import {
  NetworkContextWrapper,
  TestApp,
  mockNetworkConfig,
  mockTopology,
  renderAsync,
} from '../../../tests/testHelpers';
import {SnackbarProvider} from 'notistack';
import {buildTopologyMaps} from '../../../helpers/TopologyHelpers';
import {cleanup, fireEvent, render} from '@testing-library/react';

afterEach(cleanup);

jest.mock('mapbox-gl/dist/mapbox-gl', () => ({
  Map: () => ({}),
}));

const defaultProps = {
  bottomOffset: 0,
  plannedSiteProps: {
    plannedSite: null,
    onUpdatePlannedSite: jest.fn(),
    hideSite: jest.fn(),
    unhideSite: jest.fn(),
  },
  editTopologyElement: null,
  addTopologyElementType: null,
  params: null,
  mapRef: null,
  updateTopologyPanelExpanded: jest.fn(),
};

test('renders empty without crashing', () => {
  const {getByTestId} = render(
    <TopologyBuilderWrapper>
      <TopologyBuilderMenu {...defaultProps} />
    </TopologyBuilderWrapper>,
  );
  expect(getByTestId('addTopologyIcon')).toBeInTheDocument();
});

test('clicking button Opens menu', async () => {
  const {getByTestId, getByText} = await renderAsync(
    <TopologyBuilderWrapper>
      <TopologyBuilderMenu {...defaultProps} />
    </TopologyBuilderWrapper>,
  );
  expect(getByTestId('addTopologyIcon')).toBeInTheDocument();
  fireEvent.click(getByTestId('addTopologyIcon'));
  expect(getByText('Add Node')).toBeInTheDocument();
});

test('clicking AddNode opens add Node panel', async () => {
  const {getByTestId, getByText} = await renderAsync(
    <TopologyBuilderWrapper>
      <TopologyBuilderMenu {...defaultProps} />
    </TopologyBuilderWrapper>,
  );
  expect(getByTestId('addTopologyIcon')).toBeInTheDocument();
  fireEvent.click(getByTestId('addTopologyIcon'));
  expect(getByText('Add Node')).toBeInTheDocument();
  fireEvent.click(getByText('Add Node'));
  expect(getByText('Node MAC Address')).toBeInTheDocument();
  expect(getByText('Node Name')).toBeInTheDocument();
});

test('clicking AddLink opens add Link panel', async () => {
  const {getByTestId, getByText} = await renderAsync(
    <TopologyBuilderWrapper>
      <TopologyBuilderMenu {...defaultProps} />
    </TopologyBuilderWrapper>,
  );
  expect(getByTestId('addTopologyIcon')).toBeInTheDocument();
  fireEvent.click(getByTestId('addTopologyIcon'));
  expect(getByText('Add Link')).toBeInTheDocument();
  fireEvent.click(getByText('Add Link'));
  expect(getByText('Node 1 *')).toBeInTheDocument();
  expect(getByText('Node 2 *')).toBeInTheDocument();
});

test('clicking AddSite opens add Site panel', async () => {
  const {getByTestId, getByText} = await renderAsync(
    <TopologyBuilderWrapper>
      <TopologyBuilderMenu {...defaultProps} />
    </TopologyBuilderWrapper>,
  );
  expect(getByTestId('addTopologyIcon')).toBeInTheDocument();
  fireEvent.click(getByTestId('addTopologyIcon'));
  expect(getByText('Add Planned Site')).toBeInTheDocument();
  fireEvent.click(getByText('Add Planned Site'));
  expect(getByText('Latitude')).toBeInTheDocument();
  expect(getByText('Site Name')).toBeInTheDocument();
});

function TopologyBuilderWrapper({children}: {children: React.Node}) {
  const topology = mockTopology();
  topology.__test
    .addNode({
      name: 'node1',
      site_name: 'site1',
    })
    .addLink({
      a_node_name: 'node1',
      z_node_name: 'node2',
    });
  const topologyMaps = buildTopologyMaps(topology);

  return (
    <TestApp>
      <SnackbarProvider
        maxSnack={3}
        autoHideDuration={10000}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}>
        <NetworkContextWrapper
          contextValue={{
            networkConfig: mockNetworkConfig({topology: topology}),
            ...topologyMaps,
          }}>
          {children}
        </NetworkContextWrapper>
      </SnackbarProvider>
    </TestApp>
  );
}
