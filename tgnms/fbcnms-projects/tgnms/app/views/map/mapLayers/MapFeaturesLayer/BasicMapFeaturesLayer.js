/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * Intended to be the replacement for the current Links|Sites|Nodes layers
 *
 * @format
 * @flow
 */

import React from 'react';
import {LINE_LAYOUT} from '@fbcnms/tg-nms/app/constants/LayerConstants';
import {Layer, Source} from 'react-mapbox-gl';
import {createTopologyGeoJson} from './mapFeaturesLayerHelpers';
import {makeRangeColorFunc} from '@fbcnms/tg-nms/app/helpers/MapLayerHelpers';
import {useMapContext} from '@fbcnms/tg-nms/app/contexts/MapContext';

import type {TopologyGeoJson} from './mapFeaturesLayerHelpers';

export const SITES_SOURCE_ID = 'sites';
export const NODES_SOURCE_ID = 'nodes';
export const LINKS_SOURCE_ID = 'links';

export const SITES_INNER_LAYER_ID = 'sites-inner';
export const SITES_OUTER_LAYER_ID = 'sites-outer';
export const LINKS_LAYER_ID = 'links-inner';

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

const LINE_PAINT = {
  'line-color': ['get', 'color'],
  'line-width': 3,
};

export default function BasicMapFeaturesLayer() {
  const {mapFeatures, overlays, overlayData} = useMapContext();
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
      {/** Order matters */}
      <Layer
        id={LINKS_LAYER_ID}
        type="line"
        sourceId={LINKS_SOURCE_ID}
        layout={LINE_LAYOUT}
        paint={LINE_PAINT}
      />
      <Layer
        id={SITES_OUTER_LAYER_ID}
        type="circle"
        sourceId={SITES_SOURCE_ID}
        paint={OUTER_CIRCLE_PAINT}
      />
      <Layer
        id={SITES_INNER_LAYER_ID}
        type="circle"
        sourceId={SITES_SOURCE_ID}
        paint={INNER_CIRCLE_PAINT}
      />
    </>
  );
}
