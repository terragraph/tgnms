/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import type {
  MapProfile,
  McsLinkBudget,
} from '@fbcnms/tg-nms/shared/dto/MapProfile';
const DUPE_RANGE_OFFSET = 10;

export const DEFAULT_MCS_TABLE: Array<McsLinkBudget> = [
  {
    mcs: 1,
    rate: 'BPSK',
    throughputGbps: 0.3,
    rangeMeters: 287,
    sensitivityDbm: -75,
  },
  {
    mcs: 2,
    rate: 'BPSK',
    throughputGbps: 0.6,
    rangeMeters: 258,
    sensitivityDbm: -73,
  },
  {
    mcs: 3,
    rate: 'BPSK',
    throughputGbps: 0.8,
    rangeMeters: 244,
    sensitivityDbm: -72,
  },
  {
    mcs: 4,
    rate: 'BPSK',
    throughputGbps: 0.9,
    rangeMeters: 231,
    sensitivityDbm: -71,
  },
  {
    mcs: 5,
    rate: 'BPSK',
    throughputGbps: 1.0,
    rangeMeters: 205,
    sensitivityDbm: -69,
  },
  {
    mcs: 6,
    rate: 'QPSK',
    throughputGbps: 1.3,
    // TODO: better visually distinguish 6 from 4
    rangeMeters: 231 - DUPE_RANGE_OFFSET,
    sensitivityDbm: -71,
  },
  {
    mcs: 7,
    rate: 'QPSK',
    throughputGbps: 1.6,
    // TODO: better visually distinguish 7 from 5
    rangeMeters: 205 - DUPE_RANGE_OFFSET,
    sensitivityDbm: -69,
  },
  {
    mcs: 8,
    rate: 'QPSK',
    throughputGbps: 1.9,
    rangeMeters: 192,
    sensitivityDbm: -68,
  },
  {
    mcs: 9,
    rate: 'QPSK',
    throughputGbps: 2.1,
    rangeMeters: 180,
    sensitivityDbm: -67,
  },
  {
    mcs: 10,
    rate: '16QAM',
    throughputGbps: 2.6,
    rangeMeters: 147,
    sensitivityDbm: -65,
  },
  {
    mcs: 11,
    rate: '16QAM',
    throughputGbps: 3.2,
    rangeMeters: 127,
    sensitivityDbm: -63,
  },
  {
    mcs: 12,
    rate: '16QAM',
    throughputGbps: 3.9,
    rangeMeters: 109,
    sensitivityDbm: -61,
  },
];

export const DEFAULT_MAP_PROFILE: $Shape<MapProfile> = {
  name: 'Default',
  data: {
    mcsTable: [...DEFAULT_MCS_TABLE],
    remoteOverlays: [],
  },
  networks: [],
};
