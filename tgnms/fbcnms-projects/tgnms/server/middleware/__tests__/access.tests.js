/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 */

import access from '../access';
import openRoutes from '../../openRoutes';
import {Permissions} from '../../../shared/auth/Permissions';
import {mockAwaitClient, mockVerify} from '../../tests/authHelpers';
import {
  mockRequest,
  mockResponse,
  mockResponseFn,
  mockSessionUser,
} from '../../tests/expressHelpers';
import {mockUser} from '../../../shared/tests/testHelpers';

import type {AccessToken} from '../../user/oidcTypes';
import type {JWSResult} from 'node-jose';
import type {User} from '../../../shared/auth/User';

jest.mock('node-jose');
jest.mock('../../config', () => ({
  LOGIN_ENABLED: true,
  LOG_LEVEL: 'error',
  CLIENT_ROOT_URL: 'https://example.tgnms.com',
  KEYCLOAK_HOST: 'http://keycloak:keycloak:8080',
  KEYCLOAK_REALM: 'tgnms',
}));

const tokenSetMock = {
  expired: jest.fn(() => false),
};

jest.mock('openid-client');
jest.spyOn(require('openid-client'), 'TokenSet').mockImplementation(function() {
  return tokenSetMock;
});

afterEach(() => {
  jest.resetAllMocks();
});

test('redirects if access token check fails', done => {
  mockAwaitClient();
  const request = mockRequest({});
  const response = mockResponse({
    redirect: mockResponseFn(redirectUrl => {
      expect(response.redirect).toHaveBeenCalledWith(redirectUrl);
      done();
    }),
  });
  access()(request, response, () => {
    done.fail(new Error('Next should not be called here'));
  });
});

test('returns 401 error and json if request was specified as ajax', done => {
  mockAwaitClient();

  const request = mockRequest({
    xhr: true,
  });
  const response = mockResponse({
    status: jest.fn(_status => response),
    send: mockResponseFn(res => {
      expect(response.status).toHaveBeenCalledWith(401);
      expect(res.error).toBeTruthy();
      done();
    }),
    redirect: mockResponseFn(() => {
      done.fail(new Error('should not redirect'));
    }),
  });
  access()(request, response, () => {
    done.fail(new Error('Next should not be called here'));
  });
});

test('If a permission is specified, redirects for authenticated user without the corresponding role', done => {
  mockAwaitClient();
  const request = mockRequest({
    isAuthenticated: jest.fn(() => true),
  });

  const response = mockResponse({
    redirect: mockResponseFn(redirectUrl => {
      expect(response.redirect).toHaveBeenCalledWith(redirectUrl);
      done();
    }),
  });

  access('TOPOLOGY_READ')(request, response, () => {
    done.fail(new Error('Next should not be called here'));
  });
});

test('if a permission is specified, allows user with corresponding role', done => {
  mockAwaitClient();
  const request = mockRequest({
    originalUrl: '/',
    ...mockSessionUser(
      mockUser({
        roles: [Permissions.TOPOLOGY_READ],
      }),
    ),
  });
  const response = mockResponse({
    redirect: mockResponseFn(() => {
      done.fail(new Error('should not redirect'));
    }),
  });

  access('TOPOLOGY_READ')(request, response, error => {
    expect(error).toBeFalsy();
    expect(response.redirect).not.toHaveBeenCalled();
    done();
  });
});

test('if no roles / permissions are specified, allows any authenticated user', done => {
  mockAwaitClient();
  const request = mockRequest(mockSessionUser(mockUser()));

  const response = mockResponse({
    redirect: mockResponseFn(() => {
      done.fail(new Error('should not redirect'));
    }),
  });

  access()(request, response, error => {
    expect(error).toBeFalsy();
    expect(response.redirect).not.toHaveBeenCalled();
    done();
  });
});

test('allows open routes for unauthenticated users', () => {
  //test every open route
  return Promise.all(
    openRoutes.map(
      openRoute =>
        new Promise(res => {
          access()(
            mockRequest({
              originalUrl: openRoute,
              user: null,
              isAuthenticated: () => false,
            }),
            mockResponse(),
            res,
          );
        }),
    ),
  );
});

test('allows open routes for authenticated users', () => {
  //test every open route
  return Promise.all(
    openRoutes.map(
      openRoute =>
        new Promise(res => {
          access()(
            mockRequest({
              originalUrl: openRoute,
              user: mockUser(),
              isAuthenticated: () => true,
            }),
            mockResponse(),
            res,
          );
        }),
    ),
  );
});

describe('Bearer token', () => {
  test('If a permission is specified, redirects for valid token without the corresponding role', done => {
    mockAwaitClient();
    mockVerify().mockImplementation(() =>
      Promise.resolve(mockVerifyResult(mockUser())),
    );
    const request = mockRequest({
      headers: {
        Authorization: 'Bearer test',
      },
    });

    const response = mockResponse({
      redirect: mockResponseFn(redirectUrl => {
        // isAuthenticated should only be called for session based auth
        expect(request.isAuthenticated).not.toHaveBeenCalled();
        expect(response.redirect).toHaveBeenCalledWith(redirectUrl);
        done();
      }),
    });

    access('TOPOLOGY_READ')(request, response, error => {
      expect(error).toBeFalsy();
      expect(response.redirect).toHaveBeenCalled();
      done();
    });
  });

  test('if no roles / permissions are specified, allows any valid token', done => {
    mockVerify().mockImplementation(() =>
      Promise.resolve(mockVerifyResult(mockUser())),
    );
    mockAwaitClient();
    const request = mockRequest({
      headers: {
        Authorization: 'Bearer test',
      },
    });
    const response = mockResponse({
      redirect: jest.fn(() => {
        throw done.fail(new Error('User should not be redirected'));
      }),
    });

    access()(request, response, error => {
      expect(error).toBeFalsy();
      expect(response.redirect).not.toHaveBeenCalled();
      done();
    });
  });

  test('If a permission is specified, allows token with corresponding role', done => {
    mockAwaitClient();
    mockVerify().mockImplementation(() =>
      Promise.resolve(
        mockVerifyResult(
          mockUser({
            roles: [Permissions.TOPOLOGY_READ],
          }),
        ),
      ),
    );
    const request = mockRequest({
      headers: {
        Authorization: 'Bearer test',
      },
    });

    const response = mockResponse({
      redirect: mockResponseFn(_redirectUrl => {
        done.fail(new Error('should not redirect'));
      }),
    });

    access('TOPOLOGY_READ')(request, response, error => {
      expect(error).toBeFalsy();
      expect(response.redirect).not.toHaveBeenCalled();
      done();
    });
  });

  test('Authorization header without bearer prefix fails', done => {
    mockAwaitClient();
    mockVerify();
    const request = mockRequest({
      originalUrl: '/',
      headers: {
        Authorization: 'should fail',
      },
    });
    const response = mockResponse({
      redirect: jest.fn(),
    });

    access()(request, response, error => {
      expect(error).toBeInstanceOf(Error);
      done();
    });
  });
});

// result of decoding/verifying the JWT
function mockVerifyResult(user: User): JWSResult {
  // map from user to access token because that's what it's deserialized as
  const payload: $Shape<AccessToken> = {
    sub: user.id,
    preferred_username: user.name,
    email: user.email,
    realm_access: {
      roles: user.roles ?? [],
    },
  };
  const encoded = Buffer.from(JSON.stringify(payload), 'UTF8');
  return {
    header: {},
    payload: encoded,
    signature: Buffer.from(''),
    key: '',
  };
}
