/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 */

export type Feature = {
  title: string,
  properties: {
    name: string,
  },
  id: number | string,
  center?: [number, number],
  bbox?: [number, number, number, number], //minX,minY,maxX,maxY
  geometry: {type: string, coordinates: [number, number]},
};

export type Result = {feature: Feature};
