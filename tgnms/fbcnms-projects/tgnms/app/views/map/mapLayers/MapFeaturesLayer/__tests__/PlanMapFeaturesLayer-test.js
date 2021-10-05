/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import * as managerMock from '@fbcnms/tg-nms/app/features/planning/useNetworkPlanningManager';
import PlanMapFeaturesLayer, {
  LINKS_CLICK_LAYER_ID,
  LINKS_SOURCE_ID,
  LINK_HIGHLIGHT_LAYER_ID,
  SITES_CLICK_LAYER_ID,
  SITES_HIGHLIGHT_LAYER_ID,
  SITES_SOURCE_ID,
} from '../PlanMapFeaturesLayer';
import {
  MapContextWrapper,
  TestApp,
  mockMapboxRef,
} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {NetworkPlanningContextProvider} from '@fbcnms/tg-nms/app/contexts/NetworkPlanningContext';
import {OVERLAY_NONE} from '@fbcnms/tg-nms/app/constants/LayerConstants';
import {PLANNING_PLAN_PATH} from '@fbcnms/tg-nms/app/constants/paths';
import {act, render} from '@testing-library/react';
import {
  getLayerCallback,
  getSourceFeatureCollection,
} from '@fbcnms/tg-nms/app/tests/mapHelpers';
import {mockUploadANPJson} from '@fbcnms/tg-nms/app/tests/data/UploadTopology';
import {planToMapFeatures} from '@fbcnms/tg-nms/app/helpers/MapLayerHelpers';
import type {ANPUploadTopologyType} from '@fbcnms/tg-nms/app/constants/TemplateConstants';
import type {MapContext} from '@fbcnms/tg-nms/app/contexts/MapContext';

describe('PlanMapFeaturesLayer', () => {
  const planTopology = JSON.parse(
    mockUploadANPJson(__dirname, 'mapFeaturesLayerANP.json'),
  );
  const mockFeatures = planToMapFeatures(planTopology);

  let mapboxRef;
  let mapContext: $Shape<MapContext>;
  beforeEach(() => {
    const {__baseElement, ..._mapboxRef} = mockMapboxRef();
    mapboxRef = _mapboxRef;
    mapContext = {
      mapboxRef: mapboxRef,
      overlays: {
        link_lines: OVERLAY_NONE,
        site_icons: OVERLAY_NONE,
        nodes: OVERLAY_NONE,
      },
      mapFeatures: mockFeatures,
      overlayData: {
        link_lines: {},
        site_icons: {},
        nodes: {},
      },
    };
  });

  test('basic rendering with pendingTopology', () => {
    jest.spyOn(managerMock, 'useNetworkPlanningManager').mockReturnValueOnce({
      pendingTopology: {
        sites: new Set<string>(['site1', 'site2']),
        links: new Set<string>(['link10_20']),
      },
    });
    const {container} = render(
      <Wrapper mapContext={mapContext} planTopology={planTopology}>
        <PlanMapFeaturesLayer />
      </Wrapper>,
    );
    const linkFeatures = getSourceFeatureCollection(container, LINKS_SOURCE_ID);
    const siteFeatures = getSourceFeatureCollection(container, SITES_SOURCE_ID);
    expect(linkFeatures.features.length).toEqual(1);
    expect(siteFeatures.features.length).toEqual(3);
    expect(mapboxRef.setFilter).toHaveBeenCalledWith(LINK_HIGHLIGHT_LAYER_ID, [
      'in',
      ['get', 'link_id'],
      ['literal', ['link10_20']],
    ]);
    expect(mapboxRef.setFilter).toHaveBeenCalledWith(SITES_HIGHLIGHT_LAYER_ID, [
      'in',
      ['get', 'site_id'],
      ['literal', ['site1', 'site2']],
    ]);
  });

  test('clicking on element set the pendingTopology (single click)', () => {
    render(
      <Wrapper mapContext={mapContext} planTopology={planTopology}>
        <PlanMapFeaturesLayer />
      </Wrapper>,
    );

    // Single select a site.
    const onSiteClickCallback = getLayerCallback(
      SITES_CLICK_LAYER_ID,
      'onClick',
    );
    act(() => {
      onSiteClickCallback({
        originalEvent: {metaKey: false}, // single select
        features: [
          {
            properties: {site_id: 'site3'},
          },
        ],
      });
    });
    expect(mapboxRef.setFilter).toHaveBeenCalledWith(LINK_HIGHLIGHT_LAYER_ID, [
      'in',
      ['get', 'link_id'],
      ['literal', []],
    ]);
    expect(mapboxRef.setFilter).toHaveBeenCalledWith(SITES_HIGHLIGHT_LAYER_ID, [
      'in',
      ['get', 'site_id'],
      ['literal', ['site3']],
    ]);

    // Single select a link.
    const onLinkClickCallback = getLayerCallback(
      LINKS_CLICK_LAYER_ID,
      'onClick',
    );
    act(() => {
      onLinkClickCallback({
        originalEvent: {metaKey: false}, // single select
        features: [
          {
            properties: {link_id: 'link10_20'},
          },
        ],
      });
    });
    expect(mapboxRef.setFilter).toHaveBeenCalledWith(LINK_HIGHLIGHT_LAYER_ID, [
      'in',
      ['get', 'link_id'],
      ['literal', ['link10_20']],
    ]);
    expect(mapboxRef.setFilter).toHaveBeenCalledWith(SITES_HIGHLIGHT_LAYER_ID, [
      'in',
      ['get', 'site_id'],
      ['literal', ['site1', 'site2']],
    ]);
  });

  test('cmd+clicking on element will append the pendingTopology (multi click)', () => {
    render(
      <Wrapper mapContext={mapContext} planTopology={planTopology}>
        <PlanMapFeaturesLayer />
      </Wrapper>,
    );

    // Single select a site.
    const onSiteClickCallback = getLayerCallback(
      SITES_CLICK_LAYER_ID,
      'onClick',
    );
    act(() => {
      onSiteClickCallback({
        originalEvent: {metaKey: false}, // single select
        features: [
          {
            properties: {site_id: 'site3'},
          },
        ],
      });
    });
    expect(mapboxRef.setFilter).toHaveBeenCalledWith(LINK_HIGHLIGHT_LAYER_ID, [
      'in',
      ['get', 'link_id'],
      ['literal', []],
    ]);
    expect(mapboxRef.setFilter).toHaveBeenCalledWith(SITES_HIGHLIGHT_LAYER_ID, [
      'in',
      ['get', 'site_id'],
      ['literal', ['site3']],
    ]);

    // Multi select a link.
    const onLinkClickCallback = getLayerCallback(
      LINKS_CLICK_LAYER_ID,
      'onClick',
      2, // we want second occurance because it would have re-rendered.
    );
    act(() => {
      onLinkClickCallback({
        originalEvent: {metaKey: true}, // multi select
        features: [
          {
            properties: {link_id: 'link10_20'},
          },
        ],
      });
    });
    expect(mapboxRef.setFilter).toHaveBeenCalledWith(LINK_HIGHLIGHT_LAYER_ID, [
      'in',
      ['get', 'link_id'],
      ['literal', ['link10_20']],
    ]);
    expect(mapboxRef.setFilter).toHaveBeenCalledWith(SITES_HIGHLIGHT_LAYER_ID, [
      'in',
      ['get', 'site_id'],
      ['literal', ['site3', 'site1', 'site2']],
    ]);
  });

  test('cmd+clicking a pending topology element will remove it from pendingTopology', () => {
    render(
      <Wrapper mapContext={mapContext} planTopology={planTopology}>
        <PlanMapFeaturesLayer />
      </Wrapper>,
    );

    // Single select a site.
    let onSiteClickCallback = getLayerCallback(SITES_CLICK_LAYER_ID, 'onClick');
    act(() => {
      onSiteClickCallback({
        originalEvent: {metaKey: false}, // single select
        features: [
          {
            properties: {site_id: 'site3'},
          },
        ],
      });
    });
    expect(mapboxRef.setFilter).toHaveBeenCalledWith(LINK_HIGHLIGHT_LAYER_ID, [
      'in',
      ['get', 'link_id'],
      ['literal', []],
    ]);
    expect(mapboxRef.setFilter).toHaveBeenCalledWith(SITES_HIGHLIGHT_LAYER_ID, [
      'in',
      ['get', 'site_id'],
      ['literal', ['site3']],
    ]);

    onSiteClickCallback = getLayerCallback(
      SITES_CLICK_LAYER_ID,
      'onClick',
      2, // we want second occurance because it would have re-rendered.
    );
    act(() => {
      onSiteClickCallback({
        originalEvent: {metaKey: true}, // cmd + click
        features: [
          {
            properties: {site_id: 'site3'},
          },
        ],
      });
    });
    expect(mapboxRef.setFilter).toHaveBeenCalledWith(LINK_HIGHLIGHT_LAYER_ID, [
      'in',
      ['get', 'link_id'],
      ['literal', []],
    ]);
    expect(mapboxRef.setFilter).toHaveBeenCalledWith(SITES_HIGHLIGHT_LAYER_ID, [
      'in',
      ['get', 'site_id'],
      ['literal', []],
    ]);
  });
});

function Wrapper({
  children,
  mapContext,
  planTopology,
}: {
  children: React.Node,
  mapContext?: $Shape<MapContext>,
  planTopology?: ANPUploadTopologyType,
}) {
  return (
    <TestApp route={PLANNING_PLAN_PATH}>
      <NetworkPlanningContextProvider
        plan={{
          id: 1,
          folderId: 1,
          name: 'plan 1',
          state: 'SUCCESS',
        }}
        planTopology={planTopology}
        setPlanTopology={() => {}}>
        <MapContextWrapper contextValue={mapContext}>
          {children}
        </MapContextWrapper>
      </NetworkPlanningContextProvider>
    </TestApp>
  );
}
