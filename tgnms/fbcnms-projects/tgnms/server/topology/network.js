/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import Sequelize from 'sequelize';
import difference from 'lodash/difference';
import moment from 'moment';
import {NodeStatusTypeValueMap as NodeStatusType} from '../../shared/types/Topology';

const {
  controller,
  link_event,
  topology,
  wireless_controller,
  map_profile,
} = require('../models');
import type {ControllerAttributes} from '../models/controller';
import type {LinkType, NodeType} from '../../shared/types/Topology';
import type {OfflineWhiteListType} from '../../shared/dto/NetworkState';
import type {Topology, TopologyAttributes} from '../models/topology';
import type {
  WirelessControllerAttributes,
  WirelessControllerType,
} from '../models/wirelessController';

export function createController(
  api_ip: string,
  e2e_ip: string,
  api_port: number,
  e2e_port: number,
) {
  return controller.create(
    ({api_ip, e2e_ip, api_port, e2e_port}: $Shape<ControllerAttributes>),
  );
}

export function createWirelessController(
  type: WirelessControllerType,
  url: string,
  username: string,
  password: string,
) {
  return wireless_controller.create(
    ({type, url, username, password}: $Shape<WirelessControllerAttributes>),
  );
}

export function getNetworkById(networkId: number): Promise<?Topology> {
  return getNetworkByClause({id: networkId});
}

export function getNetworkByName(networkName: string): Promise<?Topology> {
  return getNetworkByClause({name: networkName});
}

export function getNetworkByClause(clause: {}): Promise<?Topology> {
  return topology.findOne({
    include: [
      {
        model: controller,
        as: 'primary',
      },
      {
        model: controller,
        as: 'backup',
      },
      {
        model: wireless_controller,
        as: 'wac',
      },
    ],
    where: clause,
  });
}

export function getNetworkList() {
  return topology.findAll({
    include: [
      {
        model: controller,
        as: 'primary',
      },
      {
        model: controller,
        as: 'backup',
      },
      {
        model: wireless_controller,
        as: 'wac',
      },
      {
        model: map_profile,
        as: 'map_profile',
      },
    ],
  });
}

export function createNetwork(
  networkName: string,
  primaryController: ControllerAttributes,
) {
  // create new network with just the name set
  return topology.create(
    ({
      name: networkName,
      primary_controller: primaryController.id,
    }: $Shape<TopologyAttributes>),
  );
}

/**
 * Distinguish between nodes which have never come online and nodes which are
 * offline / legitimately unhealthy.
 */
export function updateOnlineWhitelist(
  networkName: string,
  {
    nodes,
    links,
  }: {
    nodes: Array<NodeType>,
    links: Array<LinkType>,
  },
): Promise<OfflineWhiteListType> {
  const onlineNodes: {[string]: boolean} = nodes.reduce((map, node) => {
    if (
      typeof node.status !== 'undefined' &&
      node.status !== NodeStatusType.OFFLINE
    ) {
      map[node.name] = true;
    }
    return map;
  }, {});

  const onlineLinks: {[string]: boolean} = links.reduce((map, link) => {
    if (link.is_alive) {
      map[link.name] = true;
    }
    return map;
  }, {});

  return topology
    .findOne({
      where: {
        name: networkName,
      },
    })
    .then(network => {
      let offline_whitelist = network?.offline_whitelist;

      // no whitelist is present
      if (!offline_whitelist) {
        offline_whitelist = {
          links: {},
          nodes: {},
        };
      }

      if (!network) {
        return Promise.resolve(offline_whitelist);
      }

      // whitelists are corrupted
      if (!offline_whitelist.links) {
        offline_whitelist.links = {};
      }
      if (!offline_whitelist.nodes) {
        offline_whitelist.nodes = {};
      }

      const newWhitelist = {
        nodes: Object.assign({}, offline_whitelist.nodes, onlineNodes),
        links: Object.assign({}, offline_whitelist.links, onlineLinks),
      };

      // if there is a change in either list, persist it
      if (
        !network?.offline_whitelist ||
        difference(
          Object.keys(newWhitelist.nodes),
          Object.keys(offline_whitelist.nodes),
        ).length > 0 ||
        difference(
          Object.keys(newWhitelist.links),
          Object.keys(offline_whitelist.links),
        ).length > 0
      ) {
        network.offline_whitelist = newWhitelist;
        return network.save().then(saved => {
          if (saved && saved.offline_whitelist) {
            return saved.offline_whitelist;
          }
          throw new Error('Failed saving offline whitelist');
        });
      }

      return Promise.resolve(network.offline_whitelist);
    });
}

export function getLinkEvents(topologyName: string, intervalHours: number) {
  return link_event.findAll({
    where: {
      topologyName,
      endTs: {
        // $FlowIgnore flow doesnt support symbols
        [Sequelize.Op.gte]: moment().subtract(intervalHours, 'hours').toDate(),
      },
    },
  });
}
