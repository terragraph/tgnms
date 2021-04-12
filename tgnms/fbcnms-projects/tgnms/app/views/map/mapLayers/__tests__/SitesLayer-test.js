/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import * as React from 'react';
import SitesLayer from '../SitesLayer';

import {
  CN_SITE_COLOR,
  PLANNED_SITE_COLOR,
  POP_SITE_COLOR,
} from '@fbcnms/tg-nms/app/constants/LayerConstants';
import {NodeTypeValueMap as NodeType} from '@fbcnms/tg-nms/shared/types/Topology';
import {
  TestApp,
  mockRoutes,
  mockTopology,
} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {buildTopologyMaps} from '@fbcnms/tg-nms/app/helpers/TopologyHelpers';
import {
  getFeatureByAttributes,
  getLayerById,
  getPropValue,
} from '@fbcnms/tg-nms/app/tests/mapHelpers';
import {render} from '@testing-library/react';

import type {Props} from '../SitesLayer';
import type {TopologyConfig} from '@fbcnms/tg-nms/shared/dto/NetworkState';

const defaultTopology = basicTopology();
const commonProps: Props = {
  topology: defaultTopology,
  overlay: {
    id: 'mock',
    type: 'mock',
    name: 'mock',
  },
  selectedSites: {},
  nearbyNodes: {},
  topologyConfig: ({}: $Shape<TopologyConfig>),
  ctrlVersion: 'RELEASE_M45_PRE',
  ...buildTopologyMaps(defaultTopology),
  onPlannedSiteMoved: jest.fn(),
  onSelectSiteChange: jest.fn(),
  onSiteMouseEnter: jest.fn(),
  onSiteMouseLeave: jest.fn(),
  hiddenSites: new Set(),
  offlineWhitelist: {nodes: new Map(), links: new Map()},
  routes: mockRoutes(),
  siteMapOverrides: {},
  classes: {},
};

test('renders with default props', () => {
  render(
    <Wrapper>
      <SitesLayer {...commonProps} />
    </Wrapper>,
  );
});

test('renders POP_SITE_COLOR if site has a pop', () => {
  const {container} = render(
    <Wrapper>
      <SitesLayer {...commonProps} />
    </Wrapper>,
  );
  const layer = getLayerById(container, 'site-layer');
  if (!layer) {
    throw new Error();
  }
  const site = getFeatureByAttributes(layer, {
    'test-site-name': 'pop_site',
    'test-site-layer': 'inner-circle',
  });
  if (!site) {
    throw new Error();
  }
  const properties = getPropValue(site, 'properties');
  expect(properties?.siteColor).toBe(POP_SITE_COLOR);
});
test('renders CN_SITE_COLOR if site has a cn', () => {
  const {container} = render(
    <Wrapper>
      <SitesLayer {...commonProps} />
    </Wrapper>,
  );
  const layer = getLayerById(container, 'site-layer');
  if (!layer) {
    throw new Error();
  }
  const site = getFeatureByAttributes(layer, {
    'test-site-name': 'cn_site',
    'test-site-layer': 'inner-circle',
  });
  if (!site) {
    throw new Error();
  }
  const properties = getPropValue(site, 'properties');
  expect(properties?.siteColor).toBe(CN_SITE_COLOR);
});
test('renders a planned site if site is planned', () => {
  const {container} = render(
    <Wrapper>
      <SitesLayer
        {...commonProps}
        plannedSite={{
          name: 'planned_site',
          latitude: 10,
          longitude: 10,
          altitude: 1,
          accuracy: 1,
        }}
      />
    </Wrapper>,
  );
  const layer = getLayerById(container, 'site-layer');
  if (!layer) {
    throw new Error();
  }
  const site = getFeatureByAttributes(layer, {
    'test-planned-site-name': 'planned_site',
  });
  if (!site) {
    throw new Error();
  }
  const properties = getPropValue(site, 'properties');
  expect(site).toBeInTheDocument();
  expect(properties?.siteColor).toBe(PLANNED_SITE_COLOR);
});

function Wrapper({children}) {
  return <TestApp>{children}</TestApp>;
}

function basicTopology() {
  const topology = mockTopology();
  topology.__test
    .addSite({
      name: 'site1',
      location: {latitude: 1, longitude: 1, accuracy: 1, altitude: 1},
    })
    .addSite({
      name: 'site2',
      location: {latitude: 10, longitude: 10, accuracy: 1, altitude: 1},
    })
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
    })
    .addNode({
      name: 'pop',
      site_name: 'pop_site',
      pop_node: true,
    })
    .addNode({
      name: 'cn',
      site_name: 'cn_site',
      node_type: NodeType.CN,
    });
  return topology;
}
