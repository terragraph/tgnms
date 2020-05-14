/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import type {MapEvent} from 'mapbox-gl';

export function handleFeatureMouseEnter(mapEvent: MapEvent) {
  // Change cursor when hovering over sites/links
  mapEvent.map.getCanvas().style.cursor = 'pointer';
}

export function handleFeatureMouseLeave(mapEvent: MapEvent) {
  // Reset cursor when leaving sites/links
  mapEvent.map.getCanvas().style.cursor = '';
}

export function handleLayerMouseEnter(layerEvent: MapEvent) {
  layerEvent.target.getCanvas().style.cursor = 'pointer';
}

export function handleLayerMouseLeave(layerEvent: MapEvent) {
  layerEvent.target.getCanvas().style.cursor = '';
}
