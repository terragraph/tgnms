/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import type {RemoteOverlay} from './RemoteOverlay';

export type McsLinkBudget = {|
  mcs: number,
  rate: string,
  rangeMeters: number,
  sensitivityDbm: number,
  throughputGbps: number,
|};

/**
 * Deserialized from map_profile json
 */
export type MapProfileData = {|
  mcsTable: ?Array<McsLinkBudget>,
  remoteOverlays: ?Array<RemoteOverlay>,
|};

export type MapProfile = {|
  id: number,
  name: string,
  data: MapProfileData,
  networks: Array<string>,
|};
