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
import {TOPOLOGY_ELEMENT} from '@fbcnms/tg-nms/app/constants/NetworkConstants';

import type {
  Element,
  NetworkContextType,
} from '@fbcnms/tg-nms/app/contexts/NetworkContext';
import type {
  LocationType,
  TemporaryTopologyType,
  TopologyType,
} from '@fbcnms/tg-nms/shared/types/Topology';
import type {QueryLabels} from '@fbcnms/tg-nms/app/apiutils/PrometheusAPIUtil';
import type {TopologyHistoryResultsType} from '@fbcnms/tg-nms/shared/dto/TopologyHistoryTypes';

export type MapLayerConfig = {
  layerId: string,
  name: string,
  render: NetworkContextType => React.Node,
};

export type LayerData<T> = $Shape<{|
  link_lines: T,
  site_icons: T,
  nodes: T,
  site_name_popups: T,
  alert_popups: T,
  buildings_3d: T,
  area_polygons: T,
|}>;

// selected overlay ids for each layer
export type SelectedOverlays = LayerData<string>;

// available overlay configs for each layer
export type OverlaysConfig = LayerData<OverlayConfig>;

export type MetricLegend = {|
  color: string,
  label?: string,
|};
// which overlays to show
export type OverlayConfig = {|
  layerId: string,
  overlays: Array<Overlay>,
  defaultOverlayId?: string,
  legend: {
    [overlayid: string]: {
      [metricval: string]: MetricLegend,
    },
  },
|};

export type OverlayComponentProps = {|
  overlay: Overlay,
|};

export type Overlay = {|
  name: string,
  type: string,
  id: string,
  metrics?: Array<string>,
  query?: (labels: QueryLabels) => string,
  range?: Array<number>,
  colorRange?: Array<string>,
  units?: string,
  bounds?: Array<number>,
  overlayLegendType?: string,
  aggregate?: any => number,
  formatText?: (link: any, value: any, index: number) => string,
  /**
   * Render MapboxGL Sources, Layers, Features to construct this overlay. This
   * will completely override the default logic of the layer.
   */
  Component?: React.ComponentType<OverlayComponentProps>,
|};

export type SelectedLayersType = LayerData<boolean>;

export type NetworkMapOptions = $Shape<{
  selectedLayers: SelectedLayersType,
  selectedOverlays: SelectedOverlays,
  historicalDate: Date,
  historicalTopology: $Shape<TopologyType>,
  selectedTime: Date,
  historicalData: {stats: ?{}, topology: Array<TopologyHistoryResultsType>},
  testExecutionData: ?{results: {}, type: $Values<typeof TOPOLOGY_ELEMENT>},
  scanLinkData: ?{},
  temporaryTopology?: ?TemporaryTopologyType,
  temporarySelectedAsset?: ?Element,
  overlayData: LayerData<{}>,
  mapMode: string,
}>;

export type MapFeatureTopology = {|
  sites: {|[name: string]: SiteFeature|},
  links: {|[name: string]: LinkFeature|},
  nodes: {|[name: string]: NodeFeature|},
|};

export type LinkFeature = {|
  link_id?: string, // Represents the original link ID
  name: string,
  a_node_name: string,
  z_node_name: string,
  link_type: number, //$Values<typeof LinkTypeValueMap>,
  properties: Object,
|};

export const SITE_FEATURE_TYPE = {
  DN: 0,
  CN: 1,
  POP: 2,
};

export type SiteFeature = {|
  site_id?: string, // Represents the original site ID
  name: string,
  location: LocationType,
  properties: Object,
  site_type: $Values<typeof SITE_FEATURE_TYPE>,
|};
export type NodeFeature = {|
  node_id?: string, // Represents the original node ID
  name: string,
  site_name: string,
  // does this even make sense for multi-radio nodes?
  ant_azimuth: number,
  properties: Object,
|};
