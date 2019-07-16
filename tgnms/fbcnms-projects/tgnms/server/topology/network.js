/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import {NodeStatusType} from '../../thrift/gen-nodejs/Topology_types';
import type {Controller} from '../models/controller';
import type {LinkType, NodeType} from '../../shared/types/Topology';
import type {Topology} from '../models/topology';
import type {
  WirelessController,
  WirelessControllerType,
} from '../models/wirelessController';
const {controller, topology, wireless_controller} = require('../models');
import difference from 'lodash/difference';

export async function testNetworkDb() {
  try {
    console.log('Fetching all controllers');
    await getNetworkList();
    console.log('Creating primary controller');
    const primaryController = await createController(
      'api-ip-addr',
      'e2e-ip-addr',
      8080,
      17077,
    );
    console.log('Creating network');
    const network = await createNetwork('test network', primaryController);
    network.primary_controller = primaryController.id;
    console.log('Assigning primary controller to network');
    network.save();
    console.log('Creating backup controller');
    const backupController: Controller = await createController(
      'api-ip-addr-backup',
      'e2e-ip-addr-backup',
      8080,
      17077,
    );
    console.log('Fetching network by name');
    const testNetwork = await getNetworkByName('test network');
    testNetwork.backup_controller = backupController.id;
    console.log('Assigning backup controller to network');
    await testNetwork.save();
  } catch (err) {
    console.log('error', err);
  }
}

export function createController(
  api_ip: string,
  e2e_ip: string,
  api_port: number,
  e2e_port: number,
): Promise<Controller> {
  // create controller and return its id
  return new Promise<Controller>((resolve, _reject) => {
    return controller
      .create({api_ip, e2e_ip, api_port, e2e_port})
      .then(resp => resolve(resp));
  });
}

export function createWirelessController(
  type: WirelessControllerType,
  url: string,
  username: string,
  password: string,
) {
  // create wireless controller and return its id
  return new Promise<WirelessController>((resolve, _reject) => {
    return wireless_controller
      .create({type, url, username, password})
      .then(resp => resolve(resp));
  });
}

export function getNetworkById(networkId: number) {
  return getNetworkByClause({id: networkId});
}

export function getNetworkByName(networkName: string) {
  return getNetworkByClause({name: networkName});
}

export function getNetworkByClause(clause: {}): Promise<Topology> {
  return new Promise<Topology>((resolve, _reject) => {
    return topology
      .findOne({
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
      })
      .then(network => resolve(network));
  });
}

export function getNetworkList(): Promise<Array<Topology>> {
  return new Promise<Array<Topology>>((resolve, _reject) => {
    return topology
      .findAll({
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
      })
      .then(networks => resolve(networks));
  });
}

export function createNetwork(
  networkName: string,
  primaryController: Controller,
): Promise<Topology> {
  // create new network with just the name set
  return new Promise<Topology>((resolve, reject) => {
    return topology
      .create({name: networkName, primary_controller: primaryController.id})
      .then(network => resolve(network))
      .catch(_err => reject());
  });
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
): {
  nodes: {[string]: boolean},
  links: {[string]: boolean},
} {
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
    .then((network: Topology) => {
      let offline_whitelist = network.offline_whitelist;

      // no whitelist is present
      if (!offline_whitelist) {
        offline_whitelist = {
          links: {},
          nodes: {},
        };
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
        !network.offline_whitelist ||
        difference(
          Object.keys(offline_whitelist.nodes),
          Object.keys(newWhitelist.nodes),
        ).length > 0 ||
        difference(
          Object.keys(offline_whitelist.links),
          Object.keys(newWhitelist.links),
        ).length > 0
      ) {
        network.offline_whitelist = newWhitelist;
        // $FlowFixMe
        return network.save().then(saved => {
          return saved.offline_whitelist;
        });
      }

      return Promise.resolve(network.offline_whitelist);
    });
}
