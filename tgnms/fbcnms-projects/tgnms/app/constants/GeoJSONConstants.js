/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow strict-local
 */
import type {GeoGeometryType} from '@turf/turf';

export const GEOMETRY_TYPE: {[string]: GeoGeometryType} = {
  POINT: 'Point',
  MULTI_POINT: 'MultiPoint',
  LINE_STRING: 'LineString',
  MULTI_LINE_STRING: 'MultiLineString',
  POLYGON: 'Polygon',
  MULTI_POLYGON: 'MultiPolygon',
  GEOMETRY_COLLECTION: 'GeometryCollection',
};

export const POINTS = new Set<string>([
  GEOMETRY_TYPE.POINT,
  GEOMETRY_TYPE.MULTI_POINT,
]);
export const LINES = new Set<string>([
  GEOMETRY_TYPE.LINE_STRING,
  GEOMETRY_TYPE.MULTI_LINE_STRING,
]);
export const POLYS = new Set<string>([
  GEOMETRY_TYPE.POLYGON,
  GEOMETRY_TYPE.MULTI_POLYGON,
]);
// doesn't make sense to calculate area for a point
export const MEASURABLE = new Set<string>([...LINES, ...POLYS]);
