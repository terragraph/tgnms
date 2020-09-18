/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
import 'jest-dom/extend-expect';
import * as React from 'react';
import * as turf from '@turf/turf';
import McsEstimateLayer, {SOURCE_ID} from '../McsEstimateLayer';
import {
  MapContextWrapper,
  NetworkContextWrapper,
  TestApp,
  mockFig0,
  mockNetworkConfig,
} from '../../../../tests/testHelpers';
import {TopologyElementType} from '../../../../constants/NetworkConstants';
import {buildTopologyMaps} from '../../../../helpers/TopologyHelpers';
import {cleanup, render} from '@testing-library/react';
import {getSourceFeatureCollection} from '../../../../tests/mapHelpers';
import type {MapContext} from '../../../../contexts/MapContext';
import type {NetworkContextType} from '../../../../contexts/NetworkContext';

afterEach(cleanup);

test('renders without any props', async () => {
  await render(
    <Wrapper>
      <McsEstimateLayer />
    </Wrapper>,
  );
});

test(
  'if mcs_estimate layer is selected and no node is selected ' +
    'selects a node with a wireless link',
  async () => {
    const setSelected = jest.fn();
    expect(setSelected).not.toHaveBeenCalled();
    await render(
      <Wrapper
        mapVals={{
          mapboxRef: ({}: any),
          selectedOverlays: {
            nodes: 'mcs_estimate',
          },
        }}
        networkVals={{
          selectedElement: null,
          setSelected,
        }}>
        <McsEstimateLayer />
      </Wrapper>,
    );
    expect(setSelected).toHaveBeenCalled();
  },
);

test(
  'if mcs_estimate layer is selected and any node is selected ' +
    'does not change selection ',
  async () => {
    const setSelected = jest.fn();
    expect(setSelected).not.toHaveBeenCalled();
    await render(
      <Wrapper
        mapVals={{
          mapboxRef: ({}: any),
          selectedOverlays: {
            nodes: 'mcs_estimate',
          },
        }}
        networkVals={{
          selectedElement: {
            type: TopologyElementType.NODE,
            name: 'site1-0',
            expanded: true,
          },
          setSelected,
        }}>
        <McsEstimateLayer />
      </Wrapper>,
    );
    expect(setSelected).not.toHaveBeenCalled();
  },
);

test('if a node with wireless links is selected, renders the selected segments', async () => {
  const {container} = await render(
    <Wrapper
      mapVals={{
        mapboxRef: ({}: any),
        selectedOverlays: {
          nodes: 'mcs_estimate',
        },
      }}
      networkVals={{
        selectedElement: {
          type: TopologyElementType.NODE,
          name: 'site1-0',
          expanded: true,
        },
      }}>
      <McsEstimateLayer />
    </Wrapper>,
  );
  const sourceData = getSourceFeatureCollection(container, SOURCE_ID);
  expect(sourceData.type).toBe('FeatureCollection');
  const polygons = sourceData.features.filter(
    feat => turf.getType(feat) === 'Polygon',
  );
  const labels = sourceData.features.filter(
    feat => turf.getType(feat) === 'Point',
  );
  expect(polygons.length).toBe(12); // there are 12 MCS indexes
  for (const segment of polygons) {
    expect(segment.properties).toMatchObject({
      mcs: expect.any(Number),
    });
    /**
     * the segments are polygons, they should have non-zero area or
     * else they may have been corrupted.
     */
    expect(turf.area(segment)).toBeGreaterThan(0);
  }

  for (const label of labels) {
    expect(label.properties).toMatchObject({
      mcs: expect.any(Number),
    });
  }
});

test('if a site with wireless links is selected, renders the selected nodes', async () => {
  const {container} = await render(
    <Wrapper
      mapVals={{
        mapboxRef: ({}: any),
        selectedOverlays: {
          nodes: 'mcs_estimate',
        },
      }}
      networkVals={{
        selectedElement: {
          type: TopologyElementType.SITE,
          name: 'site1',
          expanded: true,
        },
      }}>
      <McsEstimateLayer />
    </Wrapper>,
  );
  const sourceData = getSourceFeatureCollection(container, SOURCE_ID);
  expect(sourceData.type).toBe('FeatureCollection');
  const polygons = sourceData.features.filter(
    feat => turf.getType(feat) === 'Polygon',
  );
  const labels = sourceData.features.filter(
    feat => turf.getType(feat) === 'Point',
  );
  expect(polygons.length).toBe(12 * 2);
  expect(labels.length).toBe(12 * 2);
});
test('if a site without wireless links is selected, renders nothing', async () => {
  const {container} = await render(
    <Wrapper
      mapVals={{
        mapboxRef: ({}: any),
        selectedOverlays: {
          nodes: 'mcs_estimate',
        },
      }}
      networkVals={{
        selectedElement: {
          type: TopologyElementType.SITE,
          name: 'site-nonodes',
          expanded: true,
        },
      }}>
      <McsEstimateLayer />
    </Wrapper>,
  );
  const sourceData = getSourceFeatureCollection(container, SOURCE_ID);
  expect(sourceData.type).toBe('FeatureCollection');
  const polygons = sourceData.features.filter(
    feat => turf.getType(feat) === 'Polygon',
  );
  const labels = sourceData.features.filter(
    feat => turf.getType(feat) === 'Point',
  );
  expect(polygons.length).toBe(0);
  expect(labels.length).toBe(0);
});

function Wrapper({
  children,
  networkVals,
  mapVals,
}: {
  children: React.Node,
  networkVals?: $Shape<NetworkContextType>,
  mapVals?: $Shape<MapContext>,
}) {
  const topology = mockFig0();
  // node with no links to ensure no crashy business
  topology.__test.addNode({
    name: 'site1-99',
    site_name: 'site1',
  });
  topology.__test.addSite({
    name: 'site-nonodes',
  });
  const topologyMaps = buildTopologyMaps(topology);
  return (
    <TestApp>
      <NetworkContextWrapper
        contextValue={{
          networkConfig: mockNetworkConfig({topology: topology}),
          ...topologyMaps,
          ...(networkVals || {}: $Shape<NetworkContextType>),
        }}>
        <MapContextWrapper contextValue={mapVals}>{children}</MapContextWrapper>
      </NetworkContextWrapper>
    </TestApp>
  );
}
