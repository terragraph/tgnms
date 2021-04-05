/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
import mockRequest from 'request';
import request from 'supertest';
import {createQuery} from '@fbcnms/tg-nms/app/apiutils/PrometheusAPIUtil';
import {getAllNetworkConfigs} from '@fbcnms/tg-nms/server/topology/model';
import {mockNetworkInstanceConfig} from '@fbcnms/tg-nms/app/tests/data/NetworkConfig';
import {setupTestApp} from '@fbcnms/tg-nms/server/tests/expressHelpers';
import type {
  PromQuery,
  PromRangeQuery,
} from '@fbcnms/tg-nms/server/metrics/prometheus';

jest.mock('request');
jest.mock('@fbcnms/tg-nms/server/models');

mockRequest.mockImplementation((options, cb) => {
  cb(null, {statusCode: 200, body: JSON.stringify({data: {result: []}})});
});

const TEST_NETWORK_NOPROMURL = 'test-noprom';
const TEST_NETWORK_PROMURL = 'test-prom';
const instanceConfigs = getAllNetworkConfigs();
Object.assign(instanceConfigs, {
  [TEST_NETWORK_NOPROMURL]: mockNetworkInstanceConfig({}),
  [TEST_NETWORK_PROMURL]: mockNetworkInstanceConfig({}),
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('api contract tests', () => {
  test('/query/raw', async () => {
    const app = setupApp();
    const rangeQuery: PromRangeQuery = {
      query: createQuery('mcs', {
        topologyName: TEST_NETWORK_NOPROMURL,
        intervalSec: 30,
      }),
      start: 0,
      end: 1000,
      step: 1,
    };
    const _resp = await request(app)
      .get('/metrics/query/raw')
      .query(rangeQuery)
      .expect(200);
    expect(mockRequest).toHaveBeenCalledWith(
      {
        uri: `http://prometheus:9090/api/v1/query_range`,
        method: 'GET',
        qs: {
          query: `mcs{network="${TEST_NETWORK_NOPROMURL}", intervalSec="30"}`,
          end: '1000',
          start: '0',
          end: '1000',
          step: '1',
        },
      },
      expect.any(Function),
    );
  });
  test('/:networkName/query/dataArray', async () => {
    const app = setupApp();
    const qs = {
      queries: [
        createQuery('mcs', {
          topologyName: TEST_NETWORK_NOPROMURL,
          intervalSec: 30,
        }),
        createQuery('snr', {
          topologyName: TEST_NETWORK_NOPROMURL,
          intervalSec: 30,
        }),
      ],
      start: 0,
      end: 1000,
      step: 1,
    };
    const _resp = await request(app)
      .get('/metrics/query/dataArray')
      .query(qs)
      .expect(200);
    expect(mockRequest).toHaveBeenCalledTimes(2);
    expect(mockRequest).toHaveBeenNthCalledWith(
      1,
      {
        uri: `http://prometheus:9090/api/v1/query_range`,
        method: 'GET',
        qs: {
          query: `mcs{network="${TEST_NETWORK_NOPROMURL}", intervalSec="30"}`,
          end: '1000',
          start: '0',
          end: '1000',
          step: '1',
        },
      },
      expect.any(Function),
    );
    expect(mockRequest).toHaveBeenNthCalledWith(
      2,
      {
        uri: `http://prometheus:9090/api/v1/query_range`,
        method: 'GET',
        qs: {
          query: `snr{network="${TEST_NETWORK_NOPROMURL}", intervalSec="30"}`,
          end: '1000',
          start: '0',
          end: '1000',
          step: '1',
        },
      },
      expect.any(Function),
    );
  });
  test('/:networkName/query/raw/latest', async () => {
    const app = setupApp();
    const rangeQuery: PromQuery = {
      query: createQuery('mcs', {
        topologyName: TEST_NETWORK_NOPROMURL,
        intervalSec: 30,
      }),
    };
    const _resp = await request(app)
      .get('/metrics/query/raw/latest')
      .query(rangeQuery)
      .expect(200);
    expect(mockRequest).toHaveBeenCalledWith(
      {
        uri: `http://prometheus:9090/api/v1/query`,
        method: 'GET',
        qs: {
          query: `mcs{network="${TEST_NETWORK_NOPROMURL}", intervalSec="30"}`,
        },
      },
      expect.any(Function),
    );
  });
});

function setupApp() {
  return setupTestApp('/metrics', require('../routes'));
}
