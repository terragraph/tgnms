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
import {generateAndStoreOtp, otpMiddleware} from '../otp';

beforeEach(() => {
  jest.resetModules(); // clears the cache
});

test('returns 401 if token is missing', async () => {
  const protectedRoute = jest.fn((_req, _res) => {
    throw new Error();
  });
  const app = setupApp(protectedRoute);
  await request(app)
    .get('/static/test')
    .expect(401);
  expect(protectedRoute).not.toHaveBeenCalled();
});

test('returns 403 if token is invalid', async () => {
  const protectedRoute = jest.fn((_req, _res) => {
    throw new Error();
  });
  const app = setupApp(protectedRoute);
  await request(app)
    .get('/static/test?token=invalid')
    .expect(403);
  expect(protectedRoute).not.toHaveBeenCalled();
});

test('returns 403 if token has already been used', async () => {
  const protectedRoute = jest.fn((_req, res) => {
    res.send({});
  });
  const app = setupApp(protectedRoute);
  const token = await generateAndStoreOtp();
  // use the token once
  await request(app)
    .get(`/static/test?token=${token}`)
    .expect(200);
  expect(protectedRoute).toHaveBeenCalled();

  //try to use it again
  await request(app)
    .get(`/static/test?token=${token}`)
    .expect(403);
});

test('lets the request through if token is valid and has not been used', async () => {
  const protectedRoute = jest.fn((_req, res) => {
    res.send({});
  });
  const app = setupApp(protectedRoute);
  const token = await generateAndStoreOtp();
  await request(app)
    .get(`/static/test?token=${token}`)
    .expect(200);
  expect(protectedRoute).toHaveBeenCalled();
});

test('can store and validate multiple tokens at once', async () => {
  const numRequests = 10;
  const protectedRoute = jest.fn((_req, res) => {
    res.send({});
  });

  const app = setupApp(protectedRoute);

  const tokens = [];
  for (let i = 0; i < numRequests; i++) {
    const token = await generateAndStoreOtp();
    tokens.push(token);
  }

  // all of these should succeed
  for (const token of tokens) {
    await request(app)
      .get(`/static/test?token=${token}`)
      .expect(200);
  }

  //all of these should fail
  for (const token of tokens) {
    await request(app)
      .get(`/static/test?token=${token}`)
      .expect(403);
  }
});

function setupApp(protectedRoute) {
  const app = express();

  app.use('/static', otpMiddleware(), protectedRoute);
  return app;
}
