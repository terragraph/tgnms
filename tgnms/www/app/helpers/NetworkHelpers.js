/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

/**
 * Shared methods
 */

import {
  LinkType,
  PolarityType,
  NodeStatusType,
} from '../../thrift/gen-nodejs/Topology_types';
import LeafletGeom from 'leaflet-geometryutil';
import {LatLng} from 'leaflet';
import invert from 'lodash-es/invert';
import React from 'react';

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
    case PolarityType.ODD:
      return 'blue';
    case PolarityType.EVEN:
      return 'magenta';
    case PolarityType.HYBRID_ODD:
    case PolarityType.HYBRID_EVEN:
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
  // try to show the longest version string before the details string
  // this should look like 'M##-<GIT_HASH>' in most cases, at least until we
  // change it again
  const splitIndex = Math.max(splitIdxA, splitIdxB);
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

/**
 * Returns the a readable polarity string given a number
 * @param  {Number/String} polarity
 */
export function getPolarityString(polarity) {
  const polarityToString = invert(PolarityType);

  if (typeof polarity === 'string') {
    if (!isNaN(polarity)) {
      polarity = parseInt(polarity);
    } else {
      return 'Malformed';
    }
  }

  if (polarity === undefined || polarity === null) {
    return 'Not Set';
  }

  if (polarityToString.hasOwnProperty(polarity)) {
    // Take a string in HYBRID_ODD and convert it to Hybrid Odd
    const polarityString = polarityToString[polarity];
    return polarityString
      .split('_')
      .map(token => token[0] + token.substring(1).toLowerCase())
      .join(' ');
  }

  return polarity;
}

/**
 * converts BWGD to UNIX time in ms
 */
export function bwgdToUnixTime(bwgd) {
  const realGpsTime = Math.floor((bwgd * 256) / 10);
  const gpsTime = realGpsTime - 18000;
  const unixTimeMs = gpsTime + 315964800000;
  return unixTimeMs;
}

/**
 * Returns the date as a string in local time
 * example: "13 Aug 18, 18:08:43"
 */
export function unixTimeToDate(unixTimeMs) {
  const options = {
    day: '2-digit',
    hour: 'numeric',
    hour12: false,
    minute: 'numeric',
    month: 'short',
    second: 'numeric',
    year: '2-digit',
  };
  const event = new Date(unixTimeMs);
  const str = event.toLocaleDateString('en-GB', options);
  return str;
}

/**
 * Returns high-level topology status as <tr> rows.
 */
export function getTopologyStatusRows(topology) {
  const linksOnline = topology.links.filter(
    link => link.link_type == LinkType.WIRELESS && link.is_alive,
  ).length;
  const linksWireless = topology.links.filter(
    link => link.link_type == LinkType.WIRELESS,
  ).length;
  const sectorsOnline = topology.nodes.filter(
    node =>
      node.status === NodeStatusType.ONLINE ||
      node.status === NodeStatusType.ONLINE_INITIATOR,
  ).length;
  let totalRuckusAps = 0;
  let totalRuckusClients = 0;
  topology.sites.forEach(site => {
    if (site.hasOwnProperty('ruckus')) {
      totalRuckusAps++;
      totalRuckusClients += site.ruckus.clientCount;
    }
  });

  const rows = [
    <tr key="sectors_online">
      <td>Sectors Online</td>
      <td>
        {sectorsOnline} / {topology.nodes.length}
      </td>
    </tr>,
    <tr key="rf_links_online">
      <td>RF Links Online</td>
      <td>
        {linksOnline} / {linksWireless}
      </td>
    </tr>,
    <tr key="total_sites">
      <td>Total Sites</td>
      <td>{topology.sites.length}</td>
    </tr>,
  ];
  if (totalRuckusAps > 0) {
    rows.push(
      <tr key="ruckus_aps">
        <td>Ruckus APs</td>
        <td>
          {totalRuckusAps} APs, {totalRuckusClients} clients
        </td>
      </tr>,
    );
  }
  return rows;
}
