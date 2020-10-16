/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */

import React from 'react';
import SignalWifi0BarIcon from '@material-ui/icons/SignalWifi0Bar';
import SignalWifi2BarIcon from '@material-ui/icons/SignalWifi2Bar';
import SignalWifi4BarIcon from '@material-ui/icons/SignalWifi4Bar';
import {NodeStatusTypeValueMap as NodeStatusType} from '../../shared/types/Topology';
import {
  SNR_THRESHOLD_MCS2,
  SNR_THRESHOLD_MCS9,
} from '../constants/NetworkConstants';
import {getUrlSearchParam} from './NetworkUrlHelpers';
import {isEqual} from 'lodash';

/** Returns whether a node is alive based on its status. */
export function isNodeAlive(nodeStatus) {
  return (
    nodeStatus === NodeStatusType.ONLINE ||
    nodeStatus === NodeStatusType.ONLINE_INITIATOR
  );
}

/** Computes the line-of-sight distance between two locations.
    Approximation tested for:
    max 1% error, Locations upto 50km away, near poles/equator */
export function approxDistance(l1, l2) {
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

/** Returns a color corresponding to the given availability percentage. */
export function availabilityColor(livenessPercent) {
  if (isNaN(livenessPercent)) {
    return 'grey';
  } else if (livenessPercent >= 99.99) {
    return 'green';
  } else if (livenessPercent >= 99) {
    return 'yellowgreen';
  } else {
    return 'red';
  }
}

/** Returns the availability percentage as a colored span. */
export function renderAvailabilityWithColor(livenessPercentString) {
  const livenessPercent = parseFloat(livenessPercentString);
  return (
    <span style={{color: availabilityColor(livenessPercent)}}>
      {isNaN(livenessPercent) ? 'N/A' : livenessPercentString + '%'}
    </span>
  );
}

/** Returns the SNR as a colored span. */
export function renderSnrWithColor(snr) {
  const color =
    snr >= SNR_THRESHOLD_MCS2
      ? snr >= SNR_THRESHOLD_MCS9
        ? 'green'
        : 'yellowgreen'
      : 'red';
  return <span style={{color}}>{snr}dB</span>;
}

/** Returns the SNR as an icon. */
export function renderSnrWithIcon(snr, props = {}) {
  return snr >= SNR_THRESHOLD_MCS2 ? (
    snr >= SNR_THRESHOLD_MCS9 ? (
      <SignalWifi4BarIcon {...props} />
    ) : (
      <SignalWifi2BarIcon {...props} />
    )
  ) : (
    <SignalWifi0BarIcon {...props} />
  );
}

/**
 * Filters react-mapbox-gl click events, returning true only if the event
 * represents a click on the topmost rendered element at the given position.
 *
 * This is non-trivial because click events do not fire in top-down order using
 * react-mapbox-gl. Instead, we use map.queryRenderedFeatures(), which does
 * return all features at a position in the proper order.
 */
export function mapboxShouldAcceptClick(evt) {
  const featuresAtPoint = (evt.map || evt.target).queryRenderedFeatures(
    evt.point,
  );
  return (
    featuresAtPoint.length &&
    isEqual(evt.feature || evt.features[0], featuresAtPoint[0])
  );
}

/**
 * When a node goes online, it is added to a whitelist. If it is offline and
 * NOT part of the whitelist, we assume that it is configured but hasn't been
 * setup yet, so we color it grey. If it is part of the whitelist, we assume
 * it's unhealthy and color it red.
 **/
export function hasNodeEverGoneOnline(node, offline_whitelist): boolean {
  // if no offline whitelist, assume it has gone online in the past
  if (!(offline_whitelist && offline_whitelist.nodes)) {
    return true;
  }
  return offline_whitelist.nodes[node.name];
}

export function hasLinkEverGoneOnline(link, offline_whitelist): boolean {
  // if no offline whitelist, assume it has gone online in the past
  if (!(offline_whitelist && offline_whitelist.links)) {
    return true;
  }
  return offline_whitelist.links[link.name];
}

/**
 * When there is a date in the location object, that means the map is
 * in historical mode. This checks for that mode
 **/
export function getHistoricalDate(location: Location): ?string {
  return getUrlSearchParam('date', location);
}
