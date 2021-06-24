/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import NetworkDrawer from '../NetworkDrawer';
import {
  NetworkContextWrapper,
  TestApp,
  clickPanel,
  getIsExpanded,
  initWindowConfig,
  mockNetworkConfig,
  mockSingleLink,
} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {TOPOLOGY_ELEMENT} from '@fbcnms/tg-nms/app/constants/NetworkConstants';
import {buildTopologyMaps} from '@fbcnms/tg-nms/app/helpers/TopologyHelpers';
import {render} from '@testing-library/react';

beforeEach(() => {
  initWindowConfig();
});

const commonProps = {
  networkDrawerWidth: 200,
  onNetworkDrawerResize: jest.fn(() => {}),
  mapLayersProps: {
    selectedMapStyle: '',
    mapStylesConfig: [],
    onMapStyleSelectChange: jest.fn(),
    expanded: false,
    onPanelChange: jest.fn(),
  },
  searchNearbyProps: {nearbyNodes: {}, onUpdateNearbyNodes: jest.fn(() => {})},
  siteProps: {hideSite: jest.fn(), unhideSite: jest.fn()},
};

test('overview panel should be open by default', async () => {
  const {getByTestId} = render(
    <DrawerWrapper>
      <NetworkDrawer {...commonProps} />,
    </DrawerWrapper>,
  );
  const panel = getByTestId('overview-panel');
  expect(getIsExpanded(panel)).toBe(true);
});
test('overview panel should toggle', async () => {
  const {getByTestId} = render(
    <DrawerWrapper>
      <NetworkDrawer {...commonProps} />,
    </DrawerWrapper>,
  );
  const panel = getByTestId('overview-panel');
  expect(getIsExpanded(panel)).toBe(true);
  clickPanel(panel);
  expect(getIsExpanded(panel)).toBe(false);
  clickPanel(panel);
  expect(getIsExpanded(panel)).toBe(true);
});
test('map layers should toggle', async () => {
  const {getByTestId} = render(
    <DrawerWrapper>
      <NetworkDrawer {...commonProps} />,
    </DrawerWrapper>,
  );
  const panel = getByTestId('map-layers-panel');
  expect(getIsExpanded(panel)).toBe(false);
  clickPanel(panel);
  expect(getIsExpanded(panel)).toBe(true);
  clickPanel(panel);
  expect(getIsExpanded(panel)).toBe(false);
});

test('all panels close if an element is selected', async () => {
  const topology = mockSingleLink();
  const topologyMaps = buildTopologyMaps(topology);
  const selectedElement = {
    name: 'site1',
    type: TOPOLOGY_ELEMENT.SITE,
    expanded: true,
  };
  const {getByTestId, rerender} = render(
    <DrawerWrapper
      contextValue={{
        networkConfig: mockNetworkConfig({topology: topology}),
        ...topologyMaps,
      }}>
      <NetworkDrawer {...commonProps} />,
    </DrawerWrapper>,
  );
  // open both panels
  const ovPanel = getByTestId('overview-panel');
  const mapPanel = getByTestId('map-layers-panel');
  clickPanel(mapPanel);
  expect(getIsExpanded(ovPanel)).toBe(true);
  expect(getIsExpanded(mapPanel)).toBe(true);
  // render with selected topology element
  await rerender(
    <DrawerWrapper
      contextValue={{
        networkConfig: mockNetworkConfig({topology: topology}),
        ...topologyMaps,
        selectedElement,
      }}>
      <NetworkDrawer {...commonProps} />,
    </DrawerWrapper>,
  );
  // both panels should be closed
  expect(getIsExpanded(ovPanel)).toBe(false);
  expect(getIsExpanded(mapPanel)).toBe(false);
});

function DrawerWrapper({children, ...contextProps}: {children: React.Node}) {
  return (
    <TestApp>
      <NetworkContextWrapper {...contextProps}>
        {children}
      </NetworkContextWrapper>
    </TestApp>
  );
}
