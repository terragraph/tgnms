/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import {
  DEFAULT_BASE_KEY,
  DEFAULT_FIRMWARE_BASE_KEY,
  DEFAULT_HARDWARE_BASE_KEY,
  FORM_CONFIG_MODES,
} from '@fbcnms/tg-nms/app/constants/ConfigConstants';
import {
  LinkTypeValueMap,
  NodeStatusTypeValueMap,
  NodeTypeValueMap,
} from '@fbcnms/tg-nms/shared/types/Topology';

import type {ConfigTaskContext} from '@fbcnms/tg-nms/app/contexts/ConfigTaskContext';
import type {IgnitionStateType} from '@fbcnms/tg-nms/shared/types/Controller';
import type {
  LinkType,
  NodeType,
  SiteType,
  TopologyType,
} from '@fbcnms/tg-nms/shared/types/Topology';
import type {NetworkConfig} from '@fbcnms/tg-nms/app/contexts/NetworkContext';
import type {
  NetworkHealth,
  NetworkInstanceConfig,
  TopologyConfig,
} from '@fbcnms/tg-nms/shared/dto/NetworkState';
import type {Props as NodeDetailsProps} from '@fbcnms/tg-nms/app/views/map/mappanels/NodeDetailsPanel/NodeDetails';
import type {Overlay} from '@fbcnms/tg-nms/app/features/map/NetworkMapTypes';
import type {RoutesContext as Routes} from '@fbcnms/tg-nms/app/contexts/RouteContext';
import type {StatusReportType} from '@fbcnms/tg-nms/shared/types/Controller';

export function mockNetworkInstanceConfig(
  overrides?: $Shape<NetworkInstanceConfig>,
): NetworkInstanceConfig {
  const mockCtrl = {
    api_ip: '::',
    api_port: 8080,
    controller_online: true,
    e2e_ip: '::',
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
    map_profile_id: null,
    wireless_controller: null,
    ...overrides,
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
    e2e_ip: '::',
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
    controller_version: 'RELEASE_M47',
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
      visitedNodeNames: [],
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
    topologyConfig: mockTopologyConfig(),
  };

  return Object.assign(config, overrides || {});
}

export type TopologyTestHelpers = {|
  addNode: ($Shape<NodeType>) => TopologyTestHelpers,
  addSite: ($Shape<SiteType>) => TopologyTestHelpers,
  addLink: ($Shape<LinkType>) => TopologyTestHelpers,
  updateLink: (name: string, update: $Shape<LinkType>) => void,
  updateSite: (name: string, update: $Shape<SiteType>) => void,
  updateNode: (name: string, update: $Shape<NodeType>) => void,
  getLink: (name: string) => ?LinkType,
  getNode: (name: string) => ?NodeType,
  getSite: (name: string) => ?SiteType,
|};

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
    updateLink: function (name: string, update: $Shape<LinkType>) {
      const link = link_set.get(name);
      if (link) {
        Object.assign(link, update);
      }
    },
    updateSite: function (name: string, update: $Shape<SiteType>) {
      const site = site_set.get(name);
      if (site) {
        Object.assign(site, update);
      }
    },
    updateNode: function (name: string, update: $Shape<NodeType>) {
      const node = node_set.get(name);
      if (node) {
        Object.assign(node, update);
      }
    },
    getLink: function (name: string): ?LinkType {
      return link_set.get(name);
    },
    getNode: function (name: string): ?NodeType {
      return node_set.get(name);
    },
    getSite: function (name: string): ?SiteType {
      return site_set.get(name);
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
    _meta_: {
      distance: 0,
      angle: 0,
    },
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
 * Creates a fake site which passes flow validation
 * @param {object} overrides overrides default properties of the mock site
 * @example
 * mockNode({name:'11L922'})
 */
export function mockSite(overrides?: $Shape<SiteType>): SiteType {
  return {
    name: '',
    location: {
      latitude: 1,
      longitude: 1,
      altitude: 10,
      accuracy: 100,
    },
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

export function mockIgnitionState(
  state: ?$Shape<IgnitionStateType>,
): IgnitionStateType {
  const igState: IgnitionStateType = {
    igCandidates: [],
    igParams: {
      enable: true,
      linkAutoIgnite: {},
      linkUpDampenInterval: 0,
      linkUpInterval: 0,
    },
    lastIgCandidates: [],
    visitedNodeNames: [],
    ...(state ?? {}: $Shape<IgnitionStateType>),
  };
  return igState;
}

export function mockConfigTaskContextValue(overrides?: {}): ConfigTaskContext {
  const configTaskContext: ConfigTaskContext = {
    configData: [
      {
        field: ['test', 'test2'],
        hasOverride: false,
        hasTopLevelOverride: false,
        layers: [{id: 'Base value', value: null}],
        metadata: {action: 'RESTART_SQUIRE', desc: 'test', type: 'STRING'},
      },
    ],
    configMetadata: {},
    configOverrides: {test: {overrides: 'hello'}},
    networkConfigOverride: {},
    configParams: {
      baseConfigs: {[DEFAULT_BASE_KEY]: '', test: ''},
      hardwareBaseConfigs: {[DEFAULT_HARDWARE_BASE_KEY]: ''},
      firmwareBaseConfigs: {[DEFAULT_FIRMWARE_BASE_KEY]: '', test: ''},
      networkOverridesConfig: {},
    },
    draftChanges: {test: {overrides: 'hello'}},
    selectedValues: {
      refreshConfig: false,
      nodeInfo: {},
      imageVersion: DEFAULT_BASE_KEY,
      firmwareVersion: DEFAULT_FIRMWARE_BASE_KEY,
      hardwareType: DEFAULT_HARDWARE_BASE_KEY,
    },
    editMode: FORM_CONFIG_MODES.NETWORK,
    onUpdate: () => {},
    onSubmit: () => {},
    onCancel: () => {},
    onSetJson: () => {},
    ...(overrides ?? {}: $Shape<ConfigTaskContext>),
  };
  return configTaskContext;
}

export function mockTopologyConfig(
  conf?: $Shape<TopologyConfig>,
): TopologyConfig {
  return {
    polarity: {},
    golay: {},
    controlSuperframe: {},
    channel: {},
    ...(conf ?? {}: $Shape<TopologyConfig>),
  };
}

export function mockOfflineWhitelist(
  topology: TopologyType,
): {links: {[string]: boolean}, nodes: {[string]: boolean}} {
  const offline_whitelist = {links: {}, nodes: {}};
  for (const l of topology.links) {
    offline_whitelist.links[l.name] = true;
  }
  for (const n of topology.nodes) {
    offline_whitelist.nodes[n.name] = true;
  }
  return offline_whitelist;
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

export function mockSingleLink() {
  const topology = mockTopology();
  topology.__test
    .addNode({
      name: 'node1',
      site_name: 'site1',
    })
    .addNode({
      name: 'node2',
      site_name: 'site2',
    })
    .addLink({
      a_node_name: 'node1',
      z_node_name: 'node2',
    });
  return topology;
}

export const FIG0 = {
  SITE1: 'site1',
  SITE2: 'site2',
  SITE3: 'site3',
  SITE4: 'site4',
  NODE1_0: 'site1-0',
  NODE1_1: 'site1-1',
  NODE2_0: 'site2-0',
  NODE2_1: 'site2-1',
  NODE3_0: 'site3-0',
  NODE3_1: 'site3-1',
  NODE4_0: 'site4-0',
  NODE4_1: 'site4-1',
  LINK1: 'link-site1-1-site2-0',
  LINK2: 'link-site2-1-site3-0',
  LINK3: 'link-site3-1-site4-0',
  LINK4: 'link-site4-1-site1-0',
};
/**
 * Creates a mock figure 0 like:
 * (site4)---(site3)
 *    |         |
 *    |         |
 * (site1)---(site2)
 */
export function mockFig0() {
  const topology = mockTopology();
  topology.__test
    .addSite({
      name: FIG0.SITE1,
      location: {latitude: 0, longitude: 0, accuracy: 1, altitude: 1},
    })
    .addSite({
      name: FIG0.SITE2,
      location: {latitude: 0, longitude: 1, accuracy: 1, altitude: 1},
    })
    .addSite({
      name: FIG0.SITE3,
      location: {latitude: 1, longitude: 1, accuracy: 1, altitude: 1},
    })
    .addSite({
      name: FIG0.SITE4,
      location: {latitude: 1, longitude: 0, accuracy: 1, altitude: 1},
    })
    .addNode({
      name: FIG0.NODE1_0,
      site_name: FIG0.SITE1,
    })
    .addNode({
      name: FIG0.NODE1_1,
      site_name: FIG0.SITE1,
    })
    .addNode({
      name: FIG0.NODE2_0,
      site_name: FIG0.SITE2,
    })
    .addNode({
      name: FIG0.NODE2_1,
      site_name: FIG0.SITE2,
    })
    .addNode({
      name: FIG0.NODE3_0,
      site_name: FIG0.SITE3,
    })
    .addNode({
      name: FIG0.NODE3_1,
      site_name: FIG0.SITE3,
    })
    .addNode({
      name: FIG0.NODE4_0,
      site_name: FIG0.SITE4,
    })
    .addNode({
      name: FIG0.NODE4_1,
      site_name: FIG0.SITE4,
    })
    .addLink({
      a_node_name: FIG0.NODE1_1,
      z_node_name: FIG0.NODE2_0,
    })
    .addLink({
      a_node_name: FIG0.NODE2_1,
      z_node_name: FIG0.NODE3_0,
    })
    .addLink({
      a_node_name: FIG0.NODE3_1,
      z_node_name: FIG0.NODE4_0,
    })
    .addLink({
      a_node_name: FIG0.NODE4_1,
      z_node_name: FIG0.NODE1_0,
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

/**
 * Gets the mock status report
 */
export function mockStatusReport(): $Shape<StatusReportType> {
  return {
    timeStamp: 0,
    ipv6Address: 'testIpv6',
    version: 'x',
    ubootVersion: 'ubootX',
    status: 'ONLINE',
    configMd5: 'config',
    hardwareBoardId: 'test',
  };
}
