/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import {LinkTypeValueMap} from '../../../shared/types/Topology';
import type {LocationType, NodeType} from '../../../shared/types/Topology';

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
  linkNode2: string,
  link_type: $Values<typeof LinkTypeValueMap>,
|};

export type NearbyNodes = {
  [string]: Array<TopologyScanInfo>,
};

export type PlannedSite = {
  name: string,
  ...$Shape<LocationType>,
};

export type PlannedSiteProps = {
  plannedSite: ?$Shape<PlannedSite>,
  onUpdatePlannedSite: (site: ?$Shape<PlannedSite>) => void,
  hideSite: string => void,
  unhideSite: string => void,
};
