/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import * as mockTopologyHelpers from '@fbcnms/tg-nms/app/helpers/TopologyHelpers';
import * as topologyBuilderMock from '@fbcnms/tg-nms/app/contexts/TopologyBuilderContext';
import AddTopologyPanel from '../AddTopologyPanel';
import {FORM_TYPE} from '@fbcnms/tg-nms/app/constants/MapPanelConstants';
import {
  NetworkContextWrapper,
  mockNode,
  mockSite,
} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {TOPOLOGY_ELEMENT} from '@fbcnms/tg-nms/app/constants/NetworkConstants';
import {TestApp, mockPanelControl} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {act, fireEvent, render} from '@testing-library/react';
import {apiRequest as mockApiRequest} from '@fbcnms/tg-nms/app/apiutils/ServiceAPIUtil';
import {mockTopologyBuilderContext} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {sendTopologyBuilderRequest as sendTopologyBuilderRequestMock} from '@fbcnms/tg-nms/app/helpers/MapPanelHelpers';

jest.mock('@fbcnms/tg-nms/app/helpers/MapPanelHelpers', () => ({
  ...jest.requireActual('@fbcnms/tg-nms/app/helpers/MapPanelHelpers'),
  sendTopologyBuilderRequest: jest.fn(),
}));

jest.mock('@fbcnms/tg-nms/app/apiutils/ServiceAPIUtil', () => ({
  ...jest.requireActual('@fbcnms/tg-nms/app/apiutils/ServiceAPIUtil'),
  apiRequest: jest.fn(),
}));

const defaultProps = {
  panelControl: mockPanelControl({
    getIsOpen: jest.fn().mockReturnValue(true),
    getIsHidden: jest.fn().mockReturnValue(false),
  }),
};
beforeEach(() => {
  jest.resetModules();
});

test('moving site updates its own nodes', async () => {
  /**
   * We have the site `MyOldSiteName` with one node `node1`.
   * We are renaming the site to be `MyNewSiteName` and triggering
   * an update for the azumith.
   */
  const newSite = {name: 'MyNewSiteName'};
  const currentNode = mockNode({
    name: 'node1',
    site_name: 'MyOldSiteName',
    ant_azimuth: 100.0,
  });

  const builderMock = jest
    .spyOn(topologyBuilderMock, 'useTopologyBuilderContext')
    .mockReturnValue(
      mockTopologyBuilderContext({
        initialParams: {site: {name: 'MyOldSiteName'}, links: [], nodes: []},
        newTopology: {site: newSite, links: [], nodes: []},
        formType: FORM_TYPE.EDIT,
        elementType: TOPOLOGY_ELEMENT.SITE,
      }),
    );
  jest.spyOn(mockTopologyHelpers, 'getWirelessPeers').mockReturnValue([]);
  // Trigger an editNode api call by changing the azimuth.
  jest.spyOn(mockTopologyHelpers, 'getEstimatedNodeAzimuth').mockReturnValue(0);
  const {getByTestId} = render(
    <TestApp>
      <NetworkContextWrapper
        contextValue={{
          networkName: 'my_network',
          siteMap: {MyOldSiteName: mockSite({name: 'MyOldSiteName'})},
          siteToNodesMap: {MyOldSiteName: new Set(['node1'])},
          nodeMap: {
            node1: currentNode,
          },
        }}>
        <AddTopologyPanel {...defaultProps} />
      </NetworkContextWrapper>
    </TestApp>,
  );
  await act(async () => {
    fireEvent.click(getByTestId('save-topology-button'));
  });
  expect(sendTopologyBuilderRequestMock).toHaveBeenCalledWith(
    'my_network',
    'editSite',
    {
      siteName: 'MyOldSiteName',
      newSite: newSite,
    },
    expect.anything(),
  );
  expect(mockApiRequest).toHaveBeenCalledWith({
    networkName: 'my_network',
    endpoint: 'editNode',
    data: {
      nodeName: 'node1',
      newNode: {...currentNode, site_name: 'MyNewSiteName', ant_azimuth: 0},
    },
  });
  builderMock.mockRestore();
});

test('add topology panel render empty without crashing', () => {
  const {getByText} = render(
    <TestApp>
      <AddTopologyPanel {...defaultProps} />
    </TestApp>,
  );
  expect(getByText('Add Topology')).toBeInTheDocument();
});

test('site portion renders', () => {
  const {getByText} = render(
    <TestApp>
      <AddTopologyPanel {...defaultProps} />
    </TestApp>,
  );
  expect(getByText('Site')).toBeInTheDocument();
});

test('expanding advanced on sites shows location detail', () => {
  const {getByText} = render(
    <TestApp>
      <AddTopologyPanel {...defaultProps} />
    </TestApp>,
  );
  fireEvent.click(getByText('Show Advanced Settings'));
  expect(
    getByText('The altitude of the site (in meters).'),
  ).toBeInTheDocument();
});

test('node portion renders', () => {
  const {getByText} = render(
    <TestApp>
      <AddTopologyPanel {...defaultProps} />
    </TestApp>,
  );
  expect(getByText('Nodes')).toBeInTheDocument();
});

test('clicking nodes expands nodes details', () => {
  const {getByText} = render(
    <TestApp>
      <AddTopologyPanel {...defaultProps} />
    </TestApp>,
  );
  fireEvent.click(getByText('Nodes'));

  expect(getByText('+ Add Node')).toBeInTheDocument();
});

test('links portion renders', () => {
  const {getByText} = render(
    <TestApp>
      <AddTopologyPanel {...defaultProps} />
    </TestApp>,
  );
  expect(getByText('Links')).toBeInTheDocument();
});

test('clicking links expands link details', () => {
  const {getByText} = render(
    <TestApp>
      <AddTopologyPanel {...defaultProps} />
    </TestApp>,
  );
  fireEvent.click(getByText('Links'));

  expect(getByText('+ Add Link')).toBeInTheDocument();
});
