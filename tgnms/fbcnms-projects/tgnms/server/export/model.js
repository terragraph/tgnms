/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
const logger = require('../log')(module);
const {getNetworkState} = require('../topology/model');
const xml2js = require('xml2js');

export function getSitesAsKML(networkName: string) {
  const builder = new xml2js.Builder();
  const xmlAsJson = {kml: [{Document: []}]};
  const networkState = getNetworkState(networkName);
  try {
    const sites = networkState.topology.sites;
    sites.forEach(site => {
      const placemark = {
        name: site.name,
        Point: {
          coordinates: `${site.location.longitude}, ${site.location.latitude}`,
        },
      };
      xmlAsJson.kml[0].Document.push({Placemark: placemark});
    });
    return builder.buildObject(xmlAsJson);
  } catch {
    logger.error(`Cannot convert ${networkName}\'s sites to XML`);
    return null;
  }
}
