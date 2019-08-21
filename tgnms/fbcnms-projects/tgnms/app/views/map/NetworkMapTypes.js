/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
import * as React from 'react';
import type {ChangeOverlayRange, Overlay} from './overlays';
import type {NetworkContextType} from '../../NetworkContext';

export type MapLayerConfig = {
  layerId: string,
  name: string,
  render: NetworkContextType => React.Node,
};

export type OverlayConfig<TLegend> = {
  layerId: string,
  overlays: Array<Overlay>,
  changeOverlayRange: ChangeOverlayRange,
  legend: TLegend,
};
