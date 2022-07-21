/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 */

import * as axiosMock from 'axios';
import request from 'supertest';
import {setupTestApp} from '../../tests/expressHelpers';
jest.mock('axios');

const mockResponse = {
  data: `
openapi: 3.0.0
info:
    title: test
      `,
};

const setupApp = () => setupTestApp('/docs', require('../routes').default);

describe('GET /docs/msa/:serviceName', () => {
  test('requests docs to msa service', async () => {
    const mock = jest.spyOn(axiosMock, 'get').mockResolvedValue(mockResponse);
    const app = setupApp();
    await request(app).get('/docs/msa/msa_default_routes_service').expect(200);

    expect(mock).toHaveBeenCalledWith(
      'http://msa_default_routes_service:8080/docs.yml',
    );
  });
  test('converts msa docs from yaml to json', async () => {
    jest.spyOn(axiosMock, 'get').mockResolvedValue(mockResponse);
    const app = setupApp();
    const response = await request(app)
      .get('/docs/msa/msa_default_routes_service')
      .expect(200);

    expect(response.body).toMatchObject({
      openapi: '3.0.0',
      info: {
        title: 'test',
      },
    });
  });
  test('sanitizes serviceName param', async () => {
    const mock = jest.spyOn(axiosMock, 'get').mockResolvedValue(mockResponse);
    const app = setupApp();
    await request(app)
      .get('/docs/msa/' + encodeURIComponent('https://facebook.com/'))
      .expect(200);
    expect(mock).toHaveBeenCalledWith('http://httpsfacebookcom:8080/docs.yml');
  });
});
