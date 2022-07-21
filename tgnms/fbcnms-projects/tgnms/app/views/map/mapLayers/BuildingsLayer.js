/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 */

import React from 'react';
import {Layer} from 'react-mapbox-gl';

/** Copied from: http://alex3165.github.io/react-mapbox-gl/demos -> "3d-map" */

const PAINT_LAYER = {
  'fill-extrusion-color': '#aaa',
  'fill-extrusion-height': {
    type: 'identity',
    property: 'height',
  },
  'fill-extrusion-base': {
    type: 'identity',
    property: 'min_height',
  },
  'fill-extrusion-opacity': 0.9,
};

export default function BuildingsLayer() {
  return (
    <Layer
      id="3d-buildings"
      before="link-normal"
      sourceId="composite"
      sourceLayer="building"
      filter={['==', 'extrude', 'true']}
      type="fill-extrusion"
      minZoom={14}
      paint={PAINT_LAYER}
    />
  );
}
