/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 */

import type {TopologyHistoryResultsType} from '@fbcnms/tg-nms/shared/dto/TopologyHistoryTypes';

export function mockTopologyResults(
  overrides?: Array<TopologyHistoryResultsType>,
): {topologies: Array<TopologyHistoryResultsType>} {
  return {
    topologies: [
      {
        topology: {
          name: 'puma_e2e_dryrun',
          links: [
            {
              name: 'link-3-4',
              link_type: 1,
              a_node_mac: '04:ce:14:fe:a7:27',
              z_node_mac: '04:ce:14:fc:b8:fa',
              a_node_name: '3',
              z_node_name: '4',
            },
          ],
          nodes: [
            {
              name: '3',
              mac_addr: '34:ef:b6:45:f9:96',
              pop_node: false,
              node_type: 2,
              site_name: '11-1',
              ant_azimuth: 39,
              ant_elevation: 0,
              wlan_mac_addrs: [
                '04:ce:14:fe:a0:1f',
                '04:ce:14:fe:a7:27',
                '04:ce:14:fe:a7:54',
                '04:ce:14:fe:a7:31',
              ],
            },
            {
              name: '4',
              mac_addr: '34:ef:b6:ed:0d:82',
              pop_node: false,
              node_type: 2,
              site_name: '11-2',
              ant_azimuth: 0,
              ant_elevation: 0,
              wlan_mac_addrs: [
                '04:ce:14:fc:b8:03',
                '04:ce:14:fc:b9:44',
                '04:ce:14:fc:b8:22',
                '04:ce:14:fc:b8:fa',
              ],
            },
          ],
          sites: [
            {
              name: '11-1',
              location: {
                accuracy: 24.7,
                altitude: -3.62,
                latitude: 37.483421667,
                longitude: -122.148181667,
              },
            },
            {
              name: '11-2',
              location: {
                accuracy: 20.9,
                altitude: 15.22,
                latitude: 37.484993333,
                longitude: -122.148415,
              },
            },
          ],
        },
        last_updated: '2021-07-28T20:24:14',
      },
      {
        topology: {
          name: 'puma_e2e_dryrun',
          links: [
            {
              name: 'link-1-2',
              link_type: 1,
              a_node_mac: '04:ce:14:fe:a0:1f',
              z_node_mac: '04:ce:14:fc:b8:03',
              a_node_name: '1',
              z_node_name: '2',
            },
          ],
          nodes: [
            {
              name: '1',
              mac_addr: '34:ef:b6:45:f9:96',
              pop_node: false,
              node_type: 2,
              site_name: '11-1',
              ant_azimuth: 39,
              ant_elevation: 0,
              wlan_mac_addrs: [
                '04:ce:14:fe:a0:1f',
                '04:ce:14:fe:a7:27',
                '04:ce:14:fe:a7:54',
                '04:ce:14:fe:a7:31',
              ],
            },
            {
              name: '2',
              mac_addr: '34:ef:b6:ed:0d:82',
              pop_node: false,
              node_type: 2,
              site_name: '11-2',
              ant_azimuth: 0,
              ant_elevation: 0,
              wlan_mac_addrs: [
                '04:ce:14:fc:b8:03',
                '04:ce:14:fc:b9:44',
                '04:ce:14:fc:b8:22',
                '04:ce:14:fc:b8:fa',
              ],
            },
          ],
          sites: [
            {
              name: '11-1',
              location: {
                accuracy: 24.7,
                altitude: -3.62,
                latitude: 37.483421667,
                longitude: -122.148181667,
              },
            },
            {
              name: '11-2',
              location: {
                accuracy: 20.9,
                altitude: 15.22,
                latitude: 37.484993333,
                longitude: -122.148415,
              },
            },
          ],
        },
        last_updated: '2021-07-28T20:34:14',
      },
      ...(overrides ? overrides : []),
    ],
  };
}
