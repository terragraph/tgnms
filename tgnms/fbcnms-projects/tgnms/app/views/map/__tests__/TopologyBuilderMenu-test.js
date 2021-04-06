/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import TopologyBuilderMenu from '../TopologyBuilderMenu';
import {FormType} from '../../../constants/MapPanelConstants';
import {
  NetworkContextWrapper,
  TestApp,
  mockNetworkConfig,
  mockPanelControl,
  mockTopology,
  renderAsync,
} from '../../../tests/testHelpers';
import {SnackbarProvider} from 'notistack';
import {act, cleanup, fireEvent, render} from '@testing-library/react';
import {buildTopologyMaps} from '../../../helpers/TopologyHelpers';
import type {TopologyBuilderState} from '../TopologyBuilderMenu';

afterEach(cleanup);

jest.mock('mapbox-gl/dist/mapbox-gl', () => ({
  Map: () => ({}),
}));

const defaultProps = {
  siteProps: {
    hideSite: jest.fn(),
    unhideSite: jest.fn(),
  },
  mapRef: null,
  panelControl: mockPanelControl({
    getIsOpen: jest.fn().mockReturnValue(true),
    getIsHidden: jest.fn().mockReturnValue(false),
  }),
  panelForm: mockPanelForm(),
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
  const {getByTestId} = await renderAsync(
    <TopologyBuilderWrapper>
      <TopologyBuilderMenu {...defaultProps} />
    </TopologyBuilderWrapper>,
  );
  expect(getByTestId('addTopologyIcon')).toBeInTheDocument();
  act(() => {
    fireEvent.click(getByTestId('addTopologyIcon'));
  });
  expect(getByTestId('add-node')).toBeInTheDocument();
});

test('clicking AddNode opens add Node panel', async () => {
  const {getByTestId, getByText} = await renderAsync(
    <TopologyBuilderWrapper>
      <TopologyBuilderMenu {...defaultProps} />
    </TopologyBuilderWrapper>,
  );
  expect(getByTestId('addTopologyIcon')).toBeInTheDocument();
  act(() => {
    fireEvent.click(getByTestId('addTopologyIcon'));
  });
  expect(getByTestId('add-node')).toBeInTheDocument();
  fireEvent.click(getByTestId('add-node'));
  expect(getByText('Node MAC Address')).toBeInTheDocument();
  expect(getByText('Node Name')).toBeInTheDocument();
});

test('clicking AddLink opens add Link panel', async () => {
  const {getByTestId, getAllByText} = await renderAsync(
    <TopologyBuilderWrapper>
      <TopologyBuilderMenu {...defaultProps} />
    </TopologyBuilderWrapper>,
  );
  expect(getByTestId('addTopologyIcon')).toBeInTheDocument();
  act(() => {
    fireEvent.click(getByTestId('addTopologyIcon'));
  });
  const btn = getByTestId('add-link');
  expect(btn).toBeInTheDocument();
  fireEvent.click(btn);
  expect(getAllByText('Node 1 *')).toHaveLength(2);
  expect(getAllByText('Node 2 *')).toHaveLength(2);
});

test('clicking AddSite opens add Site panel', async () => {
  const {getByTestId, getByText} = await renderAsync(
    <TopologyBuilderWrapper>
      <TopologyBuilderMenu {...defaultProps} />
    </TopologyBuilderWrapper>,
  );
  expect(getByTestId('addTopologyIcon')).toBeInTheDocument();
  act(() => {
    fireEvent.click(getByTestId('addTopologyIcon'));
  });
  const addSite = getByTestId('add-planned-site');
  expect(addSite).toBeInTheDocument();
  fireEvent.click(addSite);
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
    .addNode({
      name: 'node2',
      site_name: 'site2',
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

function mockPanelForm(): TopologyBuilderState<any> {
  return {
    params: {},
    formType: FormType.CREATE,
    updateForm: jest.fn(),
  };
}
