/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 */
import express from 'express';
import request from 'supertest';
import {STARTUP_STEPS, makeStartupState, startupMiddleware} from '../startup';

describe('startupMiddleware', () => {
  test('blocks requests while not on the done step', async () => {
    const startupState = makeStartupState();
    const app = setupApp(startupState);
    app.get('/test', (req, res) => {
      return res.status(500).send('Should not get here');
    });
    // startupMiddleware returns a 503 until it's ready
    let response = await request(app).get('/test').expect(200);
    // ensure the startup middleware's html attribute is in the response
    expect(response.text).toEqual(
      expect.stringContaining('data-testid="startup-message"'),
    );
    startupState.step = STARTUP_STEPS.DATABASE_CONFIGURE;
    response = await request(app).get('/test').expect(200);
    expect(response.text).toEqual(
      expect.stringContaining('data-testid="startup-message"'),
    );
    startupState.step = STARTUP_STEPS.DATABASE_READY;
    response = await request(app).get('/test').expect(200);
    expect(response.text).toEqual(
      expect.stringContaining('data-testid="startup-message"'),
    );
  });

  test('allows requests once on the done step', async () => {
    const startupState = makeStartupState();
    const app = setupApp(startupState);
    app.get('/test', (req, res) => {
      return res.status(200).send('ready');
    });
    let response = await request(app).get('/test').expect(200);
    startupState.step = STARTUP_STEPS.DONE;
    response = await request(app).get('/test').expect(200);
    expect(response.text).toBe('ready');
  });

  test('shows an error message if one is set', async () => {
    const errorMessage = '<<ERROR_MESSAGE>>';
    const startupState = makeStartupState();
    const app = setupApp(startupState);
    startupState.errorMessage = errorMessage;
    const response = await request(app).get('/test').expect(200);
    expect(response.text).toEqual(expect.stringContaining(errorMessage));
  });
});

function setupApp(startupState: $Call<typeof makeStartupState>) {
  const app = express();
  app.use(startupMiddleware(startupState));
  return app;
}
