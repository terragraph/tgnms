/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 */

import type {GeoFeatureCollection} from '@turf/turf';

export type RemoteOverlay = {|
  id: string,
  name: string,
  url: string,
  enabled: boolean,
  httpMethod: 'POST' | 'GET',
  useProxy: boolean,
|};

export type OverlayRequest = {|
  network_name: string,
  /**
   * send overlay metadata to the API so that one API can serve multiple
   * overlays if desired.
   */
  overlay: RemoteOverlay,
|};

export const RESPONSE_TYPE = {
  topology: 'topology',
  geojson: 'geojson',
  error: 'error',
};
// Creates a flow disjoint union using the type field as discriminator
export type OverlayResponse =
  | TopologyOverlayResponse
  | GeoJSONOverlayResponse
  | ErrorResponse;

export type TopologyOverlayResponse = {|
  type: 'topology',
  data: {
    links: LinkMetrics,
    nodes: NodeMetrics,
    sites: SiteMetrics,
  },
  legend: {
    links: Legend,
    sites: Legend,
    nodes: Legend,
  },
|};

export type GeoJSONOverlayResponse = {|
  type: 'geojson',
  geojson: GeoFeatureCollection,
  //TODO: better define this
  mapboxStyles: Array<{}>,
|};

export type ErrorResponse = {|
  type: 'error',
  error: {
    message: string,
  },
|};

export type Metric = {|
  value: number | string,
  text?: string,
  metadata?: {},
|};

export type LinkMetric = {|
  A: Metric,
  Z: Metric,
|};
export type NodeMetrics = {|
  [string]: Metric,
|};
export type SiteMetrics = {|
  [string]: Metric,
|};
export type LinkMetrics = {|
  [string]: LinkMetric | Metric,
|};

export type LegendKey = string | number;
export type LegendDef = {
  value: number,
  label: string,
  color: string,
};
// Represents the legend for a single overlay layer, such as nodes or links.
export type Legend = {|
  items: Array<LegendDef>,
|};
