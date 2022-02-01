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
import useLiveRef from '@fbcnms/tg-nms/app/hooks/useLiveRef';
import {ANP_SITE_TYPE} from '@fbcnms/tg-nms/app/constants/TemplateConstants';
import {Layer, Source} from 'react-mapbox-gl';
import {TG_COLOR} from '@fbcnms/tg-nms/app/constants/LayerConstants';
import {handleLayerMouseEnter, handleLayerMouseLeave} from '../helpers';
import {locToPos} from '@fbcnms/tg-nms/app/helpers/GeoHelpers.js';
import {makeRangeColorFunc} from '@fbcnms/tg-nms/app/helpers/MapLayerHelpers';
import {useMapContext} from '@fbcnms/tg-nms/app/contexts/MapContext';
import {useNetworkPlanningContext} from '@fbcnms/tg-nms/app/contexts/NetworkPlanningContext';
import type {GeoCoord, GeoFeature, GeoJson} from '@turf/turf';
import type {LocationType} from '@fbcnms/tg-nms/shared/types/Topology';
import type {MapMouseEvent} from 'mapbox-gl/src/ui/events';
import type {SitesFileRow} from '@fbcnms/tg-nms/shared/dto/NetworkPlan';

export const SITESFILE_SOURCE_ID = 'sites-file';
export const SITESFILE_DRAG_SOURCE_ID = 'sites-file-drag';
export const SITESFILE_INNER_LAYER_ID = 'sitesfile-inner';
export const SITESFILE_OUTER_LAYER_ID = 'sitesfile-outer';
export const SITESFILE_CLICK_LAYER_ID = 'sitesfile-click';
export const SITESFILE_HIGHLIGHT_LAYER_ID = 'sitesfile-highlight';

const HIGHLIGHT_COLOR = '#0077ff';
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
  'circle-radius': 3,
};
const OUTER_CIRCLE_PAINT = {
  ...SITE_CIRCLE_PAINT,
  'circle-color': ['get', 'color'],
  'circle-radius': 5,
};
const HIGHLIGHT_CIRCLE_PAINT = {
  ...SITE_CIRCLE_PAINT,
  'circle-color': HIGHLIGHT_COLOR,
  'circle-radius': 6,
};
const CIRCLE_CLICK_PAINT = {
  // i.e. the click hit box
  'circle-opacity': 0,
  'circle-radius': 10,
};
const DRAG_PAINT = {
  'circle-color': '#dddddd',
  'circle-radius': 5,
};
const MIN_MOVE_KM = 0.001;

const getColorBySiteType = makeSiteTypeColor();

function makeSiteTypeColor() {
  const SITE_TYPE_COLORS = {
    [ANP_SITE_TYPE.CN]: TG_COLOR.PINK,
    [ANP_SITE_TYPE.POP]: TG_COLOR.BLUE,
    [ANP_SITE_TYPE.DN]: TG_COLOR.GREEN,
    [ANP_SITE_TYPE.DEMAND]: TG_COLOR.ORANGE,
  };
  const range = [];
  const colors = [];
  for (const name of Object.keys(ANP_SITE_TYPE)) {
    const type = ANP_SITE_TYPE[name];
    range.push(type);
    colors.push(SITE_TYPE_COLORS[type]);
  }
  return makeRangeColorFunc(range, colors);
}

export default function SitesFileFeaturesLayer() {
  const {
    pendingSitesFile,
    setPendingSitesFile,
    selectedSites,
    setSelectedSites,
  } = useNetworkPlanningContext();
  const pendingSitesFileRef = useLiveRef(pendingSitesFile);
  const {mapboxRef} = useMapContext();
  const [draggingSites, setDraggingSites] = React.useState<GeoJson>(
    turf.featureCollection([]),
  );

  const sitesGeoJson = React.useMemo<GeoJson>(() => {
    const features: Array<GeoFeature> = [];
    const sitesFileSites = pendingSitesFile?.sites;
    if (sitesFileSites != null && Array.isArray(sitesFileSites)) {
      for (const site of sitesFileSites) {
        features.push(createSiteFeature(site));
      }
    }
    return turf.featureCollection(features);
  }, [pendingSitesFile]);

  const selectSiteById = React.useCallback(
    (siteId: number, multiselect: boolean) => {
      const site = pendingSitesFileRef.current?.sites[siteId];
      if (site != null) {
        if (multiselect === true) {
          setSelectedSites(sites => [...sites, siteId]);
        } else {
          setSelectedSites(() => [siteId]);
        }
      }
    },
    [setSelectedSites, pendingSitesFileRef],
  );

  const handleSiteClick = React.useCallback(
    e => {
      const id: ?number = parseInt(e.features[0]?.properties?.sitesfile_id);
      if (id != null) {
        selectSiteById(id, e.originalEvent.metaKey);
      }
    },
    [selectSiteById],
  );

  function commitMove(offset: $Shape<LocationType>) {
    if (!pendingSitesFile) {
      return;
    }
    const sites: Array<SitesFileRow> = [];
    const _selected = new Set(selectedSites);
    for (const site of pendingSitesFile.sites) {
      if (_selected.has(site.id)) {
        site.location = {
          ...site.location,
          latitude: site.location.latitude + offset.latitude,
          longitude: site.location.longitude + offset.longitude,
        };
      }
      sites.push(site);
    }
    setPendingSitesFile({...pendingSitesFile, sites});
  }

  const handleMouseDown = (e: MapMouseEvent) => {
    if (!pendingSitesFile) {
      return;
    }
    e.preventDefault();

    /**
     * when the user starts a drag, copy the selected sites into a
     * lookup that's fast to update. As the mouse moves, update the quick
     * lookup with calculated positions.
     */
    const selected = new Set<number>(selectedSites);
    const initialPositions: {[siteid: number]: LocationType} = {};
    const _dragging: Array<GeoFeature> = [];
    for (const site of pendingSitesFile.sites) {
      if (selected.has(site.id)) {
        initialPositions[site.id] = site.location;
        _dragging.push(createSiteFeature(site));
      }
    }
    setDraggingSites(turf.featureCollection(_dragging));
    const startLngLat = e.lngLat;

    let offset = {lat: 0, lng: 0};
    const mouseMove = (e: MapMouseEvent) => {
      offset = {
        lat: e.lngLat.lat - startLngLat.lat,
        lng: e.lngLat.lng - startLngLat.lng,
      };
      const updateDrag = _dragging.map(feature => {
        const {longitude, latitude, altitude} = initialPositions[
          parseInt(feature.properties.sitesfile_id)
        ];
        const coords: GeoCoord = [
          longitude + offset.lng,
          latitude + offset.lat,
          altitude,
        ];
        feature.geometry.coordinates = coords;
        return feature;
      });
      setDraggingSites(turf.featureCollection(updateDrag));
    };
    const mouseUp = () => {
      const offsetDist = turf.distance(
        [startLngLat.lng, startLngLat.lat],
        [startLngLat.lng + offset.lng, startLngLat.lat + offset.lat],
      );
      if (offsetDist > MIN_MOVE_KM) {
        commitMove({longitude: offset.lng, latitude: offset.lat});
      }
      setDraggingSites(turf.featureCollection([]));
      mapboxRef?.off('mousemove', mouseMove);
      mapboxRef?.off('mouseup', mouseUp);
      window.removeEventListener('mouseup', mouseUp);
    };
    mapboxRef?.on('mousemove', mouseMove);
    mapboxRef?.on('mouseup', mouseUp);
    window?.addEventListener('mouseup', mouseUp);
  };

  // Highlight the selected elements.
  React.useEffect(() => {
    mapboxRef?.setFilter(SITESFILE_HIGHLIGHT_LAYER_ID, [
      'in',
      ['get', 'sitesfile_id'],
      ['literal', selectedSites.map(x => x.toString())],
    ]);
  }, [mapboxRef, selectedSites]);

  return (
    <>
      <Source
        id={SITESFILE_SOURCE_ID}
        geoJsonSource={{
          type: 'geojson',
          data: sitesGeoJson,
          generateId: true,
        }}
      />
      <Source
        id={SITESFILE_DRAG_SOURCE_ID}
        geoJsonSource={{
          type: 'geojson',
          data: draggingSites,
          generateId: true,
        }}
      />
      <Layer
        id={'sitesfile-drag-layer'}
        type="circle"
        sourceId={SITESFILE_DRAG_SOURCE_ID}
        paint={DRAG_PAINT}
      />
      <Layer
        id={SITESFILE_CLICK_LAYER_ID}
        type="circle"
        sourceId={SITESFILE_SOURCE_ID}
        paint={CIRCLE_CLICK_PAINT}
        onClick={handleSiteClick}
        onMouseDown={handleMouseDown}
        onMouseEnter={handleLayerMouseEnter}
        onMouseLeave={handleLayerMouseLeave}
      />
      {/* Display sites outer ring */}
      <Layer
        id={SITESFILE_OUTER_LAYER_ID}
        type="circle"
        sourceId={SITESFILE_SOURCE_ID}
        paint={OUTER_CIRCLE_PAINT}
      />
      {/* Highlighted sites */}
      <Layer
        id={SITESFILE_HIGHLIGHT_LAYER_ID}
        type="circle"
        sourceId={SITESFILE_SOURCE_ID}
        paint={HIGHLIGHT_CIRCLE_PAINT}
      />
      {/* Display sites inner ring */}
      <Layer
        id={SITESFILE_INNER_LAYER_ID}
        type="circle"
        sourceId={SITESFILE_SOURCE_ID}
        paint={INNER_CIRCLE_PAINT}
      />
    </>
  );
}

function createSiteFeature(site: SitesFileRow): GeoFeature {
  const siteTypeNum =
    ANP_SITE_TYPE[site.type.toUpperCase()] ?? ANP_SITE_TYPE.CN;
  return turf.point(
    locToPos(site.location),
    {
      sitesfile_id: site.id.toString(),
      color: getColorBySiteType(siteTypeNum),
    },
    {id: site.id},
  );
}
