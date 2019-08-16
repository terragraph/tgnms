/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

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
import type {NetworkConfig} from '../../NetworkContext';

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
    addSite: function(siteDef: $Shape<SiteType>) {
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
    addNode: function(nodeDef: $Shape<NodeType>) {
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
    addLink: function(linkDef: $Shape<LinkType>) {
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
export function mockLink(overrides?: $Shape<LinkType>): LinkType {
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
    ...(overrides || {}),
  };
}

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
    ...(overrides || {}),
  };
}
