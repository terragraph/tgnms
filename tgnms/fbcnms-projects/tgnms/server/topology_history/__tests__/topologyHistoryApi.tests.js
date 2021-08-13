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
import express from 'express';
import request from 'supertest';
import {mockTopologyResults} from '../../../app/tests/data/TopologyHistoryApi';

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
  const app = express();
  app.use('/topology_service', require('../routes'));
  return app;
}
