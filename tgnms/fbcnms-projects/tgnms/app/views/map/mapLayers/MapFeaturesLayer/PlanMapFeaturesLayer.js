/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * Intended to be the replacement for the current Links|Sites|Nodes layers
 *
 * @format
 * @flow
 */

import React from 'react';
import {
  LINE_CASING_PAINT,
  LINE_LAYOUT,
  SELECTED_CIRCLE_STROKE_COLOR,
  SELECTED_CIRCLE_STROKE_WIDTH,
} from '@fbcnms/tg-nms/app/constants/LayerConstants';
import {Layer, Source} from 'react-mapbox-gl';
import {createTopologyGeoJson} from './mapFeaturesLayerHelpers';
import {handleLayerMouseEnter, handleLayerMouseLeave} from '../helpers';
import {makeRangeColorFunc} from '@fbcnms/tg-nms/app/helpers/MapLayerHelpers';
import {useMapContext} from '@fbcnms/tg-nms/app/contexts/MapContext';
import {useNetworkPlanningManager} from '@fbcnms/tg-nms/app/features/planning/useNetworkPlanningManager';

import type {PendingTopologyType} from '@fbcnms/tg-nms/app/features/planning/useNetworkPlanningManager';
import type {TopologyGeoJson} from './mapFeaturesLayerHelpers';

export const SITES_SOURCE_ID = 'sites';
export const NODES_SOURCE_ID = 'nodes';
export const LINKS_SOURCE_ID = 'links';

export const SITES_INNER_LAYER_ID = 'sites-inner';
export const SITES_OUTER_LAYER_ID = 'sites-outer';
export const SITES_CLICK_LAYER_ID = 'sites-click';
export const SITES_HIGHLIGHT_LAYER_ID = 'sites-highlight';
export const LINKS_LAYER_ID = 'links-inner';
export const LINKS_CLICK_LAYER_ID = 'links-click';
export const LINK_HIGHLIGHT_LAYER_ID = 'links-highlight';

const SITE_CIRCLE_PAINT = {
  'circle-blur': 0.15,
  'circle-stroke-opacity': 0.6,
};
const INNER_CIRCLE_PAINT = {
  ...SITE_CIRCLE_PAINT,
  'circle-color': [
    'case',
    ['all', ['has', 'innerColor'], ['to-boolean', ['get', 'innerColor']]],
    ['get', 'innerColor'],
    ['get', 'color'],
  ],
  'circle-radius': 4,
};
const OUTER_CIRCLE_PAINT = {
  ...SITE_CIRCLE_PAINT,
  'circle-color': ['get', 'color'],
  'circle-radius': 6,
};
const HIGHLIGHT_CIRCLE_PAINT = {
  ...SITE_CIRCLE_PAINT,
  'circle-color': ['get', 'color'],
  'circle-radius': 6,
  'circle-stroke-width': SELECTED_CIRCLE_STROKE_WIDTH,
  'circle-stroke-color': SELECTED_CIRCLE_STROKE_COLOR,
};
const CIRCLE_CLICK_PAINT = {
  // i.e. the click hit box
  'circle-opacity': 0,
  'circle-radius': 30,
};

const LINE_PAINT = {
  'line-color': ['get', 'color'],
  'line-width': 3,
};
const LINE_CLICK_PAINT = {
  // i.e. the click hit box
  'line-opacity': 0,
  'line-width': 15,
};
const HIGHLIGHT_LINK_PAINT = {
  ...LINE_CASING_PAINT,
  'line-gap-width': LINE_PAINT['line-width'],
};

export default function PlanMapFeaturesLayer() {
  const {mapFeatures, overlays, overlayData, mapboxRef} = useMapContext();
  const {
    link_lines: linkOverlay,
    site_icons: siteOverlay,
    nodes: _nodeOverlay,
  } = React.useMemo(() => overlays, [overlays]);
  const linkColorFunc = React.useMemo(
    () => makeRangeColorFunc(linkOverlay.range ?? [], linkOverlay.colorRange),
    [linkOverlay.range, linkOverlay.colorRange],
  );
  const siteColorFunc = React.useMemo(
    () => makeRangeColorFunc(siteOverlay.range ?? [], siteOverlay.colorRange),
    [siteOverlay.range, siteOverlay.colorRange],
  );
  const geoJson = React.useMemo<$Shape<TopologyGeoJson>>(
    () =>
      createTopologyGeoJson({
        mapFeatures,
        linkColorFunc,
        linkOverlay,
        siteColorFunc,
        siteOverlay,
        overlayData,
      }),
    [
      mapFeatures,
      linkColorFunc,
      linkOverlay,
      siteColorFunc,
      siteOverlay,
      overlayData,
    ],
  );

  const {
    pendingTopology,
    setPendingTopology,
    appendPendingTopology,
    removeFromPendingTopology,
    isInPendingTopology,
  } = useNetworkPlanningManager();
  const _handleClick = React.useCallback(
    (e, type: PendingTopologyType) => {
      const id = type === 'links' ? 'link_id' : 'site_id';
      // Sometimes a click can capture multiple features,
      // just choose the top layer.
      const selection: string = e.features[0].properties[id];

      // Cmd+click or windows+click
      if (e.originalEvent.metaKey) {
        // If the selection is already selected, unselect it.
        if (isInPendingTopology(selection, type)) {
          removeFromPendingTopology([selection], type);
        } else {
          // Multi select: Command + click or Windows + click
          appendPendingTopology([selection], type);
        }
      } else {
        // Single select
        setPendingTopology({
          ...{links: [], sites: []},
          ...{[(type: string)]: [selection]},
        });
      }
    },
    [
      appendPendingTopology,
      setPendingTopology,
      isInPendingTopology,
      removeFromPendingTopology,
    ],
  );
  const sitesCallback = React.useCallback(e => _handleClick(e, 'sites'), [
    _handleClick,
  ]);
  const linksCallback = React.useCallback(e => _handleClick(e, 'links'), [
    _handleClick,
  ]);

  // Highlight the selected elements.
  React.useEffect(() => {
    mapboxRef?.setFilter(LINK_HIGHLIGHT_LAYER_ID, [
      'in',
      ['get', 'link_id'],
      ['literal', [...pendingTopology.links]],
    ]);
    mapboxRef?.setFilter(SITES_HIGHLIGHT_LAYER_ID, [
      'in',
      ['get', 'site_id'],
      ['literal', [...pendingTopology.sites]],
    ]);
  }, [mapboxRef, pendingTopology]);

  return (
    <>
      <Source
        id={SITES_SOURCE_ID}
        geoJsonSource={{type: 'geojson', data: geoJson.sites, generateId: true}}
      />
      <Source
        id={LINKS_SOURCE_ID}
        geoJsonSource={{type: 'geojson', data: geoJson.links, generateId: true}}
      />
      {/* Order matters */}

      {/* Clickable portion of the link element (wider click hitbox) */}
      <Layer
        id={LINKS_CLICK_LAYER_ID}
        type="line"
        sourceId={LINKS_SOURCE_ID}
        paint={LINE_CLICK_PAINT}
        onClick={linksCallback}
        onMouseEnter={handleLayerMouseEnter}
        onMouseLeave={handleLayerMouseLeave}
      />
      {/* Display links */}
      <Layer
        id={LINKS_LAYER_ID}
        type="line"
        sourceId={LINKS_SOURCE_ID}
        layout={LINE_LAYOUT}
        paint={LINE_PAINT}
      />
      {/* Highlighted links */}
      <Layer
        id={LINK_HIGHLIGHT_LAYER_ID}
        type="line"
        sourceId={LINKS_SOURCE_ID}
        layout={LINE_LAYOUT}
        paint={HIGHLIGHT_LINK_PAINT}
      />

      {/* Clickable portion of the site element */}
      <Layer
        id={SITES_CLICK_LAYER_ID}
        type="circle"
        sourceId={SITES_SOURCE_ID}
        paint={CIRCLE_CLICK_PAINT}
        onClick={sitesCallback}
        onMouseEnter={handleLayerMouseEnter}
        onMouseLeave={handleLayerMouseLeave}
      />
      {/* Display sites outer ring */}
      <Layer
        id={SITES_OUTER_LAYER_ID}
        type="circle"
        sourceId={SITES_SOURCE_ID}
        paint={OUTER_CIRCLE_PAINT}
      />
      {/* Highlighted sites */}
      <Layer
        id={SITES_HIGHLIGHT_LAYER_ID}
        type="circle"
        sourceId={SITES_SOURCE_ID}
        paint={HIGHLIGHT_CIRCLE_PAINT}
      />
      {/* Display sites inner ring */}
      <Layer
        id={SITES_INNER_LAYER_ID}
        type="circle"
        sourceId={SITES_SOURCE_ID}
        paint={INNER_CIRCLE_PAINT}
      />
    </>
  );
}
