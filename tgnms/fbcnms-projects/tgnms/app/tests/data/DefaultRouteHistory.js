/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import type {NodeMap} from '../../NetworkContext';

export function testDefaultRouteHistory(): {[string]: Array<Array<string>>} {
  return {
    '2019-11-18 21:50:24': [],
    '2019-11-18 21:50:57': [
      [
        'terra213.f5.tg.a404-if',
        'terra413.f7.tg.a404-if',
        'terra411.f7.tg.a404-if',
      ],
      [
        'terra213.f5.tg.a404-if',
        'terra413.f7.tg.a404-if',
        'terra121.f1.tg.a404-if',
      ],
      [
        'terra213.f5.tg.a404-if',
        'terra413.f7.tg.a404-if',
        'terra111.f5.tg.a404-if',
      ],
    ],
    '2019-11-18 21:52:00': [
      [
        'terra213.f5.tg.a404-if',
        'terra413.f7.tg.a404-if',
        'terra411.f7.tg.a404-if',
      ],
    ],
    '2019-11-18 22:01:04': [
      [
        'terra213.f5.tg.a404-if',
        'terra413.f5.tg.a404-if',
        'terra221.f1.tg.a404-if',
        'terra222.f1.tg.a404-if',
        'terra121.f1.tg.a404-if',
      ],
    ],
    '2019-11-18 22:01:36': [
      [
        'terra213.f5.tg.a404-if',
        'terra413.f7.tg.a404-if',
        'terra411.f7.tg.a404-if',
      ],
    ],
    '2019-11-18 22:03:13': [
      [
        'terra213.f5.tg.a404-if',
        'terra413.f5.tg.a404-if',
        'terra123.f1.tg.a404-if',
        'terra121.f1.tg.a404-if',
      ],
      [
        'terra213.f5.tg.a404-if',
        'terra413.f5.tg.a404-if',
        'terra123.f1.tg.a404-if',
        'terra111.f5.tg.a404-if',
      ],
    ],
    '2019-11-18 22:04:16': [
      [
        'terra213.f5.tg.a404-if',
        'terra413.f7.tg.a404-if',
        'terra411.f7.tg.a404-if',
      ],
    ],
    '2019-11-18 22:05:20': [
      [
        'terra213.f5.tg.a404-if',
        'terra413.f7.tg.a404-if',
        'terra411.f7.tg.a404-if',
      ],
    ],
    '2019-11-18 22:06:56': [
      [
        'terra213.f5.tg.a404-if',
        'terra413.f7.tg.a404-if',
        'terra411.f7.tg.a404-if',
      ],
    ],
    '2019-11-18 22:17:04': [],
    '2019-11-18 22:18:40': [
      [
        'terra213.f5.tg.a404-if',
        'terra413.f7.tg.a404-if',
        'terra411.f7.tg.a404-if',
      ],
      [
        'terra213.f5.tg.a404-if',
        'terra413.f7.tg.a404-if',
        'terra121.f1.tg.a404-if',
      ],
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
    nodes: new Set([
      'terra213.f5.tg.a404-if',
      'terra413.f5.tg.a404-if',
      'terra221.f1.tg.a404-if',
      'terra222.f1.tg.a404-if',
      'terra121.f1.tg.a404-if',
    ]),
  };
}
export function testNodeMap(): NodeMap {
  return {
    'terra221.f1.tg.a404-if': {
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
    'terra121.f1.tg.a404-if': {
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
    'terra222.f1.tg.a404-if': {
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
    'terra413.f5.tg.a404-if': {
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
    'terra213.f5.tg.a404-if': {
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
    'terra411.f7.tg.a404-if': {
      name: 'terra411.f7.tg.a404-if',
      node_type: 2,
      is_primary: true,
      mac_addr: '38:3a:21:b0:02:ac',
      pop_node: true,
      status: 3,
      wlan_mac_addrs: ['38:3a:21:b0:02:ac'],
      site_name: 'CHALL-WING-NW',
      ant_azimuth: 0,
      ant_elevation: 0,
    },
    'terra113.f5.tg.a404-if': {
      name: 'terra113.f5.tg.a404-if',
      node_type: 2,
      is_primary: false,
      mac_addr: '38:3a:21:b0:0a:13',
      pop_node: true,
      status: 3,
      wlan_mac_addrs: ['38:3a:21:b0:0a:13'],
      site_name: 'CC-SE',
      ant_azimuth: 0,
      ant_elevation: 0,
    },
    'terra121.f1.tg.a404-if': {
      name: 'terra121.f1.tg.a404-if',
      node_type: 2,
      is_primary: true,
      mac_addr: '38:3a:21:b0:02:61',
      pop_node: true,
      status: 3,
      wlan_mac_addrs: ['38:3a:21:b0:02:61'],
      site_name: 'CC-N-CENT',
      ant_azimuth: 0,
      ant_elevation: 0,
    },
    'terra223.f1.tg.a404-if': {
      name: 'terra223.f1.tg.a404-if',
      node_type: 2,
      is_primary: false,
      mac_addr: '38:3a:21:b0:09:77',
      pop_node: false,
      status: 3,
      wlan_mac_addrs: ['38:3a:21:b0:09:77'],
      site_name: 'TECH-NW',
      ant_azimuth: 0,
      ant_elevation: 0,
    },
    'terra314.f1.tg.a404-if': {
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
    'terra114.f5.tg.a404-if': {
      name: 'terra114.f5.tg.a404-if',
      node_type: 2,
      is_primary: false,
      mac_addr: '38:3a:21:b0:09:e1',
      pop_node: true,
      status: 3,
      wlan_mac_addrs: ['38:3a:21:b0:09:e1'],
      site_name: 'CC-SE',
      ant_azimuth: 0,
      ant_elevation: 0,
    },
    'terra412.f7.tg.a404-if': {
      name: 'terra412.f7.tg.a404-if',
      node_type: 2,
      is_primary: false,
      mac_addr: '38:3a:21:b0:09:17',
      pop_node: true,
      status: 3,
      wlan_mac_addrs: ['38:3a:21:b0:09:17'],
      site_name: 'CHALL-WING-NW',
      ant_azimuth: 0,
      ant_elevation: 0,
    },
  };
}
