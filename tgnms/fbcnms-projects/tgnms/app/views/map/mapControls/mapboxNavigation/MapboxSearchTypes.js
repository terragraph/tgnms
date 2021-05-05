/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 */

import type {BBox} from '@turf/turf';
import type {GeoCoord} from '@turf/turf';
export type Feature = {
  title: string,
  properties: {
    name: string,
  },
  id: number | string,
  center?: GeoCoord,
  bbox?: BBox, //minX,minY,maxX,maxY
  geometry: {type: string, coordinates: GeoCoord},
};

export type Result = {feature: Feature};
