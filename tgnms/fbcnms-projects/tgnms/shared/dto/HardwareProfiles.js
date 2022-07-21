/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
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
  topology: {
    max_nodes_per_site: number,
    num_sectors_per_box: number,
    device_types: Array<'CN' | 'DN'>,
  },
  sector_params: SectorParams,
  financial: Financial,
|};

export type Financial = {|
  node_capex: number,
|};

export type SectorParams = {|
  boresite_bw_idx: number,
  minimum_snr_db: number,
  snr_saturate_thresh_db: number,
  beam_separate_idx: number,
  max_sidelobe_level_db: number,
  scan_range_az_deg: number,
  antenna_boresight_gain_dbi: number,
  max_tx_power_dbm: number,
  min_tx_power_dbm: number,
  min_mcs: number,
  tx_diversity_gain_db: number,
  rx_diversity_gain_db: number,
  tx_misc_loss_db: number,
  rx_misc_loss_db: number,
|};
