/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */
import type {LocationType} from '../../shared/types/Topology';
/** Computes the line-of-sight distance between two locations.
    Approximation tested for:
    max 1% error, Locations upto 50km away, near poles/equator */
export function approxDistance(l1: LocationType, l2: LocationType): number {
  // Circumference 40,075.017 km (24,901.461 mi) (equatorial)
  const earthCircumference = 40075017;
  const lengthPerDeg = earthCircumference / 360;
  const avgLatitudeRadian =
    ((l1.latitude + l2.latitude) / 2) * ((2 * Math.PI) / 360);

  // Calculate distance across latitude change
  const dLat = Math.abs(l1.latitude - l2.latitude) * lengthPerDeg;

  // Calculate distance across longitude change
  // Take care of links across 180 meridian and effect of different latitudes
  let dLong = Math.abs(l1.longitude - l2.longitude);
  if (dLong > 180) {
    dLong = 360 - dLong;
  }
  dLong *= lengthPerDeg * Math.cos(avgLatitudeRadian);

  // Calculate distance across altitude change
  const dAlt = Math.abs(l1.altitude - l2.altitude);

  // Assume orthogonality over small distance
  return Math.sqrt(dLat * dLat + dLong * dLong + dAlt * dAlt);
}

/** Computes the angle between two Locations. */
export function computeAngle(l1: LocationType, l2: LocationType): number {
  const lon = l1.longitude;
  const lat = l1.latitude;
  const lonRef = l2.longitude;
  const latRef = l2.latitude;

  // Earth's radius (in meters)
  const R = 6371000.0;
  const degInRad = Math.PI / 180.0;
  const x =
    R * (lon - lonRef) * degInRad * Math.cos(((lat + latRef) * degInRad) / 2.0);
  const y = R * ((lat - latRef) * degInRad);
  return (Math.atan2(y, x) / Math.PI) * 180;
}
