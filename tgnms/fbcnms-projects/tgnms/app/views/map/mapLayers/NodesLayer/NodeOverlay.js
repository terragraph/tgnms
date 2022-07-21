/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 */

import * as turf from '@turf/turf';
import React from 'react';
import {Layer, Source} from 'react-mapbox-gl';
import {NodeOverlayColors} from '@fbcnms/tg-nms/app/constants/LayerConstants';
import {TOPOLOGY_ELEMENT} from '@fbcnms/tg-nms/app/constants/NetworkConstants';
import {azimuthToBearing} from '@fbcnms/tg-nms/app/helpers/GeoHelpers';
import {
  getEstimatedNodeBearing,
  getTopologyMaps,
} from '@fbcnms/tg-nms/app/helpers/TopologyHelpers';
import {handleLayerMouseEnter, handleLayerMouseLeave} from '../helpers';
import {makeRangeColorFunc} from '@fbcnms/tg-nms/app/helpers/MapLayerHelpers';
import {mapboxShouldAcceptClick} from '@fbcnms/tg-nms/app/helpers/NetworkHelpers';
import {objectValuesTypesafe} from '@fbcnms/tg-nms/app/helpers/ObjectHelpers';
import {useMapContext} from '@fbcnms/tg-nms/app/contexts/MapContext';
import {useNetworkContext} from '@fbcnms/tg-nms/app/contexts/NetworkContext';
import type {FeatureId, GeoFeature} from '@turf/turf';
import type {NodeType as Node} from '@fbcnms/tg-nms/shared/types/Topology';
import type {Overlay} from '@fbcnms/tg-nms/app/features/map/NetworkMapTypes';

export const BEARING_PROP = 'bearing';
export const COLOR_PROP = 'color';
export const NODE_IMAGE_ID = 'node';
export const NODE_IMAGE_PATH = '/static/images/map/node.png';
export const SOURCE_ID = 'nodes';
export const LAYER_ID = 'nodes';

const NODE_LAYER_LAYOUT = {
  'icon-image': NODE_IMAGE_ID,
  'icon-size': 0.5,
  'icon-rotate': ['get', BEARING_PROP],
  'icon-anchor': 'bottom',
  'icon-offset': [0, 0],
  'icon-allow-overlap': true,
  'icon-ignore-placement': true,
};

const NODE_SELECTED_COLOR = '#0077ff';
const NODE_UNSELECTED_COLOR = '#eeeeee';

const NODE_LAYER_PAINT = {
  'icon-opacity': makeSelectedExpression(0.5, 0.8),
  'icon-color': makeSelectedExpression(NODE_SELECTED_COLOR, [
    'case',
    ['has', COLOR_PROP],
    ['get', COLOR_PROP],
    NODE_UNSELECTED_COLOR,
  ]),
};

export default function NodeOverlay({
  overlay,
  overlayData,
}: {
  overlay?: Overlay,
  overlayData?: {[string]: number},
}) {
  const {setSelected, ...ctx} = useNetworkContext();
  const topologyMaps = getTopologyMaps(ctx);
  useNodeIcon();
  const getOverlayColor = useOverlayColor(overlay);
  const geoJson = React.useMemo(() => {
    const {nodeMap, siteMap} = topologyMaps;
    const features = objectValuesTypesafe<Node>(nodeMap).map((node, idx) => {
      const {location} = siteMap[node.site_name];
      const feature = turf.point(
        [location.longitude, location.latitude, location.altitude],
        {
          ...node,
        },
        {id: idx},
      );
      const nodeBearing =
        node.ant_azimuth === 0
          ? getEstimatedNodeBearing(node, topologyMaps)
          : azimuthToBearing(node.ant_azimuth);
      feature.properties[BEARING_PROP] = nodeBearing ?? 0;
      const overlayValue = overlayData != null ? overlayData[node.name] : null;
      if (overlayValue != null) {
        feature.properties[COLOR_PROP] =
          getOverlayColor(overlayValue) ?? '#000000';
      }
      return feature;
    });
    const featureCollection = turf.featureCollection(features);
    return featureCollection;
  }, [topologyMaps, getOverlayColor, overlayData]);

  useMapboxSelectionState(geoJson);
  return (
    <>
      <Source
        id={SOURCE_ID}
        geoJsonSource={{type: 'geojson', data: geoJson, generateId: true}}
      />
      <Layer
        id={LAYER_ID}
        before="site-layer"
        type="symbol"
        sourceId={SOURCE_ID}
        minZoom={10}
        layout={NODE_LAYER_LAYOUT}
        paint={NODE_LAYER_PAINT}
        onMouseEnter={handleLayerMouseEnter}
        onMouseLeave={handleLayerMouseLeave}
        onClick={mapboxEvent => {
          if (!mapboxEvent.features || !mapboxShouldAcceptClick(mapboxEvent)) {
            return;
          }

          const feature = mapboxEvent.features[0];
          if (!(feature && feature.properties)) {
            return;
          }
          const {name} = feature.properties;
          if (name) {
            setSelected(TOPOLOGY_ELEMENT.NODE, name);
          }
        }}
      />
    </>
  );
}

/**
 * Loads the node icon and adds it to mapbox for rendering
 */
function useNodeIcon() {
  const {mapboxRef} = useMapContext();
  React.useEffect(() => {
    async function loadImage() {
      if (mapboxRef && !mapboxRef.hasImage(NODE_IMAGE_ID)) {
        const image = await new Promise((res, rej) =>
          mapboxRef.loadImage(NODE_IMAGE_PATH, (err, image) =>
            err ? rej(err) : res(image),
          ),
        );
        mapboxRef.addImage(NODE_IMAGE_ID, image, {sdf: true});
        mapboxRef.triggerRepaint();
      }
    }
    loadImage();
  }, [mapboxRef]);
}

/**
 * Keeps mapbox's internal state in-sync with the NMS's selectedElement
 */
function useMapboxSelectionState(geoJson) {
  const {mapboxRef} = useMapContext();
  const {selectedElement} = useNetworkContext();
  const selectionRef = React.useRef<?FeatureId>();
  const selectFeature = React.useCallback(
    (feature: ?GeoFeature) => {
      // deselect previous
      if (typeof selectionRef?.current === 'number') {
        mapboxRef?.setFeatureState(
          {source: SOURCE_ID, id: selectionRef.current},
          {selected: false},
        );
      }

      // set new feature as selected
      if (feature && feature.id != null) {
        const id = feature.id;
        mapboxRef?.setFeatureState(
          {source: SOURCE_ID, id: id},
          {selected: true},
        );
        selectionRef.current = id;
      } else {
        selectionRef.current = null;
      }
    },
    [mapboxRef, selectionRef],
  );

  // keep mapbox's selected states in-sync with selectedElement
  React.useEffect(() => {
    if (!geoJson) {
      return;
    }
    if (selectedElement?.type !== TOPOLOGY_ELEMENT.NODE) {
      return selectFeature(null);
    }
    const feature = (geoJson.features ?? []).find(
      f => f?.properties?.name === selectedElement?.name,
    );
    selectFeature(feature);
  }, [selectedElement, selectFeature, geoJson]);
}

function useOverlayColor(overlay: ?Overlay): (value: number) => string {
  const getOverlayColor = React.useMemo<(value: number) => string>(() => {
    if (!overlay) {
      return _ => NodeOverlayColors.health.planned.color;
    }
    const colorFunc = makeRangeColorFunc(
      overlay.range ?? [],
      overlay.colorRange,
    );
    return colorFunc;
  }, [overlay]);
  return getOverlayColor;
}

/**
 * Returns a mapbox style expression.
 * First value is picked if feature is selected,
 * second value is picked if feature is not selected.
 */
function makeSelectedExpression(isSelected, isNotSelected) {
  return [
    'case',
    ['boolean', ['feature-state', 'selected'], false],
    isSelected,
    isNotSelected,
  ];
}
