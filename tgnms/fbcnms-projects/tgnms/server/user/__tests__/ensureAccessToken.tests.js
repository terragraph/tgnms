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
import {__TESTSONLY_setOidcClient, awaitClient} from '../oidc';
import ensureAccessToken from '../ensureAccessToken';
import {isExpectedError} from '../errors';
import User from '../User';

const accessTokenParams = {
  resolveClient: awaitClient,
  resolveUserFromTokenSet: async () => User.fromTokenSet,
};

beforeEach(() => {
  TokenSet.mockClear();
  Client.mockClear();
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
