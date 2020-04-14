/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
import * as React from 'react';
import type {NetworkContextType} from '../../contexts/NetworkContext';

export type MapLayerConfig = {
  layerId: string,
  name: string,
  render: NetworkContextType => React.Node,
};

export type LayerData<T> = $Shape<{|
  link_lines: T,
  site_icons: T,
  site_name_popups: T,
  buildings_3d: T,
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
  changeOverlayRange?: ChangeOverlayRange,
  legend: {},
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
|};

export type SelectedLayersType = LayerData<boolean>;

export type ChangeOverlayRange = {
  (id: string, newRange: Array<number>): void,
};

export type NetworkMapOptions = $Shape<{
  selectedLayers: SelectedLayersType,
  selectedOverlays: SelectedOverlays,
  historicalDate: Date,
  selectedTime: Date,
  historicalData: ?{},
  overlayData: LayerData<{}>,
  mapMode: string,
}>;
