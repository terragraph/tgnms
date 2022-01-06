/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 */

import ApplicationUser from '../user/User';
const express = require('express');
import {Api} from '../Api';
import {json} from 'body-parser';
import type {ExpressRequest, ExpressResponse} from 'express';
import type {OpenidUserInfoClaims, TokenSet} from 'openid-client';
import type {Request} from '../types/express';
import type {User} from '../../shared/auth/User';

/**
 * I can't figure out how to make this work with the proper type. The type
 * should be $Shape<Request & {headers:Headers}> but flow complains about the
 * mock functions because express$Request is not exact
 */
export function mockRequest(
  req?: $Rest<any, {headers?: Headers}>,
): $Shape<Request> {
  const overrides = req || {};

  return {
    hostname: 'terragraph.link',
    originalUrl: '/',
    isAuthenticated: jest.fn(() => false),
    header: mockHeaders(req?.headers),
    logIn: mockLogin(),
    ...(overrides || {}),
  };
}

export function mockResponse(
  res?: $Shape<ExpressResponse>,
): $Shape<ExpressResponse> {
  return {
    ...(res || {}),
  };
}

type Headers = {[string]: string};
export function mockHeaders(headers?: Headers = {}) {
  return (header: string): string | void => {
    return headers && headers[header];
  };
}

export function mockSessionUser(user: User, tokenSet?: $Shape<TokenSet>): any {
  const claims: $Shape<OpenidUserInfoClaims & {roles: Array<string>}> = {
    sub: user.id,
    name: user.name,
    email: user.email,
    roles: user.roles,
  };
  const defaultTokenSet: $Shape<TokenSet> = {
    claims: claims,
  };

  return {
    session: {
      passport: {
        user: tokenSet || defaultTokenSet,
      },
    },
    user: user,
  };
}

/**
 * Generate a mock function and cast a fake return to ExpressResponse -
 * this is just for flow
 */
export function mockResponseFn(fn?: any => void): () => ExpressResponse {
  return jest.fn((...args) => {
    if (fn) {
      fn(...args);
    }
    return (({}: any): ExpressResponse);
  });
}

export function mockLogin(): (user: User, (err: ?Error) => mixed) => void {
  return jest.fn<[User | ApplicationUser, (e: ?Error) => mixed], void>(
    (user: User | ApplicationUser, callback: (e: ?Error) => mixed) => {
      callback();
    },
  );
}

export function setupTestApp(urlPath: string, routes: Class<Api>) {
  const app = express<ExpressRequest, ExpressResponse>();
  app.use(json());
  const r = new routes();
  r.init();
  app.use(urlPath, r.makeRoutes());
  app.use(function (err, req: ExpressRequest, res: ExpressResponse, _next) {
    console.error(err);
    res.status(500).send(err.message);
  });
  return app;
}
