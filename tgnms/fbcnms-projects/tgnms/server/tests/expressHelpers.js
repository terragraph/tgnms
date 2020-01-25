/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 */

import type {ExpressResponse} from 'express';
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
    // eslint-disable-next-line
    return (({}: any): ExpressResponse);
  });
}

export function mockLogin(): (user: User, (err: ?Error) => void) => void {
  return jest.fn<[User, (e: ?Error) => void], void>(
    (user: User, callback: (e: ?Error) => void) => {
      callback();
    },
  );
}
