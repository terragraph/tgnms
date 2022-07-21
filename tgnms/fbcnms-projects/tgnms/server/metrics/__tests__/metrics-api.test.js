/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 */

import mockRequest from 'request';
import request from 'supertest';

const {controller, topology} = require('@fbcnms/tg-nms/server/models');
import {createQuery} from '@fbcnms/tg-nms/app/apiutils/PrometheusAPIUtil';
import {reloadInstanceConfig} from '@fbcnms/tg-nms/server/topology/model';
import {setupTestApp} from '@fbcnms/tg-nms/server/tests/expressHelpers';
import type {
  PromQuery,
  PromRangeQuery,
} from '@fbcnms/tg-nms/server/metrics/prometheus';
import type {TopologyAttributes} from '@fbcnms/tg-nms/server/models/topology';

jest.mock('request');
jest.mock('@fbcnms/tg-nms/server/models');

mockRequest.mockImplementation((options, cb) => {
  cb(null, {statusCode: 200, body: JSON.stringify({data: {result: []}})});
});

const TEST_NETWORK_NOPROMURL = 'test-noprom';
const TEST_NETWORK_PROMURL = 'test-prom';

beforeEach(async () => {
  jest.clearAllMocks();
  await seedTopology();
  await reloadInstanceConfig();
});

describe('topology with custom prometheus_url', () => {
  runTests({
    network: TEST_NETWORK_PROMURL,
    assertions: {
      prometheusBaseUrl: 'http://[::]/prometheus',
    },
  });
});

describe('topology with default prometheus url', () => {
  runTests({
    network: TEST_NETWORK_NOPROMURL,
    assertions: {
      prometheusBaseUrl: 'http://prometheus:9090',
    },
  });
});

type MetricsApiTestParams = {|
  network: string,
  // use for passing shared assertions to each test
  assertions: {
    prometheusBaseUrl: string,
  },
|};
/**
 * All tests must be run for 2 networks:
 * one with a custom prometheus_url field, one without.
 */
function runTests({network, assertions}: MetricsApiTestParams) {
  test('/:networkName/query/raw', async () => {
    const app = setupApp();
    const rangeQuery: PromRangeQuery = {
      query: createQuery('mcs', {
        network: network,
        intervalSec: 30,
      }),
      start: 0,
      end: 1000,
      step: 1,
    };
    const _resp = await request(app)
      .get(`/metrics/${network}/query/raw`)
      .query(rangeQuery)
      .expect(200);
    expect(mockRequest).toHaveBeenCalledWith(
      {
        uri: `${assertions.prometheusBaseUrl}/api/v1/query_range`,
        method: 'GET',
        qs: queryToQS(rangeQuery),
      },
      expect.any(Function),
    );
  });
  test('/:networkName/query/dataArray', async () => {
    const app = setupApp();
    const qs = {
      queries: [
        createQuery('mcs', {
          network: network,
          intervalSec: 30,
        }),
        createQuery('snr', {
          network: network,
          intervalSec: 30,
        }),
      ],
      start: 0,
      end: 1000,
      step: 1,
    };
    const _resp = await request(app)
      .get(`/metrics/${network}/query/dataArray`)
      .query(qs)
      .expect(200);
    expect(mockRequest).toHaveBeenCalledTimes(2);
    const {queries, ...assertQs} = qs;
    expect(mockRequest).toHaveBeenNthCalledWith(
      1,
      {
        uri: `${assertions.prometheusBaseUrl}/api/v1/query_range`,
        method: 'GET',
        qs: queryToQS({
          ...assertQs,
          query: queries[0],
        }),
      },
      expect.any(Function),
    );
    expect(mockRequest).toHaveBeenNthCalledWith(
      2,
      {
        uri: `${assertions.prometheusBaseUrl}/api/v1/query_range`,
        method: 'GET',
        qs: queryToQS({
          ...assertQs,
          query: queries[1],
        }),
      },
      expect.any(Function),
    );
  });
  test('/:networkName/query/raw/latest', async () => {
    const app = setupApp();
    const rangeQuery: PromQuery = {
      query: createQuery('mcs', {
        network: network,
        intervalSec: 30,
      }),
    };
    const _resp = await request(app)
      .get(`/metrics/${network}/query/raw/latest`)
      .query(rangeQuery)
      .expect(200);
    expect(mockRequest).toHaveBeenCalledWith(
      {
        uri: `${assertions.prometheusBaseUrl}/api/v1/query`,
        method: 'GET',
        qs: queryToQS(rangeQuery),
      },
      expect.any(Function),
    );
  });
}

async function seedTopology() {
  await controller.bulkCreate([
    {
      id: 1,
      api_ip: '[::1]',
      e2e_ip: '[::1]',
      api_port: 8080,
      e2e_port: 8081,
    },
    {
      id: 2,
      api_ip: '[::2]',
      e2e_ip: '[::2]',
      api_port: 8080,
      e2e_port: 8081,
    },
  ]);
  await topology.bulkCreate([
    ({
      name: TEST_NETWORK_NOPROMURL,
      primary_controller: 1,
    }: $Shape<TopologyAttributes>),
    ({
      name: TEST_NETWORK_PROMURL,
      primary_controller: 2,
      prometheus_url: 'http://[::]/prometheus',
      queryservice_url: 'http://[::]/queryservice',
    }: $Shape<TopologyAttributes>),
  ]);
}

/**
 * Most of what these endpoints do is take a prometheus query and proxy it
 * to the prometheus url. currently the "request" node_module is used for
 * making the actual http request.
 * use this function to convert the input querystring object into request's "qs"
 * parameter.
 */
function queryToQS(query: Object): {[string]: string} {
  return Object.keys(query).reduce(
    (qs, key) => Object.assign(qs, {[key]: query[key].toString()}),
    {},
  );
}

function setupApp() {
  return setupTestApp('/metrics', require('../routes').default);
}
