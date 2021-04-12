/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import MapFeaturesLayer, {
  LINKS_SOURCE_ID,
  SITES_SOURCE_ID,
} from '../MapFeaturesLayer';
import {
  CN_SITE_COLOR,
  LinkOverlayColors,
  POP_SITE_COLOR,
} from '@fbcnms/tg-nms/app/constants/LayerConstants';
import {FIG0, mockFig0} from '@fbcnms/tg-nms/app/tests/data/NetworkConfig';
import {
  LINK_METRIC_OVERLAYS,
  OVERLAY_NONE,
} from '@fbcnms/tg-nms/app/constants/LayerConstants';
import {MapContextWrapper, TestApp} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {color} from 'd3-color';
import {getSourceFeatureCollection} from '@fbcnms/tg-nms/app/tests/mapHelpers';
import {render} from '@testing-library/react';
import {topologyToMapFeatures} from '@fbcnms/tg-nms/app/helpers/MapLayerHelpers';
import type {MapContext} from '@fbcnms/tg-nms/app/contexts/MapContext';

const topology = mockFig0();
topology.__test.updateNode(FIG0.NODE1_0, {pop_node: true});
topology.__test.updateNode(FIG0.NODE2_0, {node_type: 1 /*CN*/});
const mockFeatures = topologyToMapFeatures(topology);
const mapContext: $Shape<MapContext> = {
  overlays: {
    link_lines: LINK_METRIC_OVERLAYS.mcs,
    site_icons: OVERLAY_NONE,
    nodes: OVERLAY_NONE,
  },
  mapFeatures: mockFeatures,
  overlayData: {
    link_lines: {
      [FIG0.LINK1]: {mcs: 12},
      [FIG0.LINK2]: {mcs: 9},
      [FIG0.LINK3]: {mcs: 7},
      [FIG0.LINK4]: {mcs: 5},
    },
    site_icons: {},
    nodes: {},
  },
};

test('basic rendering', () => {
  const {container} = render(
    <Wrapper mapContext={mapContext}>
      <MapFeaturesLayer />
    </Wrapper>,
  );
  const linkFeatures = getSourceFeatureCollection(container, LINKS_SOURCE_ID);
  const siteFeatures = getSourceFeatureCollection(container, SITES_SOURCE_ID);
  const link1 = linkFeatures.features.find(
    x => x.properties.name === FIG0.LINK1,
  );
  expect(link1?.properties.color).toBe(
    color(LinkOverlayColors.metric.excellent.color).formatRgb(),
  );

  // test that cn/pop site inner-colors are correct
  const site1 = siteFeatures.features.find(
    x => x.properties.name === FIG0.SITE1,
  );
  const site2 = siteFeatures.features.find(
    x => x.properties.name === FIG0.SITE2,
  );
  expect(site1?.properties.innerColor).toBe(POP_SITE_COLOR);
  expect(site2?.properties.innerColor).toBe(CN_SITE_COLOR);
});

function Wrapper({
  children,
  mapContext,
}: {
  children: React.Node,
  mapContext?: $Shape<MapContext>,
}) {
  return (
    <TestApp>
      <MapContextWrapper contextValue={mapContext}>
        {children}
      </MapContextWrapper>
    </TestApp>
  );
}
