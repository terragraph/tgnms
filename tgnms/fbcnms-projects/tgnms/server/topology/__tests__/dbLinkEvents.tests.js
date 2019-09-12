/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 *
 * // WARNING: These are API contract tests!
 * If these tests break, ensure that you have not introduced
 * api breaking changes.
 */
import moment from 'moment';
import {fetchNetworkHealthFromDb} from '../model';
import {link_event} from '../../models';

jest.mock('request');
jest.mock('../../sequelize-config', () => {
  process.env.NODE_ENV = 'test';
  process.env.STATS_BACKEND = 'prometheus';
  return {
    [process.env.NODE_ENV]: {
      username: null,
      password: null,
      database: 'db',
      dialect: 'sqlite',
      logging: false,
    },
  };
});

beforeEach(async () => {
  const {sequelize} = require('../../models');
  // running sync instead of migrations because of weird foreign key issues
  await sequelize.sync({force: true});
});

describe('basic db tests', () => {
  test('link up both directions', async () => {
    // online for one hour
    const networkName = 'test net';
    const linkName = 'link-A-B';
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
    const networkHealth = await fetchNetworkHealthFromDb(networkName, 24);
    // link up for 25% of the 24-hour window
    expect(networkHealth.events[linkName].linkAlive).toBe(25);
    expect(networkHealth.events[linkName].linkAvailForData).toBe(25);
  });
});
