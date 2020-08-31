/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import type {MapMouseEvent} from 'mapbox-gl/src/ui/events';

export function handleFeatureMouseEnter(mapEvent: MapMouseEvent) {
  // Change cursor when hovering over sites/links
  mapEvent.target.getCanvas().style.cursor = 'pointer';
}

export function handleFeatureMouseLeave(mapEvent: MapMouseEvent) {
  // Reset cursor when leaving sites/links
  mapEvent.target.getCanvas().style.cursor = '';
}

export function handleLayerMouseEnter(layerEvent: MapMouseEvent) {
  layerEvent.target.getCanvas().style.cursor = 'pointer';
}

export function handleLayerMouseLeave(layerEvent: MapMouseEvent) {
  layerEvent.target.getCanvas().style.cursor = '';
}
