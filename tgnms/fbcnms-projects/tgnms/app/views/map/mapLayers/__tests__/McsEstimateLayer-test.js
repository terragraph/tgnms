/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import * as turf from '@turf/turf';
import McsEstimateLayer, {SOURCE_ID} from '../McsEstimateLayer';
import PlannedSiteCtx, {
  defaultValue as PlannedSiteContextDefaultValue,
} from '@fbcnms/tg-nms/app/contexts/PlannedSiteContext';
import {DEFAULT_MAP_PROFILE} from '@fbcnms/tg-nms/app/constants/MapProfileConstants';
import {
  MapContextWrapper,
  NetworkContextWrapper,
  TestApp,
  mockFig0,
  mockNetworkConfig,
} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {TopologyElementType} from '@fbcnms/tg-nms/app/constants/NetworkConstants';
import {buildTopologyMaps} from '@fbcnms/tg-nms/app/helpers/TopologyHelpers';
import {getSourceFeatureCollection} from '@fbcnms/tg-nms/app/tests/mapHelpers';
import {render} from '@testing-library/react';
import type {MapContext} from '@fbcnms/tg-nms/app/contexts/MapContext';
import type {NetworkContextType} from '@fbcnms/tg-nms/app/contexts/NetworkContext';
import type {PlannedSite} from '@fbcnms/tg-nms/app/features/map/MapPanelTypes';
import type {PlannedSiteContext} from '@fbcnms/tg-nms/app/contexts/PlannedSiteContext';

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
  expect(polygons.length).toBe(12 * 3);
  expect(labels.length).toBe(12 * 3);
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

test(
  'if a planned site is selected, ' +
    ' renders MCS estimate as continuous rings',
  async () => {
    const {container} = await render(
      <Wrapper
        mapVals={{
          mapboxRef: ({}: any),
          selectedOverlays: {
            nodes: 'mcs_estimate',
          },
        }}
        networkVals={{}}
        plannedSiteVals={{
          plannedSite: ({
            name: '',
            latitude: 0,
            longitude: 0,
          }: $Shape<PlannedSite>),
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
    expect(polygons.length).toBe(12);
    expect(labels.length).toBe(12);
  },
);

test('renders correctly when using a custom map profile', async () => {
  const {container} = await render(
    <Wrapper
      mapVals={{
        mapboxRef: ({}: any),
        selectedOverlays: {
          nodes: 'mcs_estimate',
        },
        mapProfiles: [{...DEFAULT_MAP_PROFILE, networks: ['test']}],
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
  expect(polygons.length).toBe(12 * 3);
  expect(labels.length).toBe(12 * 3);
});

function Wrapper({
  children,
  networkVals,
  mapVals,
  plannedSiteVals,
}: {
  children: React.Node,
  networkVals?: $Shape<NetworkContextType>,
  mapVals?: $Shape<MapContext>,
  plannedSiteVals?: $Shape<PlannedSiteContext>,
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
          networkName: 'test',
          networkConfig: mockNetworkConfig({topology: topology}),
          ...topologyMaps,
          ...(networkVals || {}: $Shape<NetworkContextType>),
        }}>
        <PlannedSiteCtx.Provider
          value={plannedSiteVals || PlannedSiteContextDefaultValue}>
          <MapContextWrapper contextValue={mapVals}>
            {children}
          </MapContextWrapper>
        </PlannedSiteCtx.Provider>
      </NetworkContextWrapper>
    </TestApp>
  );
}
