/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import 'jest-dom/extend-expect';
import {
  LinkTypeValueMap,
  NodeStatusTypeValueMap,
  NodeTypeValueMap,
} from '../../../shared/types/Topology';
import type {
  LinkType,
  NodeType,
  SiteType,
  TopologyType,
} from '../../../shared/types/Topology';

import type {NetworkConfig} from '../../contexts/NetworkContext';
import type {
  NetworkHealth,
  NetworkInstanceConfig,
  TopologyConfig,
} from '../../../shared/dto/NetworkState';
import type {Props as NodeDetailsProps} from '../../components/mappanels/NodeDetailsPanel/NodeDetails';
import type {Overlay} from '../../views/map/NetworkMapTypes';
import type {RoutesContext as Routes} from '../../contexts/RouteContext';

export function mockNetworkInstanceConfig(): NetworkInstanceConfig {
  const mockCtrl = {
    api_ip: '::',
    api_port: 8080,
    controller_online: true,
    e2e_port: 8080,
    id: 1,
  };
  return {
    id: 1,
    name: 'test',
    controller_online: true,
    backup: mockCtrl,
    primary: mockCtrl,
    site_overrides: [],
    offline_whitelist: {
      links: {},
      nodes: {},
    },
    map_profile: null,
    wireless_controller: null,
  };
}
/**
 * Creates a fake network config which passes flow validation
 * @param {object} overrides overrides default properties of the network config
 */
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
    prometheus_online: true,
    site_overrides: [
      {
        name: '',
        location: mockLocation,
      },
    ],
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
    topology: mockTopology(),
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
    topologyConfig: ({}: $Shape<TopologyConfig>),
  };

  return Object.assign(config, overrides || {});
}

export type TopologyTestHelpers = {
  addNode: ($Shape<NodeType>) => TopologyTestHelpers,
  addSite: ($Shape<SiteType>) => TopologyTestHelpers,
  addLink: ($Shape<LinkType>) => TopologyTestHelpers,
};

/**
 * Creates a fake empty topology which passes flow validation
 * @param {object} overrides overrides default properties of the mock topology
 * @example
 * mockTopology({name:'Tower Q', links: [mockLink(), mockLink()]})
 */
export function mockTopology(
  overrides?: $Shape<TopologyType>,
): TopologyType & {__test: TopologyTestHelpers} {
  const site_set = new Map<string, SiteType>();
  const node_set = new Map<string, NodeType>();
  const link_set = new Map<string, LinkType>();

  const topology = Object.assign(
    {
      name: '',
      nodes: [],
      links: [],
      sites: [],
      config: {channel: 0},
    },
    overrides || {},
  );

  const helpers: TopologyTestHelpers = {
    addSite: function (siteDef: $Shape<SiteType>) {
      if (site_set.has(siteDef.name)) {
        throw new Error('Duplicate site');
      }
      const site = {
        ...{location: {latitude: 0, longitude: 0, accuracy: 1, altitude: 1}},
        ...siteDef,
      };
      site_set.set(site.name, site);
      topology.sites.push(site);
      return helpers;
    },
    addNode: function (nodeDef: $Shape<NodeType>) {
      const node = mockNode(nodeDef);
      if (node_set.has(node.name)) {
        throw new Error('Duplicate node');
      }

      // if site_name is provided, and the site does not exist, create it.
      if (node.site_name && !site_set.has(node.site_name)) {
        helpers.addSite({name: node.site_name});
      }

      node_set.set(node.name, node);
      topology.nodes.push(node);

      return helpers;
    },
    addLink: function (linkDef: $Shape<LinkType>) {
      // if no name is provided, generate one
      if (!linkDef.name) {
        linkDef.name = `link-${linkDef.a_node_name}-${linkDef.z_node_name}`;
      }
      const link = mockLink(linkDef);
      if (link_set.has(link.name)) {
        throw new Error('Duplicate link');
      }
      link_set.set(link.name, link);
      topology.links.push(link);
      return helpers;
    },
  };

  return {
    ...topology,
    __test: helpers,
  };
}

/**
 * Creates a fake wireless link which passes flow validation
 * @param {object} overrides overrides default properties of the mock link
 * @example
 * mockLink({name:'link-node-a-z', is_alive:false})
 */
export function mockLink(overrides?: $Shape<LinkType>): $Shape<LinkType> {
  return {
    name: '',
    a_node_name: '',
    z_node_name: '',
    link_type: LinkTypeValueMap.WIRELESS,
    is_alive: true,
    linkup_attempts: 0,
    golay_idx: {
      txGolayIdx: 0,
      rxGolayIdx: 0,
    },
    control_superframe: 0,
    a_node_mac: 'aa:aa:aa:aa:aa',
    z_node_mac: 'bb:bb:bb:bb:bb',
    is_backup_cn_link: false,
    ...overrides,
  };
}

/**
 * Creates a fake node which passes flow validation
 * @param {object} overrides overrides default properties of the mock node
 * @example
 * mockNode({name:'terra322.f7.tg.a404-if', site_name:'11L922'})
 */
export function mockNode(overrides?: $Shape<NodeType>): NodeType {
  return {
    name: '',
    node_type: NodeTypeValueMap.DN,
    is_primary: true,
    mac_addr: '',
    pop_node: false,
    status: NodeStatusTypeValueMap.OFFLINE,
    site_name: '',
    ant_azimuth: 0,
    ant_elevation: 0,
    wlan_mac_addrs: [],
    ...overrides,
  };
}

/**
 * Creates a fake series of node details which passes flow validation
 * @param {object} overrides overrides default properties of mock node details
 * @example
 * mockNodeDetails(
 *   node: mockNode({name:'terra322.f7.tg.a404-if'}),
 *   ctrlVersion:'M45-0-gb016fc33f',
 * )
 */
export function mockNodeDetails(
  overrides?: $Shape<NodeDetailsProps>,
): NodeDetailsProps {
  return {
    node: mockNode({name: 'NODEA'}),
    networkNodeHealth: {startTime: 0, endTime: 0, events: {}},
    networkConfig: mockNetworkConfig(),
    topology: mockTopology(),
    ctrlVersion: '',
    onSelectLink: () => {},
    onSelectSite: () => {},
    ...overrides,
  };
}

/**
 * Creates a fake network health which passes flow validation
 * @param {object} overrides overrides default properties of mock network health
 * @example
 * mockNetworkHealth({startTime:1547502301, endTime:1579038301})
 */
export function mockNetworkHealth(
  overrides?: $Shape<NetworkHealth>,
): NetworkHealth {
  return {
    startTime: 0,
    endTime: 0,
    events: {},
    ...overrides,
  };
}

/**
 * Creates a fake routes that passes flow validation
 * @param {object} overrides overrides default properties of mock routes
 * @example
 * mockRoutes({node: 'testNode'})
 */
export function mockRoutes(overrides?: $Shape<Routes>): Routes {
  return {
    node: null,
    links: {},
    nodes: new Set(),
    onUpdateRoutes: () => {},
    resetRoutes: () => {},
    ...overrides,
  };
}

/**
 * Creates a fake Overlay that passes flow validation
 * @param {object} overrides overrides default properties of mock Overlay
 * @example
 * mockOverlay({name: 'testOverlay'})
 */

// colors get converted into rgb codes by d3
export const COLOR_BLUE = 'rgb(0, 0, 255)';
export const COLOR_YELLOW = 'rgb(255, 255, 0)';
export const COLOR_RED = 'rgb(255, 0, 0)';

export function mockOverlay(overrides?: $Shape<Overlay>): Overlay {
  return {
    name: 'mock overlay',
    id: 'mock',
    type: 'metric',
    range: [0, 1, 2],
    colorRange: [COLOR_BLUE, COLOR_YELLOW, COLOR_RED],
    ...overrides,
  };
}

/**
 * Creates a mock figure 0 like:
 * (site2)---(site3)
 *    |         |
 *    |         |
 * (site1)---(site4)
 */
export function mockFig0() {
  const topology = mockTopology();
  topology.__test
    .addSite({
      name: 'site1',
      location: {latitude: 0, longitude: 0, accuracy: 1, altitude: 1},
    })
    .addSite({
      name: 'site2',
      location: {latitude: 0, longitude: 1, accuracy: 1, altitude: 1},
    })
    .addSite({
      name: 'site3',
      location: {latitude: 1, longitude: 1, accuracy: 1, altitude: 1},
    })
    .addSite({
      name: 'site4',
      location: {latitude: 1, longitude: 0, accuracy: 1, altitude: 1},
    })
    .addNode({
      name: 'site1-0',
      site_name: 'site1',
    })
    .addNode({
      name: 'site1-1',
      site_name: 'site1',
    })
    .addNode({
      name: 'site2-0',
      site_name: 'site2',
    })
    .addNode({
      name: 'site2-1',
      site_name: 'site2',
    })
    .addNode({
      name: 'site3-0',
      site_name: 'site3',
    })
    .addNode({
      name: 'site3-1',
      site_name: 'site3',
    })
    .addNode({
      name: 'site4-0',
      site_name: 'site4',
    })
    .addNode({
      name: 'site4-1',
      site_name: 'site4',
    })
    .addLink({
      a_node_name: 'site1-1',
      z_node_name: 'site2-0',
    })
    .addLink({
      a_node_name: 'site2-1',
      z_node_name: 'site3-0',
    })
    .addLink({
      a_node_name: 'site3-1',
      z_node_name: 'site4-0',
    })
    .addLink({
      a_node_name: 'site4-1',
      z_node_name: 'site1-0',
    });
  return topology;
}

/**
 * Creates a mock topology like:
 * (site1)--(site2)--...--(siteN)
 */
export function mockMultiHop(hops: number, includesPop: boolean) {
  const topology = mockTopology();
  for (let i = 0; i < hops; i++) {
    topology.__test
      .addSite({
        name: 'site' + i,
        location: {latitude: i, longitude: 0, accuracy: 1, altitude: 1},
      })
      .addNode({
        name: 'node' + i,
        site_name: 'site' + i,
        pop_node: i === 0 && includesPop,
      });
    if (i > 0) {
      topology.__test.addLink({
        a_node_name: 'node' + (i - 1),
        z_node_name: 'node' + i,
      });
    }
  }
  return topology;
}
