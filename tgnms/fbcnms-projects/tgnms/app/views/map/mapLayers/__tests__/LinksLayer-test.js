/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import 'jest-dom/extend-expect';
import * as React from 'react';
import LinksLayer from '../LinksLayer';
import {
  COLOR_RED,
  COLOR_YELLOW,
  TestApp,
  mockOverlay,
  mockRoutes,
  mockTopology,
} from '../../../../tests/testHelpers';
import {Feature, Layer} from 'react-mapbox-gl';
import {buildTopologyMaps} from '../../../../helpers/TopologyHelpers';
import {cleanup, render} from '@testing-library/react';
import {
  getFeatureBySiteName,
  getLayerById,
  getPropValue,
} from '../../../../tests/mapHelpers';

import type {Props} from '../LinksLayer';
import type {TopologyConfig} from '../../../../../shared/dto/NetworkState';
afterEach(cleanup);

const mockMetrics = {
  'link-node1-node2': {
    A: {
      mock: 1,
    },
    Z: {
      mock: 2,
    },
  },
};
const defaultTopology = basicTopology();
const commonProps: Props = {
  topology: defaultTopology,
  overlay: mockOverlay(),
  selectedLinks: {},
  selectedNodeName: '',
  nearbyNodes: {},
  ignitionState: {
    igCandidates: [],
    igParams: {
      enable: true,
      linkAutoIgnite: {},
      linkUpDampenInterval: 0,
      linkUpInterval: 0,
    },
    lastIgCandidates: [],
  },
  routes: mockRoutes(),
  topologyConfig: ({}: $Shape<TopologyConfig>),
  ctrlVersion: 'RELEASE_M45_PRE',
  ...buildTopologyMaps(defaultTopology),
  onSelectLinkChange: jest.fn(),
  onLinkMouseEnter: jest.fn(),
  onLinkMouseLeave: jest.fn(),
  offlineWhitelist: {nodes: new Map(), links: new Map()},
  metricTextEnabled: false,
  metricData: mockMetrics,
};

test('renders with default props', () => {
  render(
    <Wrapper>
      <LinksLayer {...commonProps} />
    </Wrapper>,
  );
  expect(Layer).toHaveBeenCalled();
  expect(Feature).toHaveBeenCalled();
});

describe('basic line rendering', () => {
  test('renders line features with correct coordinates', () => {
    const {container} = render(
      <Wrapper>
        <LinksLayer {...commonProps} />
      </Wrapper>,
    );
    const layer = getLayerById(container, 'link-normal');
    expect(layer).not.toBeNull();
    if (!layer) {
      throw new Error('null layer');
    }
    const site1LineSegment = getFeatureBySiteName(layer, 'site1');
    const site2LineSegment = getFeatureBySiteName(layer, 'site2');
    expect(site1LineSegment).not.toBeNull();
    expect(site2LineSegment).not.toBeNull();
    if (!(site1LineSegment && site2LineSegment)) {
      throw new Error('null site');
    }
    const site1SegmentCoordinates = getPropValue(
      site1LineSegment,
      'coordinates',
    );
    const site2SegmentCoordinates = getPropValue(
      site2LineSegment,
      'coordinates',
    );
    // coordinates go from site1 to midpoint between site1 and site2
    expect(site1SegmentCoordinates).toEqual([
      [1, 1],
      [5.5, 5.5],
    ]);
    expect(site2SegmentCoordinates).toEqual([
      [5.5, 5.5],
      [10, 10],
    ]);
  });

  test('renders line features with correct colors', () => {
    // link-name -> A,Z -> overlay id
    const {container} = render(
      <Wrapper>
        <LinksLayer {...commonProps} />
      </Wrapper>,
    );
    const layer = getLayerById(container, 'link-normal');
    expect(layer).not.toBeNull();
    if (!layer) {
      throw new Error('null layer');
    }
    const site1LineSegment = getFeatureBySiteName(layer, 'site1');
    const site2LineSegment = getFeatureBySiteName(layer, 'site2');
    expect(site1LineSegment).not.toBeNull();
    expect(site2LineSegment).not.toBeNull();
    if (!(site1LineSegment && site2LineSegment)) {
      throw new Error('null site');
    }
    const site1SegmentProperties = getPropValue(site1LineSegment, 'properties');
    const site2SegmentProperties = getPropValue(site2LineSegment, 'properties');
    expect(site1SegmentProperties?.linkColor).toBe(COLOR_YELLOW);
    expect(site2SegmentProperties?.linkColor).toBe(COLOR_RED);
  });
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
    });
  return topology;
}
