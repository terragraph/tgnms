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

let _DEPRECATED_oidcclient: OpenidClient;
const clientAwaiter = makeClientAwaiter();
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
  }).then(client => {
    _DEPRECATED_oidcclient = client;
    clientAwaiter.resolveClient(client);
    return client;
  });
}

export function __TESTSONLY_getOidcClient() {
  return _DEPRECATED_oidcclient;
}

export async function awaitClient(): Promise<OpenidClient> {
  const client = await clientAwaiter.awaitClient();
  return client;
}

/**
 * Allows multiple functions to request the singleton instance of client without
 * making multiple discovery requests. Once the client has been resolved, this
 * notifies all requesters.
 **/
function makeClientAwaiter() {
  const awaiters = [];
  let cachedClient: OpenidClient;
  return {
    /**
     * wait for a singleton openid client instance to be resolved
     **/
    awaitClient: (): Promise<OpenidClient> => {
      if (cachedClient) {
        return Promise.resolve(cachedClient);
      }
      return new Promise(res => {
        awaiters.push(client => {
          res(client);
        });
      });
    },
    /**
     * Notifies functions waiting for an instance of openid client
     **/
    resolveClient: client => {
      cachedClient = client;
      awaiters.forEach(awaiter => {
        awaiter(client);
      });
    },
  };
}

export function __TESTSONLY_setOidcClient(client: OpenidClient) {
  clientAwaiter.resolveClient(client);
}
