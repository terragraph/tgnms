/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
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
