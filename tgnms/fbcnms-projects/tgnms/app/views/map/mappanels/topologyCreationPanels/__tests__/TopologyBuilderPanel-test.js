/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import TopologyBuilderPanel from '../TopologyBuilderPanel';
import {FORM_TYPE} from '@fbcnms/tg-nms/app/constants/MapPanelConstants';
import {
  NetworkContextWrapper,
  TestApp,
  mockNetworkConfig,
  mockPanelControl,
  mockTopology,
  renderAsync,
} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {SnackbarProvider} from 'notistack';
import {buildTopologyMaps} from '@fbcnms/tg-nms/app/helpers/TopologyHelpers';
import {render} from '@testing-library/react';
import type {TopologyBuilderState} from '../useTopologyBuilderForm';

jest.mock('mapbox-gl/dist/mapbox-gl', () => ({
  Map: () => ({}),
}));

const defaultProps = {
  siteProps: {
    hideSite: jest.fn(),
    unhideSite: jest.fn(),
  },
  panelControl: mockPanelControl({
    getIsOpen: jest.fn().mockReturnValue(true),
    getIsHidden: jest.fn().mockReturnValue(false),
  }),
  panelForm: mockPanelForm(),
};

test('add node panel render empty without crashing', () => {
  const {getAllByText} = render(
    <TopologyBuilderWrapper>
      <TopologyBuilderPanel {...defaultProps} />
    </TopologyBuilderWrapper>,
  );
  expect(getAllByText('Add Node').length === 2);
});

test('add Site renders', async () => {
  const {getByText} = await renderAsync(
    <TopologyBuilderWrapper>
      <TopologyBuilderPanel {...defaultProps} />
    </TopologyBuilderWrapper>,
  );
  expect(getByText('Add Planned Site')).toBeInTheDocument();
});

test('Add link panel renders', async () => {
  const {getAllByText} = await renderAsync(
    <TopologyBuilderWrapper>
      <TopologyBuilderPanel {...defaultProps} />
    </TopologyBuilderWrapper>,
  );
  expect(getAllByText('Add Link').length === 2);
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
    formType: FORM_TYPE.CREATE,
    updateForm: jest.fn(),
  };
}
