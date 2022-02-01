/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
import * as turf from '@turf/turf';
import type {BBox} from '@turf/turf';
import type {LocationType} from '@fbcnms/tg-nms/shared/types/Topology';

export function locationMidpoint(
  aLocation: $Shape<LocationType>,
  zLocation: $Shape<LocationType>,
): $Shape<LocationType> {
  const pointA = turf.point([aLocation.longitude, aLocation.latitude]);
  const pointZ = turf.point([zLocation.longitude, zLocation.latitude]);
  const midpoint = turf.midpoint(pointA, pointZ).geometry.coordinates;
  return {longitude: midpoint[0], latitude: midpoint[1]};
}

/**
 * Converts from tg/anp's named LocationType into geojson's position tuple
 */
export function locToPos(
  location: $Shape<LocationType>,
): [number, number, number] {
  return [location.longitude, location.latitude, location.altitude];
}

export function bearingToAzimuth(bearing: number): number {
  return (bearing + 360) % 360;
}

export function azimuthToBearing(azimuth: number): number {
  return azimuth < 180 ? azimuth : azimuth - 360;
}

export function getBBox(locations: Array<LocationType>): ?BBox {
  if (locations.length < 1) {
    return null;
  }
  const features = turf.featureCollection(
    locations.map(l => turf.point(locToPos(l))),
  );
  return turf.bbox(features);
}
