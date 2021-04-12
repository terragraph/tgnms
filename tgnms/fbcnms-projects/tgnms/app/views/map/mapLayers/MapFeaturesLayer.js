/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * Intended to be the replacement for the current Links|Sites|Nodes layers
 *
 * @format
 * @flow
 */

import * as turf from '@turf/turf';
import React from 'react';
import {
  CN_SITE_COLOR,
  POP_SITE_COLOR,
} from '@fbcnms/tg-nms/app/constants/LayerConstants';
import {Layer, Source} from 'react-mapbox-gl';
import {SITE_FEATURE_TYPE} from '@fbcnms/tg-nms/app/features/map/NetworkMapTypes';
import {locToPos} from '@fbcnms/tg-nms/app/helpers/GeoHelpers';
import {makeRangeColorFunc} from '@fbcnms/tg-nms/app/helpers/MapLayerHelpers';
import {objectValuesTypesafe} from '@fbcnms/tg-nms/app/helpers/ObjectHelpers';
import {useMapContext} from '@fbcnms/tg-nms/app/contexts/MapContext';

import type {GeoJson} from '@turf/turf';
import type {
  LinkFeature,
  NodeFeature,
  SiteFeature,
} from '@fbcnms/tg-nms/app/features/map/NetworkMapTypes';

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

export const LINE_LAYOUT = {
  'line-join': 'round',
  'line-cap': 'round',
};
const LINE_PAINT = {
  'line-color': ['get', 'color'],
  'line-width': 3,
};

type TopologyGeoJson = {|
  sites: GeoJson,
  links: GeoJson,
  nodes: GeoJson,
|};

export default function MapFeaturesLayer() {
  const {mapFeatures, overlays, overlayData} = useMapContext();
  const {
    link_lines: linkOverlay,
    site_icons: siteOverlay,
    nodes: _nodeOverlay,
  } = overlays;
  const linkColorFunc = React.useMemo(
    () => makeRangeColorFunc(linkOverlay.range ?? [], linkOverlay.colorRange),
    [linkOverlay.range, linkOverlay.colorRange],
  );
  const siteColorFunc = React.useMemo(
    () => makeRangeColorFunc(siteOverlay.range ?? [], siteOverlay.colorRange),
    [siteOverlay.range, siteOverlay.colorRange],
  );
  const geoJson = React.useMemo<$Shape<TopologyGeoJson>>(() => {
    const sites = [];
    const links = [];
    const nodes = [];
    for (const site of objectValuesTypesafe<SiteFeature>(mapFeatures.sites)) {
      const siteOverlayData = (overlayData?.site_icons ?? {})[site.name] ?? {};
      const value = siteOverlayData[siteOverlay.id];
      const color = siteColorFunc(value);
      const siteTypecolor = getSiteTypeColor(site);
      sites.push(
        turf.point(locToPos(site.location), {
          ...site,
          color: color,
          innerColor: siteTypecolor,
        }),
      );
    }

    for (const link of objectValuesTypesafe<LinkFeature>(mapFeatures.links)) {
      const nodes = [
        mapFeatures.nodes[link.a_node_name],
        mapFeatures.nodes[link.z_node_name],
      ];
      const [a, z] = nodes;
      if (a == null || z == null) {
        continue;
      }

      const siteLocations = nodes.map(node => {
        const site = mapFeatures.sites[node.site_name];
        return locToPos(site.location);
      });
      const linkOverlayData = (overlayData?.link_lines ?? {})[link.name] ?? {};
      const value = linkOverlayData[linkOverlay.id];
      const color = linkColorFunc(value);
      links.push(
        turf.lineString(siteLocations, {name: link.name, color: color}),
      );
    }
    for (const _node of objectValuesTypesafe<NodeFeature>(mapFeatures.nodes)) {
      // make node feature
    }
    return {
      sites: turf.featureCollection(sites),
      links: turf.featureCollection(links),
      nodes: turf.featureCollection(nodes),
    };
  }, [
    mapFeatures,
    linkColorFunc,
    linkOverlay,
    siteColorFunc,
    siteOverlay,
    overlayData,
  ]);

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

function getSiteTypeColor(site: SiteFeature): string | void {
  switch (site.site_type) {
    case SITE_FEATURE_TYPE.CN:
      return CN_SITE_COLOR;
    case SITE_FEATURE_TYPE.POP:
      return POP_SITE_COLOR;
  }
}
