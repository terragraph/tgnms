/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
import * as React from 'react';
import type {ChangeOverlayRange, Overlay} from './overlays';
import type {Location, NetworkContextType} from '../../NetworkContext';
import type {NodeType} from '../../../shared/types/Topology';

export type PlannedSite = {
  name: string,
  ...$Shape<Location>,
};

export type Routes = {|
  node: ?NodeType,
  links: {[string]: number},
  nodes: Set<NodeType>,
  onUpdateRoutes: ($Shape<Routes>) => {},
  routes: {
    node: string,
  },
|};

export type NearbyNodes = {
  [string]: Array<TopologyScanInfo>,
};

export type TopologyScanInfo = {
  bestSnr: number,
  responderInfo: {
    pos: Location,
    addr: string,
  },
};

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
