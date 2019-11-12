/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

jest.mock('../../models');
import {
  LinkTypeValueMap,
  NodeStatusTypeValueMap,
  NodeTypeValueMap,
} from '../../../shared/types/Topology';
import {controller, topology} from '../../models';
import type {LinkType, NodeType} from '../../../shared/types/Topology';
import type {TopologyAttributes} from '../../models/topology';

import {updateOnlineWhitelist} from '../network';

type MockTopology = $Shape<{
  ...TopologyAttributes,
  save: () => Promise<MockTopology>,
}>;

test('if nodes and links are empty, nothing is added to whitelist', async () => {
  await seedTopology();
  const newWhitelist = await updateOnlineWhitelist('test-network', {
    nodes: [],
    links: [],
  });
  expect(newWhitelist).toBeTruthy;
  expect(newWhitelist.nodes).toMatchObject({});
  expect(newWhitelist.links).toMatchObject({});
});

test('if whitelist is empty and offline nodes/links are provided, nothing is added to whitelist', async () => {
  await seedTopology();
  const newWhitelist = await updateOnlineWhitelist('test-network', {
    nodes: [mockNode()],
    links: [mockLink()],
  });
  expect(newWhitelist).toBeTruthy;
  expect(newWhitelist.nodes).toMatchObject({});
  expect(newWhitelist.links).toMatchObject({});
});

test('if whitelist is empty and online nodes/links are provided, they should be added to the whitelist', async () => {
  mockFindTopology();

  const newWhitelist = await updateOnlineWhitelist('test-network', {
    nodes: [
      mockNode({
        status: NodeStatusTypeValueMap.ONLINE,
      }),
    ],
    links: [
      mockLink({
        is_alive: true,
      }),
    ],
  });
  const foundTopology = await topology.findOne.mock.results[0].value;
  expect(foundTopology.save).toHaveBeenCalled();
  expect(newWhitelist.nodes['node-1']).toBe(true);
  expect(newWhitelist.links['link-1']).toBe(true);
});

test('if nodes/links contained in whitelist are down, whitelist should stay the same', async () => {
  await seedTopology();
  // first add them to whitelist
  await updateOnlineWhitelist('test-network', {
    nodes: [
      mockNode({
        status: NodeStatusTypeValueMap.ONLINE,
      }),
    ],
    links: [
      mockLink({
        is_alive: true,
      }),
    ],
  });

  // now they're offline, whitelist shouldn't change
  const whitelist = await updateOnlineWhitelist('test-network', {
    nodes: [
      mockNode({
        status: NodeStatusTypeValueMap.OFFLINE,
      }),
    ],
    links: [
      mockLink({
        is_alive: false,
      }),
    ],
  });

  expect(whitelist.nodes['node-1']).toBe(true);
  expect(whitelist.links['link-1']).toBe(true);

  // ensure that whitelist is persisted to the DB too
  const dbTopology = await topology.findOne({where: {name: 'test-network'}});
  expect(dbTopology.offline_whitelist.nodes['node-1']).toBe(true);
  expect(dbTopology.offline_whitelist.links['link-1']).toBe(true);
});

test('if whitelist exists, newly online nodes/links should be added', async () => {
  await seedTopology({
    offline_whitelist: {
      links: {
        'link-a': true,
        'link-b': true,
      },
      nodes: {
        'node-a': true,
      },
    },
  });

  await updateOnlineWhitelist('test-network', {
    nodes: [
      mockNode({
        name: 'node-b',
        status: NodeStatusTypeValueMap.ONLINE,
      }),
    ],
    links: [
      mockLink({
        name: 'link-c',
        is_alive: true,
      }),
    ],
  });

  const dbTopology = await topology.findOne({where: {name: 'test-network'}});
  expect(dbTopology.offline_whitelist.nodes['node-a']).toBe(true);
  expect(dbTopology.offline_whitelist.nodes['node-b']).toBe(true);
  expect(dbTopology.offline_whitelist.links['link-a']).toBe(true);
  expect(dbTopology.offline_whitelist.links['link-b']).toBe(true);
  expect(dbTopology.offline_whitelist.links['link-c']).toBe(true);
});

/*
 * This mocks out topology.findOne - note that the actual sqlite DB will not be
 * hit if this function is called inside of a test. There should be coverage of
 * both actual queries and mocks.
 */
function mockFindTopology() {
  jest
    .spyOn(topology, 'findOne')
    .mockImplementationOnce((query: $Shape<TopologyAttributes>) => {
      const mockTopology: MockTopology = {
        ...query,
        save: jest.fn().mockImplementation(() => Promise.resolve(mockTopology)),
      };
      return Promise.resolve(mockTopology);
    });
}

async function seedTopology(overrides?: $Shape<TopologyAttributes>) {
  const ctrl = await controller.create({
    api_ip: '127.0.0.1',
    e2e_port: 17077,
    api_port: 8080,
  });
  return await topology.create({
    id: 1,
    name: 'test-network',
    primary_controller: ctrl.id,
    ...(overrides || {}),
  });
}

function mockNode(overrides?: $Shape<NodeType>): NodeType {
  return {
    name: 'node-1',
    node_type: NodeTypeValueMap.DN,
    is_primary: true,
    mac_addr: 'ff:aa:bb:cc:dd',
    pop_node: false,
    status: NodeStatusTypeValueMap.OFFLINE,
    site_name: 'site-1',
    ant_azimuth: 0,
    ant_elevation: 0,
    wlan_mac_addrs: [],
    ...overrides,
  };
}

function mockLink(overrides?: $Shape<LinkType>): LinkType {
  return {
    name: 'link-1',
    a_node_name: 'node-1',
    z_node_name: 'node-2',
    link_type: LinkTypeValueMap.WIRELESS,
    is_alive: false,
    linkup_attempts: 0,
    a_node_mac: 'ff:aa:bb:cc:dd',
    z_node_mac: 'ff:aa:bb:cc:dd',
    ...overrides,
  };
}
