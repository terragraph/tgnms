/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
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
