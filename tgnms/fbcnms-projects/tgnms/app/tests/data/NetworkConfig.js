/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import type {NetworkConfig} from '../../NetworkContext';

// big giant mock network config to make flow happy
export function mockNetworkConfig(
  overrides?: $Shape<NetworkConfig>,
): $Shape<NetworkConfig> {
  const mockCtrl = {
    api_ip: '::',
    api_port: 8080,
    controller_online: true,
    e2e_port: 8080,
    id: 1,
  };

  const mockLocation = {
    accuracy: 0,
    altitude: 0,
    latitude: 0,
    longitude: 0,
  };

  const config: $Shape<NetworkConfig> = {
    controller_online: true,
    controller_version: '',
    id: 1,
    high_availability: {
      primary: {
        peerExpiry: 1000,
        state: 0,
      },
      backup: {
        peerExpiry: 1000,
        state: 0,
      },
    },
    ignition_state: {
      igCandidates: [],
      igParams: {
        enable: true,
        linkAutoIgnite: {},
        linkUpDampenInterval: 0,
        linkUpInterval: 0,
      },
      lastIgCandidates: [],
    },
    backup: mockCtrl,
    primary: mockCtrl,
    query_service_online: true,
    site_overrides: {
      name: '',
      location: mockLocation,
    },
    status_dump: {
      statusReports: {},
      timeStamp: 0,
    },
    upgrade_state: {
      curBatch: [],
      pendingBatches: [],
      curReq: {
        ugType: 'NODES',
        nodes: [],
        excludeNodes: [],
        urReq: {
          urType: 'PREPARE_UPGRADE',
          upgradeReqId: '',
          md5: '',
          imageUrl: '',
          scheduleToCommit: 0,
          downloadAttempts: 0,
          torrentParams: {
            downloadTimeout: 0,
          },
        },
        timeout: 0,
        skipFailure: true,
        version: '',
        skipLinks: [],
        limit: 0,
        retryLimit: 0,
      },
      pendingReqs: [],
    },
    topology: {
      name: '',
      nodes: [],
      links: [],
      sites: [],
      config: {channel: 0},
    },
    offline_whitelist: {
      links: new Map(),
      nodes: new Map(),
    },
    wireless_controller: {
      id: 0,
      type: 'ruckus',
      url: 'http://wirelesscontroller',
      username: 'test',
      password: '12345',
    },
    wireless_controller_stats: {},
    controller_error: null,
  };
  if (typeof overrides === 'object') {
    Object.assign(config, overrides);
  }
  return config;
}
