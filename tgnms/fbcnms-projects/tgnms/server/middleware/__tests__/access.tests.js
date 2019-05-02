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
import {Permissions} from '../../../shared/auth/Permissions';
import openRoutes from '../../openRoutes';
jest.mock('../../user/ensureAccessToken');
jest.mock('../../config', () => ({
  LOGIN_ENABLED: true,
  CLIENT_ROOT_URL: 'https://example.tgnms.com',
}));
const ensureAccessTokenMock: any = require('../../user/ensureAccessToken')
  .default;

test('redirects if access token check fails', done => {
  ensureAccessTokenMock.mockImplementationOnce(() => Promise.reject());
  const mockRequest = {
    originalUrl: '/',
  };
  const mockResponse = {
    redirect: jest.fn(redirectUrl => {
      expect(mockResponse.redirect).toHaveBeenCalledWith(redirectUrl);
      done();
    }),
  };
  access()(mockRequest, mockResponse, () => {
    throw new Error('Next should not be called here');
  });
});

test('returns 401 error and json if request was specified as ajax', done => {
  ensureAccessTokenMock.mockImplementationOnce(() => Promise.reject());
  const mockRequest = {
    originalUrl: '/',
    xhr: true,
  };
  const mockResponse = {
    status: jest.fn(() => mockResponse),
    send: jest.fn(response => {
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(response.error).toBeTruthy();
      done();
    }),
  };
  access()(mockRequest, mockResponse, () => {
    throw new Error('Next should not be called here');
  });
});

test('If a permission is specified, redirects for authenticated user without the corresponding role', done => {
  ensureAccessTokenMock.mockImplementationOnce(() => Promise.resolve());
  const mockRequest = {
    originalUrl: '/',
    user: {
      roles: [],
    },
    isAuthenticated: jest.fn(() => true),
  };

  const mockResponse = {
    redirect: jest.fn(redirectUrl => {
      expect(mockRequest.isAuthenticated).toHaveBeenCalled();
      expect(mockResponse.redirect).toHaveBeenCalledWith(redirectUrl);
      done();
    }),
  };

  access('TOPOLOGY_READ')(mockRequest, mockResponse, () => {
    throw new Error('Next should not be called here');
  });
});

test('if a permission is specified, allows user with corresponding role', done => {
  ensureAccessTokenMock.mockImplementationOnce(() => Promise.resolve());
  const mockRequest = {
    originalUrl: '/',
    user: {
      roles: [Permissions.TOPOLOGY_READ],
    },
    isAuthenticated: jest.fn(() => true),
  };
  const mockResponse = {
    redirect: jest.fn(() => {
      throw new Error('we should not redirect');
    }),
  };

  access('TOPOLOGY_READ')(mockRequest, mockResponse, error => {
    expect(error).toBeFalsy();
    expect(mockResponse.redirect).not.toHaveBeenCalled();
    done();
  });
});

test('if no roles / permissions are specified, allows any authenticated user', done => {
  ensureAccessTokenMock.mockImplementationOnce(() => Promise.resolve());
  const mockRequest = {
    originalUrl: '/',
    isAuthenticated: jest.fn(() => true),
  };

  const mockResponse = {
    redirect: jest.fn(() => {
      throw new Error();
    }),
  };

  access()(mockRequest, mockResponse, error => {
    expect(error).toBeFalsy();
    expect(mockResponse.redirect).not.toHaveBeenCalled();
    done();
  });
});

test('allows open routes for unauthenticated users', () => {
  ensureAccessTokenMock.mockImplementationOnce(() => {
    throw new Error('Should not be called for open routes');
  });
  //test every open route
  return Promise.all(
    openRoutes.map(
      openRoute =>
        new Promise(res => {
          access()(
            {originalUrl: openRoute, user: null, isAuthenticated: () => false},
            {},
            res,
          );
        }),
    ),
  );
});

test('allows open routes for authenticated users', () => {
  ensureAccessTokenMock.mockImplementationOnce(() => {
    throw new Error('Should not be called for open routes');
  });
  //test every open route
  return Promise.all(
    openRoutes.map(
      openRoute =>
        new Promise(res => {
          access()(
            {originalUrl: openRoute, user: {}, isAuthenticated: () => true},
            {},
            res,
          );
        }),
    ),
  );
});
