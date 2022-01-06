/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 * @format
 */
import {authenticateSessionUser} from '../authenticateRequest';
import {
  mockLogin,
  mockRequest,
  mockSessionUser,
} from '../../tests/expressHelpers';
import {mockOpenidClient} from '../../tests/authHelpers';
import {mockUser} from '../../../shared/tests/testHelpers';

import type {OpenidUserInfoClaims, TokenSet} from 'openid-client';

const tokenSetConstructorMock = jest
  .spyOn(require('openid-client'), 'TokenSet')
  .mockImplementation(() => {
    claims: {
    }
  });

jest.mock('../../config', () => ({
  KEYCLOAK_HOST: 'keycloak',
  KEYCLOAK_REALM: 'tgnms',
  LOG_LEVEL: 'debug',
}));

beforeEach(() => {
  jest.resetAllMocks();
});

describe('Authenticate Session User', () => {
  test('if there is no passport session, throws an expected error', async () => {
    const clientMock = mockOpenidClient();
    const request = mockRequest({});
    expect(authenticateSessionUser(request, clientMock)).rejects.toEqual(
      new Error('Login required'),
    );
  });

  test('if session token is expired, refreshes the token and logs in', async () => {
    const expiredTokenSet = {expired: jest.fn(() => true)};
    const newTokenSet: $Shape<TokenSet> = {claims: mockClaims()};
    const clientMock = mockOpenidClient();
    (clientMock.refresh: JestMockFn<
      [string],
      Promise<TokenSet>,
    >).mockImplementationOnce(() => Promise.resolve(newTokenSet));

    tokenSetConstructorMock
      .mockImplementationOnce(() => expiredTokenSet)
      .mockImplementationOnce(() => newTokenSet);

    const loginMock = mockLogin();
    const request = mockRequest({
      logIn: loginMock,
      ...mockSessionUser(mockUser(), expiredTokenSet),
    });

    await authenticateSessionUser(request, clientMock);
    expect(expiredTokenSet.expired).toHaveBeenCalled();
    expect(loginMock).toHaveBeenCalled();
    expect(clientMock.refresh).toHaveBeenCalled();
  });

  test('if session token is expired, and refresh fails, throw an error', async () => {
    const clientMock = mockOpenidClient();
    (clientMock.refresh: JestMockFn<
      [string],
      Promise<TokenSet>,
    >).mockImplementationOnce(() => Promise.reject(new Error('expired')));
    const expiredTokenSet: $Shape<TokenSet> = {expired: jest.fn(() => true)};
    tokenSetConstructorMock.mockImplementationOnce(() => expiredTokenSet);
    const request = mockRequest({
      logIn: mockLogin(),
      ...mockSessionUser(mockUser()),
    });
    await expect(async () => {
      await authenticateSessionUser(request, clientMock);
    }).rejects.toThrow();
    expect(expiredTokenSet.expired).toHaveBeenCalled();
    expect(request.logIn).not.toHaveBeenCalled();
  });

  test('if token is valid, user is authenticated', async () => {
    const clientMock = mockOpenidClient();
    const validTokenSet: $Shape<TokenSet> = {expired: jest.fn(() => false)};
    tokenSetConstructorMock.mockImplementationOnce(() => validTokenSet);
    const request = mockRequest({
      logIn: mockLogin(),
      ...mockSessionUser(mockUser()),
    });
    await authenticateSessionUser(request, clientMock);
    expect(validTokenSet.expired).toHaveBeenCalled();
    // should not call login as the user has been authenticated via the session
    expect(request.logIn).not.toHaveBeenCalled();
  });
});

// fixes flow issues
function mockClaims(): $Shape<OpenidUserInfoClaims> {
  return {};
}
