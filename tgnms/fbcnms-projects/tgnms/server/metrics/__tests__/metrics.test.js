/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 *
 */
'use strict';

import {getLinkMetrics, getLinkMetricsByName} from '../metrics';
import {link_metric} from '../../models';

jest.mock('../../sequelize-config', () => {
  process.env.NODE_ENV = 'test';
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

test('getLinkMetricsTest', async () => {
  link_metric.create({
    id: 1,
    key_name: 'tx_bytes',
    key_prefix: '',
    name: '',
    description: '',
  });

  const metricList = await getLinkMetrics();
  expect(metricList.length).toBe(1);
  expect(metricList[0].key_name).toBe('tx_bytes');
});

test('getLinkMetricsByNameTest', async () => {
  link_metric.bulkCreate([
    {
      id: 1,
      key_name: 'tx_bytes',
      key_prefix: '',
      name: 'tx_bytes',
      description: '',
    },
    {
      id: 2,
      key_name: 'tx_errors',
      key_prefix: '',
      name: 'tx_errors',
      description: '',
    },
    {
      id: 3,
      key_name: 'rx_dropped',
      key_prefix: '',
      name: 'rx_dropped',
      description: '',
    },
  ]);

  const linkMetrics = await getLinkMetricsByName('tx');
  expect(linkMetrics.length).toBe(2);
});
