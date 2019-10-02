/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 */

jest.mock('openid-client');

/**
 * these are mocked - if you import another object from here, make sure you
 * clear the mock calls
 */
import {TokenSet} from 'openid-client';
const Client = jest.genMockFromModule('openid-client/lib/client');
import User from '../User';
import ensureAccessToken from '../ensureAccessToken';
import {__TESTSONLY_setOidcClient, awaitClient} from '../oidc';
import {isExpectedError} from '../errors';
jest.mock('axios');
const axiosMock: any = require('axios');

jest.mock('../../config', () => ({
  KEYCLOAK_HOST: 'keycloak',
  KEYCLOAK_REALM: 'tgnms',
}));

const accessTokenParams = {
  resolveClient: awaitClient,
  resolveUserFromTokenSet: async () => User.fromTokenSet,
};

beforeEach(() => {
  TokenSet.mockClear();
  Client.mockClear();
  __TESTSONLY_setOidcClient(new Client());
});
test('rejects with error if there is no login session', () => {
  const mockRequest = {};
  ensureAccessToken(mockRequest, accessTokenParams).catch(error => {
    expect(error).toBeInstanceOf(Error);
  });
});

test('if tokenset is not expired, resolves with the token', () => {
  new TokenSet().expired.mockReturnValueOnce(false);
  const mockRequest = {
    header: jest.fn(() => 'Bearer faketoken'),
    session: {
      passport: {
        user: {},
      },
    },
  };
  return ensureAccessToken(mockRequest, accessTokenParams).then(tokenSet => {
    expect(tokenSet.expired).toHaveBeenCalled();
  });
});

test('if token set is expired, retrieves a new one using refresh token', () => {
  const clientMock = new Client();
  const refreshedTokenSet = new TokenSet();
  refreshedTokenSet.claims = getFakeUser();
  clientMock.refresh.mockResolvedValue(refreshedTokenSet);
  __TESTSONLY_setOidcClient(clientMock);

  const mockExpired = jest.fn(() => true);
  TokenSet
    // this is the tokenset initialized inside of ensureAccessToken
    .mockImplementationOnce(() => {
      return {
        expired: mockExpired,
      };
    });

  const mockRequest = {
    header: jest.fn(() => 'Bearer faketoken'),
    session: {
      passport: {
        user: {},
      },
    },
    logIn: jest.fn((user, done) => {
      done();
    }),
  };

  return ensureAccessToken(mockRequest, accessTokenParams).then(() => {
    expect(mockExpired).toHaveBeenCalled();
    expect(clientMock.refresh).toHaveBeenCalled();
    // passport's logIn function means that auth was successful
    expect(mockRequest.logIn).toHaveBeenCalled();
  });
});

test('if the refresh token is expired, returns an expected error', () => {
  const mockRequest = {
    header: jest.fn(() => 'Bearer faketoken'),
    session: {
      passport: {
        user: {},
      },
    },
    logIn: jest.fn(() => {
      throw new Error(); // shouldn't get here
    }),
  };

  return ensureAccessToken(mockRequest, accessTokenParams).catch(error => {
    expect(isExpectedError(error.name)).toBe(true);
    expect(mockRequest.logIn).not.toHaveBeenCalled();
  });
});

describe('Bearer token', () => {
  test('if no authorization header and no passport user, throws an error', () => {
    const mockRequest = {
      header: jest.fn(() => null),
      logIn: jest.fn(() => {
        throw new Error(); // shouldn't get here
      }),
    };
    return ensureAccessToken(mockRequest, accessTokenParams)
      .then(() => {
        throw new Error('should not get here');
      })
      .catch(_error => {
        expect(mockRequest.logIn).not.toHaveBeenCalled();
      });
  });

  test('if authorization header is present but malformed, throws an error', () => {
    const mockRequest = {
      header: jest.fn(() => 'test123'),
      logIn: jest.fn(() => {
        throw new Error(); // shouldn't get here
      }),
    };
    return ensureAccessToken(mockRequest, accessTokenParams)
      .then(() => {
        throw new Error('should not get here');
      })
      .catch(_error => {
        expect(mockRequest.logIn).not.toHaveBeenCalled();
      });
  });

  test('if authorization header is present and valid, invokes openid client validation methods', () => {
    const clientMock = new Client();
    __TESTSONLY_setOidcClient(clientMock);

    const tokenSet = TokenSet.mockImplementationOnce(() => {
      return {
        expired: () => false,
      };
    });
    clientMock.decryptIdToken.mockResolvedValue(tokenSet);
    clientMock.validateIdToken.mockResolvedValue(tokenSet);
    axiosMock.mockResolvedValue({
      data: getFakeUser(),
    });

    const mockRequest = {
      header: jest.fn(() => 'Bearer faketoken'),
      logIn: jest.fn((user, callback) => callback()),
    };
    return ensureAccessToken(mockRequest, accessTokenParams).then(() => {
      expect(mockRequest.logIn).toHaveBeenCalled();
    });
  });
});

function getFakeUser() {
  return {
    name: 'bob',
    preferred_username: '',
    given_name: '',
    family_name: '',
    email: '',
    jti: '',
    exp: '',
    nbf: '',
    iat: '',
    iss: '',
    aud: '',
    sub: '',
    typ: '',
    azp: '',
    auth_time: '',
    session_state: '',
    acr: '',
    email_verified: '',
  };
}
