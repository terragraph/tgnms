/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
import express from 'express';
import moment from 'moment';
import request from 'supertest';
import {link_event} from '../../models';
const {refreshNetworkHealth} = require('../model');

jest.mock('request');
jest.mock('../../models');

jest.mock('../../config', () => ({
  LINK_HEALTH_TIME_WINDOW_HOURS: 24,
}));

/*
 * WARNING: If these break, downstream services may be affected
 */
describe('api contract tests', () => {
  test('if no link health is cached, should return 404', async () => {
    const app = setupApp();
    await request(app)
      .get(`/topology/link_health/somenetwork`)
      .expect(404);
    await request(app)
      .get(`/topology/link_health/somenetwork/24`)
      .expect(404);
  });
  test('get /link_health/topology returns cached link health info', async () => {
    const networkName = 'test net';
    const linkName = 'link-A-B';
    await seedLinkHealth({networkName, linkName});
    const app = setupApp();
    const response = await request(app)
      .get(`/topology/link_health/${networkName}`)
      .expect(200);
    expect(response.body.events).toBeDefined();
  });
  test('get /link_health/topology/24 returns cached link health info', async () => {
    const networkName = 'test net';
    const linkName = 'link-A-B';
    await seedLinkHealth({networkName, linkName});
    await refreshNetworkHealth(networkName);

    const app = setupApp();
    const response = await request(app)
      .get(`/topology/link_health/${networkName}/24`)
      .expect(200);
    expect(response.body.events).toBeDefined();
  });
});

function setupApp() {
  const app = express();
  app.use('/topology', require('../routes'));
  return app;
}

async function seedLinkHealth({
  networkName,
  linkName,
}: {
  networkName: string,
  linkName: string,
}) {
  const startTs = moment().subtract(10, 'hours');
  const endTs = moment().subtract(4, 'hours');
  // create link up interval, ensure % availability
  await link_event.bulkCreate([
    {
      id: 1,
      topologyName: networkName,
      linkName: linkName,
      linkDirection: 'A',
      eventType: 'LINK_UP',
      startTs: startTs,
      endTs: endTs,
    },
    {
      id: 2,
      topologyName: networkName,
      linkName: linkName,
      linkDirection: 'Z',
      eventType: 'LINK_UP',
      startTs: startTs,
      endTs: endTs,
    },
  ]);
  await refreshNetworkHealth(networkName);
}
