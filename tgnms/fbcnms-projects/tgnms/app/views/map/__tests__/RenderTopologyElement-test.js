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
import RenderTopologyElement from '../RenderTopologyElement';
import {
  NetworkContextWrapper,
  TestApp,
  initWindowConfig,
  mockNetworkConfig,
  mockPanelControl,
  mockSingleLink,
} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {TOPOLOGY_ELEMENT} from '@fbcnms/tg-nms/app/constants/NetworkConstants';
import {buildTopologyMaps} from '@fbcnms/tg-nms/app/helpers/TopologyHelpers';
import {render} from '@testing-library/react';

beforeEach(() => {
  initWindowConfig();
});

const commonProps = {
  element: {
    name: 'site1',
    type: TOPOLOGY_ELEMENT.SITE,
    expanded: true,
  },
  panelControl: mockPanelControl({
    getIsOpen: jest.fn(() => true),
    getIsHidden: jest.fn(() => false),
  }),
  searchNearbyProps: {nearbyNodes: {}, onUpdateNearbyNodes: jest.fn(() => {})},
  onEditTopology: jest.fn(() => {}),
};

test('renders site when it is selected', async () => {
  const selectedElement = {
    name: 'site1',
    type: TOPOLOGY_ELEMENT.SITE,
    expanded: true,
  };
  const {getByText} = render(
    <ElementWrapper>
      <RenderTopologyElement {...commonProps} element={selectedElement} />
    </ElementWrapper>,
  );
  expect(getByText('site1')).toBeInTheDocument();
});

test('renders node when it is selected', async () => {
  const selectedElement = {
    name: 'node1',
    type: TOPOLOGY_ELEMENT.NODE,
    expanded: true,
  };
  const {getByText} = render(
    <ElementWrapper>
      <RenderTopologyElement {...commonProps} element={selectedElement} />
    </ElementWrapper>,
  );
  expect(getByText('node1')).toBeInTheDocument();
});

test('renders link when it is selected', async () => {
  const selectedElement = {
    name: 'link-node1-node2',
    type: TOPOLOGY_ELEMENT.LINK,
    expanded: true,
  };
  const {getByText} = render(
    <ElementWrapper>
      <RenderTopologyElement {...commonProps} element={selectedElement} />
    </ElementWrapper>,
  );
  expect(getByText('link-node1-node2')).toBeInTheDocument();
});

function ElementWrapper({children}: {children: React.Node}) {
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
