/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
import access from '../../middleware/access';
import express from 'express';
import request from 'supertest';

test('should return UP status', async () => {
  const response = await request(setupApp())
    .get('/healthcheck')
    .expect(200);
  expect(response.body.status).toBe('UP');
});

function setupApp() {
  const app = express();
  // this should be an open route
  app.use(access());
  app.use('/healthcheck', require('../routes'));
  return app;
}
