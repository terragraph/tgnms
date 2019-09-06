/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import express from 'express';
import request from 'supertest';
import {NetworkDto} from '../../../../shared/dto/api/v1';
const {
  getAllNetworkConfigs,
  getNetworkConfig,
} = require('../../../topology/model');
jest.mock('request');
jest.mock('../../../models');
jest.mock('../../../topology/model');

const configs = {
  foo: {
    name: 'foo',
    backup: {
      api_ip: '89c3:c57f:7d6f:b86b:f466:ca26:cf97:98ce',
      api_port: 8080,
      e2e_ip: null,
      e2e_port: 7777,
      id: 1,
    },
    controller_online: true,
    primary: {
      api_ip: '37:4249:58b2:ee57:cc1f:97a6:9c3e:456f',
      api_port: 8080,
      e2e_ip: null,
      e2e_port: 7777,
      id: 2,
    },
    query_service_online: true,
    site_overrides: {},
  },
  bar: {
    name: 'bar',
    backup: {
      api_ip: 'f0cc:efee:6ba2:312c:b254:7b3b:92e7:4064',
      api_port: 8080,
      e2e_ip: null,
      e2e_port: 7777,
      id: 3,
    },
    controller_online: true,
    primary: {
      api_ip: '8379:55f2:2371:91ee:c29f:d36a:1951:6817',
      api_port: 8080,
      e2e_ip: null,
      e2e_port: 7777,
      id: 4,
    },
    query_service_online: true,
    site_overrides: {},
  },
};

test('networkContractTest', async () => {
  const app = setupApp();

  getAllNetworkConfigs.mockReturnValue(mockGetAllNetworkConfigs());

  const response = await request(app)
    .get('/api/v1/network')
    .expect(200);
  expect(response.body.length).toBe(2);
  expect(response.body[0]).toStrictEqual(configs.foo);
  expect(response.body[1]).toStrictEqual(configs.bar);
});

test('networkNameContractTest', async () => {
  const app = setupApp();
  const networkName = 'foo';

  getNetworkConfig.mockReturnValue(mockGetNetworkConfig(networkName));

  const response = await request(app)
    .get(`/api/v1/network/${networkName}`)
    .expect(200);
  expect(response.body).toStrictEqual(configs[networkName]);
});

test('missingNetworkNameContractTest', async () => {
  const app = setupApp();
  const networkName = 'baz';

  getNetworkConfig.mockReturnValue(mockGetNetworkConfig(networkName));

  await request(app)
    .get(`/api/v1/network/${networkName}`)
    .expect(404);
});

function mockGetAllNetworkConfigs() {
  return Object.keys(configs).map(name => new NetworkDto(configs[name]));
}

function mockGetNetworkConfig(networkName: string) {
  if (configs.hasOwnProperty(networkName)) {
    return configs[networkName];
  }
  return null;
}

function setupApp() {
  const app = express();
  app.use('/api/v1', require('../routes'));
  return app;
}
