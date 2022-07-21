/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow strict-local
 */

const defaultConfig = {
  LOGIN_ENABLED: true,
  KEYCLOAK_HOST: 'http://keycloak:8080',
  KEYCLOAK_REALM: 'test-realm',
  KEYCLOAK_CLIENT_ID: 'test',
  KEYCLOAK_CLIENT_SECRET: 'abc-123-456',
};

describe('initOidcClient', () => {
  test('issuerUrl can handle a host without a pathname', async () => {
    const {oidcClientMock, initOidcClient} = setupTest();
    await initOidcClient();
    expect(oidcClientMock).toHaveBeenCalledWith({
      issuerUrl: 'http://keycloak:8080/auth/realms/test-realm',
      clientId: 'test',
      clientSecret: 'abc-123-456',
    });
  });

  test('issuerUrl can handle a host with a pathname (no trailing slash)', async () => {
    const {oidcClientMock, initOidcClient} = setupTest({
      KEYCLOAK_HOST: 'http://keycloak:8080/test',
    });
    await initOidcClient();
    expect(oidcClientMock).toHaveBeenCalledWith({
      issuerUrl: 'http://keycloak:8080/test/auth/realms/test-realm',
      clientId: 'test',
      clientSecret: 'abc-123-456',
    });
  });

  test('issuerUrl can handle a host with a pathname (with trailing slash)', async () => {
    const {oidcClientMock, initOidcClient} = setupTest({
      KEYCLOAK_HOST: 'http://keycloak:8080/test/',
    });
    await initOidcClient();
    expect(oidcClientMock).toHaveBeenCalledWith({
      issuerUrl: 'http://keycloak:8080/test/auth/realms/test-realm',
      clientId: 'test',
      clientSecret: 'abc-123-456',
    });
  });
});

function setupTest(config = {}) {
  jest.resetModules();
  jest.doMock('../../config', () => ({...defaultConfig, ...config}));
  jest.doMock('../oidcClient', () => {
    return jest.fn().mockImplementation(_clientDef => {
      return Promise.resolve({});
    });
  });
  const oidcClientMock = require('../oidcClient');
  const {initOidcClient} = require('../oidc');
  return {
    oidcClientMock,
    initOidcClient,
  };
}
