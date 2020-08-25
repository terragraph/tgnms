/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
import * as React from 'react';
import {TopologyElementType} from '../../constants/NetworkConstants';

import type {Element, NetworkContextType} from '../../contexts/NetworkContext';
import type {TemporaryTopologyType} from '../../../shared/types/Topology';

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
  buildings_3d: T,
  area_polygons: T,
|}>;

// selected overlay ids for each layer
export type SelectedOverlays = LayerData<string>;

// available overlay configs for each layer
export type OverlaysConfig = LayerData<OverlayConfig>;

// which overlays to show
export type OverlayConfig = {|
  layerId: string,
  overlays: Array<Overlay>,
  defaultOverlayId?: string,
  legend: {},
|};

export type OverlayComponentProps = {|
  overlay: Overlay,
|};

export type Overlay = {|
  name: string,
  type: string,
  id: string,
  metrics?: Array<string>,
  range?: Array<number>,
  colorRange?: Array<string>,
  units?: string,
  bounds?: Array<number>,
  overlayLegendType?: string,
  aggregate?: any => number,
  formatText?: (link: any, value: any) => string,
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
  selectedTime: Date,
  historicalData: ?{},
  testExecutionData: ?{results: {}, type: $Values<typeof TopologyElementType>},
  scanLinkData: ?{},
  temporaryTopology?: ?TemporaryTopologyType,
  temporarySelectedAsset?: ?Element,
  overlayData: LayerData<{}>,
  mapMode: string,
}>;
