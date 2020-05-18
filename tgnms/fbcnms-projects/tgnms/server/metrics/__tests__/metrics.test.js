/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 *
 */

jest.mock('../../models');
import {getLinkMetrics, getLinkMetricsByName} from '../metrics';
const {link_metric} = require('../../models');

test('getLinkMetricsTest', async () => {
  await link_metric.create({
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
  await link_metric.bulkCreate([
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
