/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * Intended to be the replacement for the current Links|Sites|Nodes layers
 *
 * @format
 * @flow
 */
import * as turf from '@turf/turf';

import {locToPos} from '@fbcnms/tg-nms/app/helpers/GeoHelpers';
import {objectValuesTypesafe} from '@fbcnms/tg-nms/app/helpers/ObjectHelpers';
import type {
  LinkFeature,
  NodeFeature,
  SiteFeature,
} from '@fbcnms/tg-nms/app/features/map/NetworkMapTypes';

import {
  CN_SITE_COLOR,
  POP_SITE_COLOR,
} from '@fbcnms/tg-nms/app/constants/LayerConstants';
import {SITE_FEATURE_TYPE} from '@fbcnms/tg-nms/app/features/map/NetworkMapTypes';
import type {GeoJson} from '@turf/turf';
import type {
  LayerData,
  MapFeatureTopology,
  Overlay,
} from '@fbcnms/tg-nms/app/features/map/NetworkMapTypes';

export type TopologyGeoJson = {|
  sites: GeoJson,
  links: GeoJson,
  nodes: GeoJson,
|};

/**
 * Create the topology features for sites, links, and nodes.
 *
 * This will add the appropriate colors and attributes.
 */
export function createTopologyGeoJson({
  mapFeatures,
  linkColorFunc,
  linkOverlay,
  siteColorFunc,
  siteOverlay,
  overlayData,
}: {
  mapFeatures: MapFeatureTopology,
  linkColorFunc: number => string,
  linkOverlay: Overlay,
  siteColorFunc: number => string,
  siteOverlay: Overlay,
  overlayData: LayerData<{}>,
}): $Shape<TopologyGeoJson> {
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
    links.push(turf.lineString(siteLocations, {...link, color: color}));
  }
  for (const _node of objectValuesTypesafe<NodeFeature>(mapFeatures.nodes)) {
    // make node feature
  }
  return {
    sites: turf.featureCollection(sites),
    links: turf.featureCollection(links),
    nodes: turf.featureCollection(nodes),
  };
}

function getSiteTypeColor(site: SiteFeature): string | void {
  switch (site.site_type) {
    case SITE_FEATURE_TYPE.CN:
      return CN_SITE_COLOR;
    case SITE_FEATURE_TYPE.POP:
      return POP_SITE_COLOR;
  }
}
