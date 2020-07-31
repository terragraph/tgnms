/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 */

import type {LngLatLike} from 'mapbox-gl/src/geo/lng_lat';

export type Feature = {
  title: string,
  properties: {
    name: string,
  },
  id: number | string,
  center?: LngLatLike,
  bbox?: Array<LngLatLike>,
  geometry: {type: string, coordinates: LngLatLike},
};

export type Result = {feature: Feature};
