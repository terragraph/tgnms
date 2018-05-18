/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

/**
 * Shared methods
 */

import LeafletGeom from 'leaflet-geometryutil';
import {LatLng} from 'leaflet';

export function availabilityColor(alive_perc) {
  if (alive_perc >= 99.99) {
    return 'green';
  } else if (alive_perc >= 99) {
    return 'yellowgreen';
  } else {
    return 'red';
  }
}

export function variableColorUp(value, thresh1, thresh2) {
  if (value >= thresh1) {
    return 'green';
  } else if (value >= thresh2) {
    return 'orange';
  } else {
    return 'red';
  }
}

export function variableColorDown(value, thresh1, thresh2) {
  if (value <= thresh1) {
    return 'green';
  } else if (value <= thresh2) {
    return 'orange';
  } else {
    return 'red';
  }
}
// accepts the polarity id, not name
export function polarityColor(polarity) {
  if (polarity == null || polarity == undefined) {
    return 'red';
  }
  switch (polarity) {
    case 1:
      return 'blue';
    case 2:
      return 'magenta';
    case 3:
      return 'orange';
    default:
      return 'red';
  }
}

export function chartColor(colors, index) {
  const colorIndex = index % colors.length;
  return colors[colorIndex];
}

export function versionSlicer(versionName) {
  //RELEASE_M12_3 (michaelcallahan@devbig730 Tue Aug 8 10:48:29 PDT 2017)
  const releaseIdx = versionName.indexOf('RELEASE_');
  const splitIdxA = versionName.indexOf('-', releaseIdx);
  const splitIdxB = versionName.indexOf(' ', releaseIdx);
  const splitIndex =
    splitIdxA >= 0 && splitIdxB >= 0
      ? Math.min(splitIdxA, splitIdxB)
      : Math.max(splitIdxA, splitIdxB);
  const releaseName = versionName.substring(releaseIdx + 8, splitIndex);
  return releaseName;
}

export function uptimeSec(seconds) {
  if (seconds < 0) {
    return '-';
  }
  if (seconds > 60 * 60 * 24) {
    return Math.round(seconds / 60.0 / 60.0 / 24.0) + ' day';
  } else if (seconds > 60 * 60) {
    return Math.round(seconds / 60.0 / 60.0) + ' hr';
  } else if (seconds > 60) {
    return Math.round(seconds / 60.0) + ' min';
  }
}

export function linkLength(aSite, zSite) {
  const aSiteCoords = new LatLng(
    aSite.location.latitude,
    aSite.location.longitude,
  );
  const zSiteCoords = new LatLng(
    zSite.location.latitude,
    zSite.location.longitude,
  );
  const linkAngle = LeafletGeom.bearing(aSiteCoords, zSiteCoords);
  const linkLength = LeafletGeom.length([aSiteCoords, zSiteCoords]);
  return linkLength;
}
