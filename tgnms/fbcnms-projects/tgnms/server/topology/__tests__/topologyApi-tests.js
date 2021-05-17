/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
import moment from 'moment';
import request from 'supertest';
const {link_event, controller, topology} = require('../../models');
const {refreshNetworkHealth} = require('../model');
import nullthrows from '@fbcnms/util/nullthrows';
import {getNetworkById} from '../network';
import {setupTestApp} from '@fbcnms/tg-nms/server/tests/expressHelpers';
import type {LinkEventAttributes} from '../../models/linkEvents';
import type {NetworkInstanceConfig} from '@fbcnms/tg-nms/shared/dto/NetworkState';
import type {TopologyAttributes} from '@fbcnms/tg-nms/server/models/topology';

jest.mock('request');
jest.mock('../../models');

jest.mock('../../config', () => ({
  LINK_HEALTH_TIME_WINDOW_HOURS: 24,
}));

describe('create/update topology', () => {
  test('/topology/create creates a new network', async () => {
    const data: $Shape<NetworkInstanceConfig> = {
      name: '<test>',
      primary: {
        api_ip: '127.0.0.1',
        api_port: 9090,
        e2e_ip: '127.0.0.1',
        e2e_port: 17707,
      },
      prometheus_url: '[::]/prometheus',
      queryservice_url: '[::]/queryservice',
      alertmanager_url: '[::]/alertmanager_url',
      alertmanager_config_url: '[::]/alertmanager_config_url',
      prometheus_config_url: '[::]/prometheus_config_url',
      event_alarm_url: '[::]/event_alarm_url',
    };
    const beforeCreated = await topology.findOne({
      where: {name: '<test>'},
    });
    expect(beforeCreated).toBe(null);
    const app = setupApp();
    const _resp = await request(app)
      .post(`/topology/create`)
      .send(data)
      .expect(200);
    const created = await topology.findOne({
      include: [
        {
          model: controller,
          as: 'primary',
        },
        {
          model: controller,
          as: 'backup',
        },
      ],
      where: {name: '<test>'},
    });

    expect(created).not.toBeNull();
    expect(created).toMatchObject({
      ...data,
      primary: {...data.primary, id: expect.any(Number)},
    });
  });

  test('/topology/update updates an existing network', async () => {
    const networkId = 1;
    await controller.create({
      id: 1,
      api_ip: '[::1]',
      e2e_ip: '[::1]',
      api_port: 8080,
      e2e_port: 8081,
    });
    await topology.bulkCreate([
      ({
        id: networkId,
        name: 'test',
        primary_controller: 1,
      }: $Shape<TopologyAttributes>),
    ]);
    const original = await getNetworkById(networkId);
    expect(nullthrows(original).toJSON()).toMatchObject({
      id: networkId,
      name: 'test',
      primary: {
        id: 1,
        api_ip: '[::1]',
        e2e_ip: '[::1]',
        api_port: 8080,
        e2e_port: 8081,
      },
    });
    const data: $Shape<NetworkInstanceConfig> = {
      name: 'test-renamed',
      primary: {
        api_ip: '127.0.0.1',
        api_port: 9090,
        e2e_ip: '127.0.0.1',
        e2e_port: 17707,
      },
      prometheus_url: '[::]/prometheus',
      queryservice_url: '[::]/queryservice',
    };
    const app = setupApp();
    const _resp = await request(app)
      .post(`/topology/update/${networkId}`)
      .send(data)
      .expect(200);
    const updated = await getNetworkById(networkId);
    expect(nullthrows(updated).toJSON()).toMatchObject({
      id: networkId,
      ...data,
    });
  });
});

/*
 * WARNING: If these break, downstream services may be affected
 */
describe('api contract tests', () => {
  test('if no link health is cached, should return 404', async () => {
    const app = setupApp();
    await request(app).get(`/topology/link_health/somenetwork`).expect(404);
    await request(app).get(`/topology/link_health/somenetwork/24`).expect(404);
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
  return setupTestApp('/topology', require('../routes'));
}

async function seedLinkHealth({
  networkName,
  linkName,
}: {
  networkName: string,
  linkName: string,
}) {
  const startTs = moment().subtract(10, 'hours').toDate().getTime();
  const endTs = moment().subtract(4, 'hours').toDate().getTime();
  // create link up interval, ensure % availability
  await link_event.bulkCreate(
    ([
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
    ]: Array<$Shape<LinkEventAttributes>>),
  );
  await refreshNetworkHealth(networkName);
}
