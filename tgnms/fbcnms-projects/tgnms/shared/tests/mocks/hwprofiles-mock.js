/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import type {
  HardwareProfile,
  HardwareProfiles,
} from '@fbcnms/tg-nms/shared/dto/HardwareProfiles';

export function mockHardwareProfiles(): HardwareProfiles {
  return {
    default: mockHardwareProfile(),
  };
}

export function mockHardwareProfile(
  overrides?: $Shape<HardwareProfile>,
): HardwareProfile {
  return {
    version: 1,
    hwBoardId: 'default',
    tx_power_map: {
      default_channel: {
        default_mcs: {
          '0': 19,
          '31': 45.0,
        },
      },
    },
    beam_angle_map: {
      '0': {
        '0': {
          '0': -45,
          '119': 44.25,
        },
      },
    },
    topology: {
      max_nodes_per_site: 1,
      num_sectors_per_box: 4,
      device_types: ['CN', 'DN'],
    },
    sector_params: {
      boresite_bw_idx: 10,
      minimum_snr_db: -10,
      snr_saturate_thresh_db: 25,
      beam_separate_idx: 6,
      max_sidelobe_level_db: 12,
      scan_range_az_deg: 70,
      antenna_boresight_gain_dbi: 0,
      max_tx_power_dbm: 41,
      min_tx_power_dbm: 40,
      min_mcs: 1,
      tx_diversity_gain_db: 0,
      rx_diversity_gain_db: 30,
      tx_misc_loss_db: 15,
      rx_misc_loss_db: 3,
    },
    financial: {
      node_capex: 0,
    },
    ...(overrides ?? {}: $Shape<HardwareProfile>),
  };
}
