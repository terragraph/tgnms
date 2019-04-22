/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import type {
  OpenidClient,
  TokenSet as OpenidTokenSet,
  OpenidUserInfoClaims,
} from '../oidcTypes';
const Client = jest.genMockFromModule('openid-client/lib/client');
const TokenSet = jest.genMockFromModule('openid-client/lib/token_set');
import PasswordGrantStrategy from '../PasswordGrantStrategy';

let client: OpenidClient;
let tokenSet: OpenidTokenSet;
beforeEach(() => {
  client = new Client();
  tokenSet = new TokenSet();
});

test('throws an error if missing params', () => {
  // $FlowFixMe - breaking flow on purpose here
  expect(() => new PasswordGrantStrategy()).toThrow();
  // $FlowFixMe
  expect(() => new PasswordGrantStrategy({})).toThrow();
  // $FlowFixMe
  expect(() => new PasswordGrantStrategy({client: client})).toThrow();
  // $FlowFixMe
  expect(() => new PasswordGrantStrategy({}, () => {})).toThrow();
  expect(
    () => new PasswordGrantStrategy({client: client}, () => {}),
  ).not.toThrow();
});

test('fails if username and password are not provided', () => {
  const verifyMock = jest.fn();
  const strategy = new PasswordGrantStrategy(
    {
      client,
    },
    verifyMock,
  );

  return runPassportStrategy(strategy, () => ({
    body: {},
  }))
    .then(result => {
      expect(verifyMock).not.toHaveBeenCalled();
      expect(strategy.success).not.toHaveBeenCalled();
      expect(strategy.fail).toHaveBeenCalled();
      expect(client.grant).not.toHaveBeenCalled();
      expect(result.message).toBeTruthy();
    })
    .catch(_err => {
      // catch shouldn't happen
      throw _err;
    });
});

test('invokes verify callback if successful', () => {
  client.grant.mockReturnValueOnce(Promise.resolve(tokenSet));
  client.decryptIdToken.mockReturnValueOnce(Promise.resolve(tokenSet));
  client.validateIdToken.mockReturnValueOnce(Promise.resolve(tokenSet));
  tokenSet.claims = fakeUserClaims();

  const verifyMock = jest.fn((req, token, claims, done) => {
    expect(claims.name).toBe('bob');
    done(undefined, claims);
  });

  const strategy = new PasswordGrantStrategy(
    {
      client,
    },
    verifyMock,
  );
  return runPassportStrategy(strategy, () => ({
    body: {
      username: 'alex',
      password: 'test',
    },
  })).then(_result => {
    expect(strategy.success).toHaveBeenCalled();
    expect(client.grant).toHaveBeenCalled();
    expect(client.decryptIdToken).toHaveBeenCalled();
    expect(client.validateIdToken).toHaveBeenCalled();
    expect(strategy.error).not.toHaveBeenCalled();
    expect(strategy.pass).not.toHaveBeenCalled();
    expect(strategy.fail).not.toHaveBeenCalled();
  });
});

test('fails with an error message if token validation fails', () => {
  client.grant.mockReturnValueOnce(Promise.resolve(tokenSet));
  client.decryptIdToken.mockReturnValueOnce(Promise.resolve(tokenSet));
  client.validateIdToken.mockReturnValueOnce(
    Promise.reject(
      // $FlowFixMe breaking flow on purpose
      Object.assign(new Error(), {
        name: 'OpenIdConnectError',
        error: 'invalid_grant',
      }),
    ),
  );
  const verifyMock = jest.fn(() => {
    throw new Error(); // we shouldn't get here
  });
  const strategy = new PasswordGrantStrategy(
    {
      client,
    },
    verifyMock,
  );

  return runPassportStrategy(strategy, () => ({
    body: {
      username: 'alex',
      password: 'test',
    },
  })).then(() => {
    expect(strategy.fail).toHaveBeenCalled();
    expect(strategy.success).not.toHaveBeenCalled();
  });
});

test('fails with an error message if a socket timeout error occurs', () => {
  client.grant.mockRejectedValueOnce(
    Object.assign(new Error('ESOCKETTIMEDOUT')),
  );
  const verifyMock = jest.fn(_args => {
    throw new Error(); // we shouldn't get here
  });
  const strategy = new PasswordGrantStrategy(
    {
      client,
    },
    verifyMock,
  );

  return runPassportStrategy(strategy, () => ({
    body: {
      username: 'alex',
      password: 'test',
    },
  })).catch(() => {
    expect(strategy.fail).toHaveBeenCalled();
    expect(strategy.success).not.toHaveBeenCalled();
  });
});

function runPassportStrategy(strategy, getMockRequest) {
  return new Promise((resolve, reject) => {
    strategy.success = jest.fn((...args) => resolve(...args));
    strategy.fail = jest.fn((...args) => resolve(...args));
    strategy.redirect = jest.fn((...args) => resolve(...args));
    strategy.pass = jest.fn((...args) => resolve(...args));
    strategy.error = jest.fn((...args) => reject(...args));

    strategy.authenticate(getMockRequest());
  });
}

function fakeUserClaims(): OpenidUserInfoClaims {
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
