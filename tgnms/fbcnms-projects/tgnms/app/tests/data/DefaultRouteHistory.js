/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import type {
  DefaultRouteHistoryData,
  DefaultRouteUtilType,
} from '../../apiutils/DefaultRouteHistoryAPIUtil';
import type {NodeMap} from '../../contexts/NetworkContext';

export function testDefaultRouteHistory(): {
  history: Array<DefaultRouteHistoryData>,
  utils: Array<DefaultRouteUtilType>,
} {
  return {
    history: [
      {
        last_updated: '2020-02-20T16:16:32',
        routes: [['11M96.1', '11M870.2', '11M870.1']],
        max_hop_count: 3,
      },
      {
        last_updated: '2020-02-20T16:17:32',
        routes: [['11M96.1', '11M870.2', '11M870.1', '11M867.2']],
        max_hop_count: 4,
      },
      {
        last_updated: '2020-02-20T16:17:52',
        routes: [['11M96.1', '11M870.2', '11M870.1']],
        max_hop_count: 3,
      },
      {
        last_updated: '2020-02-20T16:18:32',
        routes: [['11M96.1', '11M870.2', '11M870.1', '11M867.2', '11M867.1']],
        max_hop_count: 5,
      },
    ],
    utils: [
      {
        routes: [['11M96.1', '11M870.2', '11M870.1']],
        percentage: 90.271,
      },
      {
        routes: [['11M96.1', '11M870.2', '11M870.1', '11M867.2']],
        percentage: 0.139,
      },
      {
        routes: [['11M96.1', '11M870.2', '11M870.1', '11M867.2', '11M867.1']],
        percentage: 9.59,
      },
    ],
  };
}

export function expectedOnUpdateRouteCall(): {
  links: {},
  node: string,
  nodes: Set<string>,
} {
  return {
    links: {},
    node: 'test_node_name',
    nodes: new Set(['11M96.1', '11M870.2', '11M870.1', '11M867.2']),
  };
}

export function testNodeMap(): NodeMap {
  return {
    '11M96.1': {
      name: 'terra314.f1.tg.a404-if',
      node_type: 2,
      is_primary: false,
      mac_addr: '38:3a:21:b0:08:11',
      pop_node: false,
      status: 3,
      wlan_mac_addrs: ['38:3a:21:b0:08:11'],
      site_name: '12L212',
      ant_azimuth: 0,
      ant_elevation: 0,
    },
    '11M870.2': {
      name: 'terra314.f1.tg.a404-if',
      node_type: 2,
      is_primary: false,
      mac_addr: '38:3a:21:b0:08:11',
      pop_node: false,
      status: 3,
      wlan_mac_addrs: ['38:3a:21:b0:08:11'],
      site_name: '12L212',
      ant_azimuth: 0,
      ant_elevation: 0,
    },
    '11M870.1': {
      name: 'terra314.f1.tg.a404-if',
      node_type: 2,
      is_primary: false,
      mac_addr: '38:3a:21:b0:08:11',
      pop_node: false,
      status: 3,
      wlan_mac_addrs: ['38:3a:21:b0:08:11'],
      site_name: '12L212',
      ant_azimuth: 0,
      ant_elevation: 0,
    },
    '11M867.2': {
      name: 'terra314.f1.tg.a404-if',
      node_type: 2,
      is_primary: false,
      mac_addr: '38:3a:21:b0:08:11',
      pop_node: false,
      status: 3,
      wlan_mac_addrs: ['38:3a:21:b0:08:11'],
      site_name: '12L212',
      ant_azimuth: 0,
      ant_elevation: 0,
    },
    '11M867.1': {
      name: 'terra314.f1.tg.a404-if',
      node_type: 2,
      is_primary: false,
      mac_addr: '38:3a:21:b0:08:11',
      pop_node: false,
      status: 3,
      wlan_mac_addrs: ['38:3a:21:b0:08:11'],
      site_name: '12L212',
      ant_azimuth: 0,
      ant_elevation: 0,
    },
    'terra111.f5.tg.a404-if': {
      name: 'terra111.f5.tg.a404-if',
      node_type: 2,
      is_primary: true,
      mac_addr: '38:3a:21:b0:01:c5',
      pop_node: true,
      status: 3,
      wlan_mac_addrs: ['38:3a:21:b0:01:c5'],
      site_name: 'CC-SE',
      ant_azimuth: 0,
      ant_elevation: 0,
    },
    'terra413.f7.tg.a404-if': {
      name: 'terra413.f7.tg.a404-if',
      node_type: 2,
      is_primary: false,
      mac_addr: '38:3a:21:b0:09:f5',
      pop_node: true,
      status: 3,
      wlan_mac_addrs: ['38:3a:21:b0:09:f5'],
      site_name: 'CHALL-WING-NW',
      ant_azimuth: 0,
      ant_elevation: 0,
    },
    'terra123.f1.tg.a404-if': {
      name: 'terra123.f1.tg.a404-if',
      node_type: 2,
      is_primary: false,
      mac_addr: '38:3a:21:b0:08:e3',
      pop_node: true,
      status: 3,
      wlan_mac_addrs: ['38:3a:21:b0:08:e3'],
      site_name: 'CC-N-CENT',
      ant_azimuth: 0,
      ant_elevation: 0,
    },
  };
}
