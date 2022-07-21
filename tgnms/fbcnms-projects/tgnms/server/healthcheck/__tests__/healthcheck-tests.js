/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 */

import access from '../../middleware/access';
import express from 'express';
import request from 'supertest';

test('should return UP status', async () => {
  const response = await request(setupApp()).get('/healthcheck').expect(200);
  expect(response.body.status).toBe('UP');
});

function setupApp() {
  const app = express();
  // this should be an open route
  app.use(access());
  app.use('/healthcheck', new (require('../routes').default)().makeRoutes());
  return app;
}
