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

import axios from 'axios';
import request from 'supertest';
import {mockTopologyResults} from '../../../app/tests/data/TopologyHistoryApi';
import {setupTestApp} from '@fbcnms/tg-nms/server/tests/expressHelpers';

jest.mock('axios');

describe('/topology/ returns the historical topology', () => {
  test('returns a single execution', async () => {
    const app = setupApp();
    const getMock = jest.spyOn(axios, 'default').mockResolvedValueOnce({
      data: mockTopologyResults(),
    });

    const response = await request(app)
      .get('/topology_service/topology')
      .expect(200);
    expect(getMock).toHaveBeenCalled();
    expect(response.body).toHaveLength(2);
    expect(response.body[0].last_updated).toEqual('2021-07-28T20:24:14');
    expect(response.body[1].last_updated).toEqual('2021-07-28T20:34:14');
  });
});

function setupApp() {
  return setupTestApp('/topology_service', require('../routes').default);
}
