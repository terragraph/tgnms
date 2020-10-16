/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
const logger = require('../log')(module);
const {
  getNetworkState,
  getApiActiveControllerAddress,
} = require('../topology/model');
const xml2js = require('xml2js');
const stringify = require('csv-stringify');
import apiServiceClient from '../apiservice/apiServiceClient';
import {
  NodeStatusTypeValueMap,
  NodeTypeValueMap,
} from '../../shared/types/Topology';
import type {
  LocationType,
  NodeType,
  SiteType,
} from '../../shared/types/Topology';

const NodeTypeMap: {[string]: string} = invertMap(NodeTypeValueMap);
const NodeStatusMap: {[string]: string} = invertMap(NodeStatusTypeValueMap);

export function getSitesAsKML(networkName: string) {
  const builder = new xml2js.Builder();
  const xmlAsJson = {kml: [{Document: []}]};
  const networkState = getNetworkState(networkName);
  try {
    if (!networkState) {
      return null;
    }
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

type NodeExportType = {|
  ...NodeType,
  ...LocationType,
|};

export async function getNodesAsCSV(networkName: string): Promise<string> {
  const {api_ip, api_port} = getApiActiveControllerAddress({
    topology: networkName,
  });
  const response = await apiServiceClient.backgroundRequest({
    networkName: networkName,
    host: api_ip,
    port: api_port,
    isPrimaryController: true,
    apiMethod: 'getTopology',
    data: {},
    config: null,
  });

  const siteLookup: {[string]: SiteType} = (response.data?.sites ?? []).reduce(
    (map, site) => {
      map[site.name] = site;
      return map;
    },
    {},
  );
  const nodes: Array<NodeExportType> = (response.data?.nodes ?? []).map(
    node => {
      const {location} = siteLookup[node.site_name];
      return {
        ...node,
        ...location,
      };
    },
  );
  const columns: Array<{
    key: $Keys<NodeExportType>,
    format?: (val: any) => string,
  }> = [
    {key: 'name'},
    {key: 'node_type', format: val => NodeTypeMap[val]},
    {key: 'is_primary', format: intFlag},
    {key: 'mac_addr'},
    {key: 'pop_node', format: intFlag},
    {key: 'status', format: val => NodeStatusMap[val]},
    {key: 'site_name'},
    {key: 'latitude'},
    {key: 'longitude'},
    {key: 'altitude'},
    {key: 'accuracy'},
    {key: 'ant_azimuth'},
    {key: 'ant_elevation'},
    {key: 'has_cpe', format: intFlag},
    {key: 'wlan_mac_addrs'},
  ];
  const rows = nodes.map(node =>
    columns.map(column => {
      const val = node[column.key];
      if (typeof column.format === 'function') {
        return column.format(val);
      }
      return val;
    }),
  );
  return new Promise((res, rej) => {
    stringify([columns.map(x => x.key), ...rows], (err, output) => {
      if (err) {
        return rej(err);
      }
      return res(output);
    });
  });
}

// convert from 1 or 0 to true/false - non 1 or 0 input is returned verbatim
function intFlag(num: number): string {
  if (typeof num === 'undefined') {
    return 'false';
  }
  return num === 1 ? 'true' : num === 0 ? 'false' : num.toString();
}

function invertMap(obj: {[string]: *}) {
  return Object.keys(obj).reduce((map, key) => {
    const val = obj[key];
    map[val] = key;
    return map;
  }, {});
}
