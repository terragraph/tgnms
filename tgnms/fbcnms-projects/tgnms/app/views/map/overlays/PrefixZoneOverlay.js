/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import * as ServiceAPIUtil from '@fbcnms/tg-nms/app/apiutils/ServiceAPIUtil';
import * as turf from '@turf/turf';
import NetworkContext from '@fbcnms/tg-nms/app/contexts/NetworkContext';
import axios from 'axios';
import {Address6} from 'ip-address';
import {
  INDEX_COLORS,
  LINE_TEXT_PAINT,
} from '@fbcnms/tg-nms/app/constants/LayerConstants';
import {Layer, Source} from 'react-mapbox-gl';
import {scaleOrdinal} from 'd3-scale';

import type {GeoFeature} from '@turf/turf';
import type {
  NodeMap,
  SiteMap,
} from '@fbcnms/tg-nms/app/contexts/NetworkContext';
import type {SiteType} from '@fbcnms/tg-nms/shared/types/Topology';

export default function PrefixZoneOverlay() {
  const prefixData = useNetworkPrefixTable();
  return (
    <>
      {prefixData && (
        <>
          <Source
            id="prefix"
            geoJsonSource={{type: 'geojson', data: prefixData}}
          />
          <Layer
            before="link-normal"
            id="prefix-polygon"
            type="fill"
            sourceId={'prefix'}
            layout={{}}
            paint={{
              'fill-color': ['get', 'color'],
              'fill-outline-color': '#880000',
              'fill-opacity': 0.6,
            }}
          />
          <Layer
            type="symbol"
            sourceId={'prefix'}
            minZoom={12} // hide the text when the user zooms out
            layout={{
              'text-field': ['get', 'label'],
              'text-max-width': 20,
            }}
            paint={{
              ...LINE_TEXT_PAINT,
              'text-opacity': 0.8,
            }}
          />
        </>
      )}
    </>
  );
}

type ZonePrefixResponse = {|
  zonePrefixes: ZonePrefixMap,
|};

type ZonePrefixMap = {
  [siteName: string]: Array<string>,
};

type NodePrefixResponse = {|
  nodePrefixes: {
    [string]: string,
  },
|};

/**
 * getZonePrefixes api returns results as nodename -> prefix, this re-groups
 * by prefix for polygon drawing
 */
type PrefixTable = {
  [pfx: string]: Set<SiteType>,
};

export function useNetworkPrefixTable() {
  const {networkName, siteMap, nodeMap} = React.useContext(NetworkContext);
  const siteMapRef = React.useRef<SiteMap>(siteMap);
  const nodeMapRef = React.useRef<NodeMap>(nodeMap);
  const [nodePrefixes, setNodePrefixes] = React.useState<{[string]: string}>(
    {},
  );
  const [zonePrefixes, setZonePrefixes] = React.useState<ZonePrefixMap>({});
  const [geoJson, setGeoJson] = React.useState<?{}>(null);

  // Hack because the maps change with every render
  React.useEffect(() => {
    siteMapRef.current = siteMap;
    nodeMapRef.current = nodeMap;
  }, [nodeMap, siteMap]);

  // retrieve the prefixes by network name
  React.useEffect(() => {
    const cancelSource = axios.CancelToken.source();
    async function makeRequest() {
      try {
        const {zonePrefixes} = await ServiceAPIUtil.apiRequest<
          {},
          ZonePrefixResponse,
        >({
          networkName,
          endpoint: 'getZonePrefixes',
          config: {cancelToken: cancelSource.token},
        });
        const {nodePrefixes} = await ServiceAPIUtil.apiRequest<
          {},
          NodePrefixResponse,
        >({
          networkName,
          endpoint: 'getNodePrefixes',
          config: {cancelToken: cancelSource.token},
        });

        setZonePrefixes(zonePrefixes);
        setNodePrefixes(nodePrefixes);
      } catch (err) {
        if (axios.isCancel()) {
          // request was cancelled and not a real error
          return;
        }
      }
    }
    makeRequest();
    return () => cancelSource.cancel();
  }, [networkName, setZonePrefixes]);
  // groups all the nodes under their corresponding prefix zone
  const prefixTable = React.useMemo<PrefixTable>(() => {
    // first add the prefix zones to the prefix table
    const prefixTable: PrefixTable = {};
    for (const siteName of Object.keys(zonePrefixes)) {
      const site = siteMapRef.current[siteName];
      const prefixes = zonePrefixes[siteName];
      for (const popPrefix of prefixes) {
        let set = prefixTable[popPrefix];
        if (typeof prefixTable[popPrefix] === 'undefined') {
          set = new Set<SiteType>();
          prefixTable[popPrefix] = set;
        }
        set.add(site);
      }
    }
    // top level prefix of each pop
    const prefixAddresses = Object.keys(prefixTable).map(p => new Address6(p));
    /**
     * next, group the nodes with overlapping subnets into the appropriate
     * prefix table sets. We have to settle with O(prefix * node) algorithm for
     * simplicity's sake.
     */
    for (const nodeName of Object.keys(nodePrefixes)) {
      const nodePrefix = new Address6(nodePrefixes[nodeName]);
      const node = nodeMapRef.current[nodeName];
      const site = siteMapRef.current[node.site_name];
      for (const popPrefix of prefixAddresses) {
        const isInSubnet = nodePrefix.isInSubnet(popPrefix);
        if (isInSubnet) {
          prefixTable[popPrefix.address].add(site);
        }
      }
    }

    return prefixTable;
  }, [zonePrefixes, nodePrefixes]);
  // compute the polygon
  React.useEffect(() => {
    const polygons = [];
    const prefixes = Object.keys(prefixTable);
    const colorFunc = scaleOrdinal().domain(prefixes).range(INDEX_COLORS);

    for (const prefix of prefixes) {
      const sites = Array.from(prefixTable[prefix]);
      // for now, only compute polygons
      if (sites.length > 2) {
        const polygon = sitesToPolygon(sites);
        if (polygon) {
          polygon.properties.label = prefix;
          polygon.properties.color = colorFunc(prefix);
          polygons.push(polygon);
        }
      }
    }
    const featureCol = turf.featureCollection(polygons);
    setGeoJson(featureCol);
  }, [prefixTable]);

  return geoJson;
}

/**
 * Converts an array of sites into a geojson polygon with a small buffer
 * around it for aesthetic reasons.
 */
function sitesToPolygon(sites: Array<SiteType>): ?GeoFeature {
  const points = turf.featureCollection(
    sites.map(({location}) =>
      turf.point([location.longitude, location.latitude, location.altitude]),
    ),
  );
  // creates a convex hull around the polygon points, order doesn't matter
  const polygon = turf.convex(points);
  if (!polygon) {
    return null;
  }
  /*
   * applies some padding to the polygon so it's not cutting through the
   * center of sites. static sizing isn't great since some polygons span
   * large geographic areas and the padding will look small, whereas padding of
   * polygons which span a building will look huge. Should instead use the
   * area or circumference of the polygon to decide this value.
   */
  const POLYGON_PADDING_KM = 0.02;
  const buffered = turf.buffer(polygon, POLYGON_PADDING_KM, {
    units: 'kilometers',
  });

  return buffered;
}
