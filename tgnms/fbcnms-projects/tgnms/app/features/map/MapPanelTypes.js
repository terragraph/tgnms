/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow strict-local
 */

import {LinkTypeValueMap} from '@fbcnms/tg-nms/shared/types/Topology';
import type {
  LocationType,
  NodeType,
} from '@fbcnms/tg-nms/shared/types/Topology';

/*
 * Parameters passed to AddNodePanel. Used for creating/editing nodes.
 */
export type EditNodeParams = {
  ...$Shape<NodeType>,
  txGolayIdx?: ?number,
  rxGolayIdx?: ?number,
  wlan_mac_addrs?: ?string,
};

export type EditLinkParams = {|
  linkNode1: string,
  linkNode1Mac: string,
  linkNode2: string,
  linkNode2Mac: string,
  link_type: $Values<typeof LinkTypeValueMap>,
|};

export type TopologyScanInfo = {
  bestSnr: number,
  responderInfo: {
    pos: LocationType,
    addr: string,
    adjs?: Array<string>,
  },
  bestTxAngle?: number,
  bestRxAngle?: number,
};

export type PlannedSite = {
  name: string,
  ...$Shape<LocationType>,
};

export type SiteProps = {
  hideSite: string => void,
  unhideSite: string => void,
};

/*
 * Topology scan types.
 */
export type TopologyScanRespoonsePerRadio = {
  [radioMac: string]: TopologyScanInfo,
};

export type TopologyScanResponse = {
  [responderMac: string]: TopologyScanRespoonsePerRadio,
};

export type TopologyScanByNodeMac = {
  [nodeMac: string]: TopologyScanResponse,
};

export type NearbyNodes = {
  [nodeName: string]: TopologyScanByNodeMac,
};
