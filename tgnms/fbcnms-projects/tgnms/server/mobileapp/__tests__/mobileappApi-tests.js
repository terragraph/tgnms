/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 *
 */
import express from 'express';
import request from 'supertest';

test.skip('throws a 500 error if configuration is missing', async () => {
  const errorLogMock = jest.fn();
  jest.doMock('../../log', () => _module => ({
    error: errorLogMock,
  }));
  const app = setupApp();
  await request(app)
    .get('/mobileapp/clientconfig')
    .expect(500);
  expect(errorLogMock).toHaveBeenCalled();
});

test('returns 200 and json if configuration is valid', async () => {
  const config = require('../../config');
  config.KEYCLOAK_HOST = 'http://localhost:8080/auth';
  config.KEYCLOAK_REALM = 'testrealm';
  config.CLIENT_ROOT_URL = 'http://localhost:8080';
  const app = setupApp();
  const response = await request(app)
    .get('/mobileapp/clientconfig')
    .expect(200);

  expect(response.body).toMatchObject({
    apiUrl: 'http://localhost:8080',
    url: 'http://localhost:8080/auth',
    realm: 'testrealm',
    clientId: 'installer-app',
  });
});

function setupApp() {
  const app = express();
  app.use('/mobileapp', require('../routes'));
  return app;
}
