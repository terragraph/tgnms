/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
import * as React from 'react';
import type {NetworkContextType} from '../../NetworkContext';

export type MapLayerConfig = {
  layerId: string,
  name: string,
  render: NetworkContextType => React.Node,
};

export type SelectedOverlays = {
  link_lines: string,
  site_icons: string,
};

export type OverlaysConfig = {
  link_lines: OverlayConfig,
  site_icons: OverlayConfig,
};

export type OverlayConfig = {|
  layerId: string,
  overlays: Array<Overlay>,
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

export type SelectedLayersType = {
  site_icons: boolean,
  link_lines: boolean,
  site_name_popups: boolean,
  buildings_3d: boolean,
};

export type ChangeOverlayRange = {
  (id: string, newRange: Array<number>): void,
};
