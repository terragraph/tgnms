/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

export type HardwareProfiles = {|
  [hwboardId: string]: HardwareProfile,
|};

export type HardwareProfile = {|
  version: number,
  hwBoardId: string,
  tx_power_map: {|
    [channel: string]: {|[mcs: string]: {|[index: string]: number|}|},
  |},
  beam_angle_map: {|
    [tileId: string]: {|[elevationId: string]: {|[index: string]: number|}|},
  |},
|};
