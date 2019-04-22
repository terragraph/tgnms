/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

const {URL} = require('url');
const httpClient = require('./oidcHttpAgent');
import type {OpenidClient} from './oidcTypes';
import {Issuer as OpenidIssuer} from 'openid-client';
const {
  KEYCLOAK_HTTP_PROXY,
  KEYCLOAK_HOST,
  KEYCLOAK_REALM,
  KEYCLOAK_CLIENT_ID,
  KEYCLOAK_CLIENT_SECRET,
} = require('../config');
import getOidcClient from './oidcClient';

let openidClient: OpenidClient;
export function initOidcClient(): Promise<OpenidClient> {
  /**
   * https://www.npmjs.com/package/openid-client#proxy-settings
   * once we have a better story around lab proxying, we can replace this
   * with their default request instance
   */
  OpenidIssuer.defaultHttpOptions = {
    proxy: KEYCLOAK_HTTP_PROXY,
  };
  OpenidIssuer.httpClient = httpClient();

  if (!KEYCLOAK_HOST || !KEYCLOAK_REALM) {
    throw new Error(
      'missing required environment variable KEYCLOAK_HOST, KEYCLOAK_REALM ',
    );
  }

  const issuerUrl = new URL(KEYCLOAK_HOST);
  issuerUrl.pathname = `/auth/realms/${KEYCLOAK_REALM}`;

  return getOidcClient({
    issuerUrl: issuerUrl.toString(),
    clientId: KEYCLOAK_CLIENT_ID,
    clientSecret: KEYCLOAK_CLIENT_SECRET,
  }).then(client => (openidClient = client));
}

export function getClient() {
  return openidClient;
}

export function __TESTSONLY_setOidcClient(client: OpenidClient) {
  openidClient = client;
}
