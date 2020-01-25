/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 */

import {JWS} from 'node-jose';
import type {Client, Issuer} from 'openid-client';
import type {JWSResult} from 'node-jose';

/**
 * Generates a mocked openid client with no side effects
 */
export function mockOpenidClient(overrides?: $Shape<Client>): $Shape<Client> {
  return {
    grant: jest.fn(),
    decryptIdToken: jest.fn(),
    validateIdToken: jest.fn(),
    refresh: jest.fn(),
    issuer: mockIssuer(),
    ...(overrides || {}),
  };
}

export function mockIssuer(): $Shape<Issuer> {
  return {
    keystore: jest.fn(),
  };
}

/**
 * Overwrites the default implementation of awaitClient and returns the mocked
 * openid client. If no client is passed, a default is generated
 */
export function mockAwaitClient(client?: Client) {
  const _client = client || mockOpenidClient();
  jest.spyOn(require('../user/oidc'), 'awaitClient').mockResolvedValue(_client);
  return client;
}

/**
 * Mocks out the JWT token signature verification
 */
export function mockVerify() {
  const verify = jest
    .fn()
    .mockResolvedValue(new Error('should fail by default'));
  const jwsVerify: {
    verify: JestMockFn<[string], Promise<JWSResult | Error>>,
  } = {
    verify: verify,
  };
  jest.spyOn(JWS, 'createVerify').mockReturnValue(jwsVerify);
  return jwsVerify.verify;
}
